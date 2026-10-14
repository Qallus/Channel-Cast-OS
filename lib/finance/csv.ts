// Spreadsheet and statement import: parse CSV/TSV (Excel "Save as CSV", or a
// paste straight from a sheet), guess which columns are which, normalize
// dates and amounts, and pre-categorize with rules before anything reaches the AI.

import type { CategoryRule, FinEntry } from "./types.ts";

export function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/).slice(0, 5).join("\n");
  const counts = [",", "\t", ";", "|"].map((d) => ({ d, n: head.split(d).length }));
  return counts.sort((a, b) => b.n - a.n)[0].d;
}

/** RFC-4180-ish: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(field.trim()); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field.trim()); field = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export function parseAmount(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/\bCR\b/i.test(s)) { neg = true; s = s.replace(/\bCR\b/i, ""); }
  s = s.replace(/[$,\s]/g, "").replace(/USD/i, "");
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); }
  if (s.endsWith("-")) { neg = !neg; s = s.slice(0, -1); }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

/** Accepts 2026-03-04, 03/04/2026, 3/4/26, 04-Mar-2026, Mar 4, 2026. Returns ISO or null. */
export function parseDate(raw: string): string | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return iso(y, +m[1], +m[2]); }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return null;
}
const iso = (y: number, m: number, d: number) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null);

export type ColumnMap = { date: number; description: number; amount: number; debit: number; credit: number; category: number; vendor: number };

export function guessColumns(header: string[]): ColumnMap {
  const h = header.map((x) => x.toLowerCase());
  const find = (...keys: RegExp[]) => h.findIndex((c) => keys.some((k) => k.test(c)));
  return {
    date: find(/^date$/, /trans.*date/, /posted/, /^date/),
    description: find(/desc/, /memo/, /details/, /payee/, /name/, /narrative/),
    amount: find(/^amount$/, /amount/, /^total$/, /^value$/),
    debit: find(/debit/, /withdraw/, /charge/, /money out/, /^out$/),
    credit: find(/credit(?!.*card)/, /deposit/, /payment/, /money in/, /^in$/),
    category: find(/categor/, /^type$/),
    vendor: find(/merchant/, /vendor/, /supplier/),
  };
}

export type ParsedRow = { date: string; description: string; amount: number; vendor?: string; sourceCategory?: string; raw: string[] };

/**
 * `positiveIs`: on a credit-card export a positive number is usually a charge
 * (money out); on a bank export it's usually a deposit (money in). Returned
 * amounts are signed money-in (+) / money-out (−).
 */
export function mapRows(rows: string[][], map: ColumnMap, positiveIs: "out" | "in"): { rows: ParsedRow[]; skipped: number } {
  const out: ParsedRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    const date = map.date >= 0 ? parseDate(r[map.date]) : null;
    let amount: number | null = null;
    if (map.debit >= 0 || map.credit >= 0) {
      const debit = map.debit >= 0 ? parseAmount(r[map.debit]) : null;
      const credit = map.credit >= 0 ? parseAmount(r[map.credit]) : null;
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    }
    if (amount == null && map.amount >= 0) {
      const a = parseAmount(r[map.amount]);
      if (a != null) amount = positiveIs === "out" ? -a : a;
    }
    const description = map.description >= 0 ? r[map.description] : "";
    if (!date || amount == null || amount === 0) { skipped++; continue; }
    out.push({ date, description: description || "(no description)", amount, vendor: map.vendor >= 0 ? r[map.vendor] : undefined, sourceCategory: map.category >= 0 ? r[map.category] : undefined, raw: r });
  }
  return { rows: out, skipped };
}

/** Starter rules for common vendors. User rules on the profile run first. */
export const BUILTIN_RULES: { re: RegExp; category: string }[] = [
  { re: /payment.*thank|autopay|online payment|card payment|pymt/i, category: "xfer_card_payment" },
  { re: /transfer|xfer|zelle to self/i, category: "xfer_transfer" },
  { re: /interest charge|purchase interest|finance charge|interest on/i, category: "exp_interest_card" },
  { re: /annual fee|late fee|foreign transaction fee|stripe fee|square fee|paypal fee|wire fee|service charge/i, category: "exp_bank_fees" },
  { re: /adobe|figma|notion|slack|zoom|google \*?(gsuite|workspace)|microsoft|github|openai|anthropic|claude\.ai|chatgpt|canva|dropbox|1password|jetbrains|cursor/i, category: "exp_software" },
  { re: /aws|amazon web services|vercel|supabase|digitalocean|hetzner|hostinger|cloudflare|twilio|resend|netlify|heroku|coolify|godaddy|namecheap/i, category: "exp_hosting" },
  { re: /verizon|t-mobile|at&t|cox comm|comcast|xfinity|spectrum|google fi/i, category: "exp_phone_internet" },
  { re: /shell|chevron|exxon|circle k|qt |quiktrip|arco|valero|mobil|speedway|76 /i, category: "exp_vehicle" },
  { re: /parking|toll|parkmobile/i, category: "exp_parking" },
  { re: /delta|united air|american air|southwest|frontier|alaska air|marriott|hilton|hyatt|airbnb|expedia/i, category: "exp_travel" },
  { re: /uber eats|doordash|grubhub|restaurant|cafe|coffee|starbucks|dutch bros|chipotle|grill|pizza/i, category: "exp_meals" },
  { re: /facebook|meta ads|google ads|linkedin ads|yelp|nextdoor|vistaprint/i, category: "exp_advertising" },
  { re: /usps|ups |fedex|dhl|shipstation|pirate ship/i, category: "exp_shipping" },
  { re: /best buy|b&h|apple store|apple\.com|dell|micro center|newegg/i, category: "exp_equipment" },
  { re: /home depot|lowe'?s|staples|office depot/i, category: "exp_supplies" },
  { re: /upwork|fiverr|toptal|contractor/i, category: "exp_contract_labor" },
  { re: /arizona corp|azcc|secretary of state|license|azdor tpt/i, category: "exp_taxes_licenses" },
  { re: /cpa|accounting|legalzoom|attorney|law office|turbotax|h&r block/i, category: "exp_legal" },
  { re: /irs usataxpymt|eftps|irs.*payment/i, category: "pay_fed_estimate" },
  { re: /az dept of rev|azdor|arizona dept.*revenue/i, category: "pay_az_estimate" },
  { re: /mortgage|rocket mortgage|loancare|mr\.? cooper/i, category: "xfer_loan_principal" },
];

export function applyRules(description: string, rules: CategoryRule[]): { category: string; business?: string; businessUsePct?: number } {
  const d = description.toLowerCase();
  for (const r of rules) {
    if (r.match && d.includes(r.match.toLowerCase())) return { category: r.category, business: r.business, businessUsePct: r.businessUsePct };
  }
  for (const r of BUILTIN_RULES) if (r.re.test(description)) return { category: r.category };
  return { category: "uncategorized" };
}

export function importKey(date: string, amount: number, description: string): string {
  return `${date}|${Math.abs(amount).toFixed(2)}|${description.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)}`;
}

/** Turn parsed rows into ledger entries; rows already in the ledger (same key) are flagged. */
export function toEntries(
  rows: ParsedRow[],
  opts: { account?: string; business?: string; rules: CategoryRule[]; existingKeys: Set<string>; source: FinEntry["source"]; newId: () => string },
): (FinEntry & { duplicate: boolean; signed: number })[] {
  const now = new Date().toISOString();
  return rows.map((r) => {
    const key = importKey(r.date, r.amount, r.description);
    const hit = applyRules(`${r.description} ${r.vendor ?? ""}`, opts.rules);
    return {
      id: opts.newId(),
      date: r.date,
      description: r.description,
      amount: Math.abs(r.amount),
      direction: r.amount > 0 ? "in" : "out",
      category: hit.category,
      business: hit.business ?? opts.business,
      businessUsePct: hit.businessUsePct,
      account: opts.account,
      vendor: r.vendor,
      source: opts.source,
      importKey: key,
      createdAt: now,
      duplicate: opts.existingKeys.has(key),
      signed: r.amount,
    };
  });
}

export function toCsv(rows: (string | number | undefined | null)[][]): string {
  return rows.map((r) => r.map((c) => {
    const s = c == null ? "" : String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}
