// Claude for the Financing workbook: read statements and receipts, categorize
// transactions, and a bookkeeping assistant that can read and write the books
// through tools. Server-only — the API key never reaches the browser.

import Anthropic from "@anthropic-ai/sdk";

import { allCategories } from "@/lib/finance/categories";
import { buildInsights } from "@/lib/finance/insights";
import { computeTaxes, estimatedTaxPlan, inYear } from "@/lib/finance/tax";
import { FILING_STATUS_LABEL } from "@/lib/finance/tax-tables";
import { newId, type FinEntry, type FinProfile, type MileageTrip, type TimeLog } from "@/lib/finance/types";
import { getProfile, loadWorkbook, upsertFinance } from "@/lib/server/finance-db";

export const FINANCE_MODEL = "claude-opus-5-5";

export class FinanceAiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export function financeAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!financeAiConfigured()) throw new FinanceAiError("AI isn't set up — add ANTHROPIC_API_KEY to the server environment.", 501);
  client ??= new Anthropic();
  return client;
}

type CreateParams = Omit<Anthropic.Beta.MessageCreateParamsNonStreaming, "model" | "betas" | "fallbacks">;

/**
 * One call with server-side refusal fallbacks on and streaming underneath
 * (statements can produce long outputs). Throws on a refusal instead of
 * returning an empty answer.
 */
async function ask(params: CreateParams): Promise<Anthropic.Beta.BetaMessage> {
  try {
    const msg = await anthropic().beta.messages.stream({
      ...params,
      model: FINANCE_MODEL,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    }).finalMessage();
    if (msg.stop_reason === "refusal") throw new FinanceAiError("The AI declined this request. Try rephrasing it.", 422);
    return msg;
  } catch (err) {
    if (err instanceof FinanceAiError) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new FinanceAiError("The Anthropic API key was rejected.", 502);
    if (err instanceof Anthropic.RateLimitError) throw new FinanceAiError("The AI is rate limited right now — try again in a minute.", 429);
    if (err instanceof Anthropic.APIError) throw new FinanceAiError(`AI request failed (${err.status ?? "network"}).`, 502);
    throw new FinanceAiError("Couldn't reach the AI service.", 502);
  }
}

const textOf = (m: Anthropic.Beta.BetaMessage) => m.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();

function categoryGuide(profile?: FinProfile): string {
  return allCategories(profile).map((c) => `${c.id} — ${c.label} [${c.kind}]${c.hint ? ` (${c.hint})` : ""}`).join("\n");
}

// ── Statement / receipt extraction ────────────────────────────────────────
export type ExtractedTxn = { date: string; description: string; amount: number; direction: "in" | "out"; vendor: string; category: string };
export type Extraction = {
  kind: "card_statement" | "bank_statement" | "receipt" | "invoice" | "loan_statement" | "tax_form" | "other";
  issuer: string;
  accountLast4: string;
  periodStart: string;
  periodEnd: string;
  interestCharged: number;
  feesCharged: number;
  transactions: ExtractedTxn[];
  notes: string;
};

export async function extractDocument(input: { mediaType: string; base64?: string; text?: string; fileName?: string }, profile: FinProfile): Promise<Extraction> {
  const ids = allCategories(profile).map((c) => c.id);
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["kind", "issuer", "accountLast4", "periodStart", "periodEnd", "interestCharged", "feesCharged", "transactions", "notes"],
    properties: {
      kind: { type: "string", enum: ["card_statement", "bank_statement", "receipt", "invoice", "loan_statement", "tax_form", "other"] },
      issuer: { type: "string" },
      accountLast4: { type: "string" },
      periodStart: { type: "string", description: "YYYY-MM-DD or empty" },
      periodEnd: { type: "string", description: "YYYY-MM-DD or empty" },
      interestCharged: { type: "number" },
      feesCharged: { type: "number" },
      transactions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["date", "description", "amount", "direction", "vendor", "category"],
          properties: {
            date: { type: "string", description: "YYYY-MM-DD" },
            description: { type: "string" },
            amount: { type: "number", description: "Positive number" },
            direction: { type: "string", enum: ["in", "out"] },
            vendor: { type: "string" },
            category: { type: "string", enum: ids },
          },
        },
      },
      notes: { type: "string", description: "Anything the bookkeeper should know: totals that didn't reconcile, unreadable rows, a 1098/W-2 figure, etc." },
    },
  };

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.text) content.push({ type: "text", text: `Document (${input.fileName || "pasted text"}):\n\n${input.text}` });
  else if (input.mediaType === "application/pdf") content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: input.base64! } });
  else content.push({ type: "image", source: { type: "base64", media_type: input.mediaType as "image/png", data: input.base64! } });
  content.push({
    type: "text",
    text:
      "Extract every transaction from this financial document for a small-business owner's books. " +
      "Use positive amounts with direction 'out' for charges/purchases/fees/interest and 'in' for payments received, refunds and deposits. " +
      "On a credit-card statement the card payment is direction 'in' with category xfer_card_payment. Interest charges are exp_interest_card. " +
      "Pick the best category from the list; use uncategorized if it's genuinely unclear. A receipt is usually one transaction. " +
      "For a Form 1098 put the mortgage interest and property tax as transactions dated the last day of the year.\n\n" +
      `Business: ${profile.businesses.map((b) => `${b.name} (${b.activity})`).join("; ")}.\n\nCategories:\n${categoryGuide(profile)}`,
  });

  const msg = await ask({
    max_tokens: 64000,
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    messages: [{ role: "user", content }],
  });
  try {
    return JSON.parse(textOf(msg)) as Extraction;
  } catch {
    throw new FinanceAiError("The AI's answer couldn't be read. Try again or import a CSV instead.");
  }
}

// ── Bulk categorization ───────────────────────────────────────────────────
export type CategorizeItem = { id: string; description: string; amount: number; direction: "in" | "out"; vendor?: string };
export type CategorizeResult = { id: string; category: string; businessUsePct: number; confidence: "high" | "medium" | "low"; reason: string };

export async function categorize(items: CategorizeItem[], profile: FinProfile): Promise<CategorizeResult[]> {
  const ids = allCategories(profile).map((c) => c.id);
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["results"],
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "category", "businessUsePct", "confidence", "reason"],
          properties: {
            id: { type: "string" },
            category: { type: "string", enum: ids },
            businessUsePct: { type: "number", description: "0-100; under 100 for mixed personal/business use such as a phone plan" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            reason: { type: "string", description: "Under 12 words" },
          },
        },
      },
    },
  };
  const rules = profile.rules.map((r) => `"${r.match}" → ${r.category}`).join("; ") || "none";
  const msg = await ask({
    max_tokens: 32000,
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system:
      `You categorize bank and card transactions for a sole proprietor's Schedule C. Businesses: ${profile.businesses.map((b) => `${b.name} — ${b.activity}`).join("; ")}. ` +
      `The owner also has W-2 income and files as ${FILING_STATUS_LABEL[profile.filingStatus]} in Arizona. ` +
      `Be conservative: personal spending is per_personal; transfers and card payments are xfer_*. Owner rules: ${rules}.\n\nCategories:\n${categoryGuide(profile)}`,
    messages: [{ role: "user", content: `Categorize these (direction 'out' = money spent):\n${JSON.stringify(items)}` }],
  });
  try {
    const parsed = JSON.parse(textOf(msg)) as { results: CategorizeResult[] };
    const known = new Set(items.map((i) => i.id));
    return parsed.results.filter((r) => known.has(r.id));
  } catch {
    throw new FinanceAiError("The AI's answer couldn't be read. Try a smaller batch.");
  }
}

// ── Bookkeeping assistant ─────────────────────────────────────────────────
const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_tax_summary",
    description: "Current-year P&L, Schedule C per business, federal + Arizona estimate, credits, refund/owed, and the profit insights. Call this before answering anything about totals, taxes, or profitability.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "search_entries",
    description: "Search ledger transactions for the selected tax year. Use to find items to recategorize or to answer 'how much did I spend on X'.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to match in description/vendor/notes" },
        category: { type: "string", description: "Category id filter" },
        month: { type: "string", description: "YYYY-MM" },
        uncategorized_only: { type: "boolean" },
        limit: { type: "number", description: "Default 50, max 200" },
      },
      required: [],
    },
  },
  {
    name: "add_entries",
    description: "Record income, expenses, tax payments or home costs in the ledger. Amounts are positive; the category says whether it's income or an expense.",
    input_schema: {
      type: "object",
      properties: {
        entries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD" },
              description: { type: "string" },
              amount: { type: "number" },
              category: { type: "string" },
              vendor: { type: "string" },
              account: { type: "string" },
              business_use_pct: { type: "number" },
              notes: { type: "string" },
            },
            required: ["date", "description", "amount", "category"],
          },
        },
      },
      required: ["entries"],
    },
  },
  {
    name: "update_entries",
    description: "Change category, business-use %, notes, description, amount or date on existing entries (ids from search_entries).",
    input_schema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" }, category: { type: "string" }, business_use_pct: { type: "number" },
              notes: { type: "string" }, description: { type: "string" }, amount: { type: "number" }, date: { type: "string" },
            },
            required: ["id"],
          },
        },
      },
      required: ["updates"],
    },
  },
  {
    name: "add_mileage",
    description: "Add business trips to the mileage log (date, from, to, purpose, miles).",
    input_schema: {
      type: "object",
      properties: {
        trips: {
          type: "array",
          items: {
            type: "object",
            properties: { date: { type: "string" }, from: { type: "string" }, to: { type: "string" }, purpose: { type: "string" }, miles: { type: "number" }, round_trip: { type: "boolean" } },
            required: ["date", "from", "to", "purpose", "miles"],
          },
        },
      },
      required: ["trips"],
    },
  },
  {
    name: "log_time",
    description: "Log hours worked. billed=false means the time was given away (tracked for insight; not deductible).",
    input_schema: {
      type: "object",
      properties: {
        logs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" }, client: { type: "string" }, description: { type: "string" }, hours: { type: "number" },
              rate: { type: "number" }, billed: { type: "boolean" }, category: { type: "string", enum: ["client", "rnd", "sales", "admin"] },
            },
            required: ["date", "client", "description", "hours", "rate", "billed"],
          },
        },
      },
      required: ["logs"],
    },
  },
  {
    name: "update_tax_profile",
    description: "Update the tax profile: add a W-2, an estimated payment, a prior-year result, an auto-categorization rule, or change adjustments (retirement, health insurance, HSA, childcare, capital gains…), home office or vehicle settings.",
    input_schema: {
      type: "object",
      properties: {
        add_w2: {
          type: "object",
          properties: {
            employer: { type: "string" }, wages: { type: "number" }, fed_withheld: { type: "number" }, ss_wages: { type: "number" },
            medicare_wages: { type: "number" }, state_wages: { type: "number" }, state_withheld: { type: "number" },
          },
          required: ["employer", "wages", "fed_withheld"],
        },
        add_estimated_payment: {
          type: "object",
          properties: { date: { type: "string" }, jurisdiction: { type: "string", enum: ["federal", "arizona"] }, amount: { type: "number" } },
          required: ["date", "jurisdiction", "amount"],
        },
        add_prior_year: { type: "object", properties: { year: { type: "number" }, net_profit: { type: "number" } }, required: ["year", "net_profit"] },
        add_rule: { type: "object", properties: { match: { type: "string" }, category: { type: "string" }, business_use_pct: { type: "number" } }, required: ["match", "category"] },
        adjustments: { type: "object", description: "Any of: retirementContrib, traditionalIra, seHealthInsurance, hsa, studentLoanInterest, carLoanInterest, otherIncome, capitalGains, childcareExpenses, priorYearFederalTax, priorYearAgi, arizonaCharitableCredit, arizonaPrivateSchoolCredit" },
        home_office: { type: "object", description: "Any of: enabled, method ('simplified'|'actual'), homeSqft, officeSqft, monthsUsed" },
        vehicle: { type: "object", description: "Any of: method ('standard'|'actual'), description, totalMiles" },
      },
      required: [],
    },
  },
  {
    name: "what_if",
    description: "Compare the tax and take-home result of a scenario against the current numbers: more revenue, more expenses, or a retirement contribution.",
    input_schema: {
      type: "object",
      properties: { extra_revenue: { type: "number" }, extra_expenses: { type: "number" }, extra_retirement: { type: "number" } },
      required: [],
    },
  },
];

const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const validDate = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(str(v));

async function runTool(name: string, input: Record<string, unknown>, ownerId: string, wrote: { changed: boolean }): Promise<unknown> {
  const wb = await loadWorkbook(ownerId);
  const { profile } = wb;
  const catIds = new Set(allCategories(profile).map((c) => c.id));

  if (name === "get_tax_summary") {
    const s = computeTaxes(wb);
    const plan = estimatedTaxPlan(s, profile.taxYear + 1);
    return {
      taxYear: s.year, filingStatus: FILING_STATUS_LABEL[s.filingStatus],
      businesses: s.schedules.map((x) => ({ name: x.businessName, grossReceipts: x.grossReceipts, totalExpenses: x.totalExpenses, netProfit: x.netProfit, lines: x.lines.map((l) => ({ line: l.label, amount: l.amount })), vehicle: x.vehicle, homeOffice: x.homeOffice })),
      w2Wages: s.w2Wages, agi: s.agi, deduction: { amount: s.deduction, itemized: s.usesItemized }, qbi: s.qbi, taxableIncome: s.taxableIncome,
      incomeTax: s.incomeTax, seTax: s.seTax, marginalRate: s.marginalRate, credits: { ctc: s.ctcNonrefundable, actc: s.actc, otherDependents: s.odc, dependentCare: s.dependentCareCredit, eitc: s.eitc },
      dependents: s.dependents.map((d) => ({ name: d.name, age: d.age, credit: d.credit, reasons: d.reasons })),
      federal: { totalTax: s.totalTax, payments: s.federalPayments, balanceOwed: s.federalBalance },
      arizona: s.az, nextYearEstimates: plan, notes: s.notes,
      insights: buildInsights(wb, s).map((i) => `${i.title} — ${i.detail}`),
      uncategorizedCount: wb.entries.filter((e) => inYear(e.date, profile.taxYear) && e.category === "uncategorized").length,
    };
  }

  if (name === "search_entries") {
    const q = str(input.query).toLowerCase();
    const limit = Math.min(200, Math.max(1, num(input.limit, 50)));
    const rows = wb.entries
      .filter((e) => inYear(e.date, profile.taxYear))
      .filter((e) => !input.uncategorized_only || e.category === "uncategorized")
      .filter((e) => !str(input.category) || e.category === str(input.category))
      .filter((e) => !str(input.month) || e.date.startsWith(str(input.month)))
      .filter((e) => !q || `${e.description} ${e.vendor ?? ""} ${e.notes ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));
    return {
      total: rows.length,
      sum: Math.round(rows.reduce((s, e) => s + e.amount, 0) * 100) / 100,
      entries: rows.slice(0, limit).map((e) => ({ id: e.id, date: e.date, description: e.description, amount: e.amount, category: e.category, vendor: e.vendor, businessUsePct: e.businessUsePct, account: e.account })),
    };
  }

  if (name === "add_entries") {
    const list = Array.isArray(input.entries) ? (input.entries as Record<string, unknown>[]) : [];
    const now = new Date().toISOString();
    const rejected: string[] = [];
    const records: FinEntry[] = [];
    for (const e of list.slice(0, 200)) {
      if (!validDate(e.date) || !(num(e.amount) > 0)) { rejected.push(`${str(e.description) || "?"}: needs a YYYY-MM-DD date and a positive amount`); continue; }
      const category = catIds.has(str(e.category)) ? str(e.category) : "uncategorized";
      records.push({
        id: newId("fe"), date: str(e.date), description: str(e.description) || "(no description)", amount: Math.round(num(e.amount) * 100) / 100,
        category, vendor: str(e.vendor) || undefined, account: str(e.account) || undefined, notes: str(e.notes) || undefined,
        businessUsePct: e.business_use_pct == null ? undefined : Math.min(100, Math.max(0, num(e.business_use_pct))),
        business: profile.businesses[0]?.id, source: "ai", createdAt: now,
      });
    }
    if (records.length) { await upsertFinance("fin_entries", ownerId, records); wrote.changed = true; }
    return { added: records.length, rejected };
  }

  if (name === "update_entries") {
    const updates = Array.isArray(input.updates) ? (input.updates as Record<string, unknown>[]) : [];
    const byId = new Map(wb.entries.map((e) => [e.id, e]));
    const changed: FinEntry[] = [];
    const missing: string[] = [];
    for (const u of updates.slice(0, 500)) {
      const cur = byId.get(str(u.id));
      if (!cur) { missing.push(str(u.id)); continue; }
      const next: FinEntry = { ...cur };
      if (u.category != null && catIds.has(str(u.category))) next.category = str(u.category);
      if (u.business_use_pct != null) next.businessUsePct = Math.min(100, Math.max(0, num(u.business_use_pct)));
      if (u.notes != null) next.notes = str(u.notes);
      if (u.description != null && str(u.description)) next.description = str(u.description);
      if (u.amount != null && num(u.amount) > 0) next.amount = num(u.amount);
      if (u.date != null && validDate(u.date)) next.date = str(u.date);
      changed.push(next);
    }
    if (changed.length) { await upsertFinance("fin_entries", ownerId, changed); wrote.changed = true; }
    return { updated: changed.length, missing };
  }

  if (name === "add_mileage") {
    const trips = Array.isArray(input.trips) ? (input.trips as Record<string, unknown>[]) : [];
    const now = new Date().toISOString();
    const records: MileageTrip[] = trips.filter((t) => validDate(t.date) && num(t.miles) > 0).slice(0, 200).map((t) => ({
      id: newId("trip"), date: str(t.date), from: str(t.from), to: str(t.to), purpose: str(t.purpose), miles: num(t.miles),
      roundTrip: Boolean(t.round_trip), business: profile.businesses[0]?.id, createdAt: now,
    }));
    if (records.length) { await upsertFinance("fin_trips", ownerId, records); wrote.changed = true; }
    return { added: records.length, skipped: trips.length - records.length };
  }

  if (name === "log_time") {
    const logs = Array.isArray(input.logs) ? (input.logs as Record<string, unknown>[]) : [];
    const now = new Date().toISOString();
    const records: TimeLog[] = logs.filter((t) => validDate(t.date) && num(t.hours) > 0).slice(0, 200).map((t) => ({
      id: newId("time"), date: str(t.date), client: str(t.client), description: str(t.description), hours: num(t.hours), rate: num(t.rate),
      billed: Boolean(t.billed), category: (["client", "rnd", "sales", "admin"].includes(str(t.category)) ? str(t.category) : "client") as TimeLog["category"],
      business: profile.businesses[0]?.id, createdAt: now,
    }));
    if (records.length) { await upsertFinance("fin_time", ownerId, records); wrote.changed = true; }
    return { added: records.length };
  }

  if (name === "update_tax_profile") {
    const p: FinProfile = await getProfile(ownerId);
    const done: string[] = [];
    const w2 = input.add_w2 as Record<string, unknown> | undefined;
    if (w2 && str(w2.employer)) {
      const wages = num(w2.wages);
      p.w2Jobs.push({
        id: newId("w2"), employer: str(w2.employer), wages, fedWithheld: num(w2.fed_withheld),
        ssWages: num(w2.ss_wages, wages), medicareWages: num(w2.medicare_wages, wages), stateWages: num(w2.state_wages, wages), stateWithheld: num(w2.state_withheld),
      });
      done.push(`W-2 from ${str(w2.employer)}`);
    }
    const est = input.add_estimated_payment as Record<string, unknown> | undefined;
    if (est && validDate(est.date) && num(est.amount) > 0) {
      p.estimatedPayments.push({ id: newId("est"), date: str(est.date), jurisdiction: str(est.jurisdiction) === "arizona" ? "arizona" : "federal", amount: num(est.amount) });
      done.push("estimated payment");
    }
    const prior = input.add_prior_year as Record<string, unknown> | undefined;
    if (prior && num(prior.year) > 2000) {
      p.priorYears = [...p.priorYears.filter((x) => x.year !== num(prior.year)), { id: newId("py"), year: num(prior.year), netProfit: num(prior.net_profit) }];
      done.push(`${num(prior.year)} result`);
    }
    const rule = input.add_rule as Record<string, unknown> | undefined;
    if (rule && str(rule.match) && catIds.has(str(rule.category))) {
      p.rules.push({ id: newId("rule"), match: str(rule.match), category: str(rule.category), businessUsePct: rule.business_use_pct == null ? undefined : num(rule.business_use_pct) });
      done.push(`rule "${str(rule.match)}"`);
    }
    const adj = input.adjustments as Record<string, unknown> | undefined;
    if (adj) for (const [k, v] of Object.entries(adj)) if (k in p.adjustments && Number.isFinite(Number(v))) { (p.adjustments as Record<string, number>)[k] = Number(v); done.push(k); }
    const ho = input.home_office as Record<string, unknown> | undefined;
    if (ho) {
      if (typeof ho.enabled === "boolean") p.homeOffice.enabled = ho.enabled;
      if (ho.method === "simplified" || ho.method === "actual") p.homeOffice.method = ho.method;
      for (const k of ["homeSqft", "officeSqft", "monthsUsed"] as const) if (ho[k] != null) p.homeOffice[k] = num(ho[k]);
      done.push("home office");
    }
    const v = input.vehicle as Record<string, unknown> | undefined;
    if (v) {
      if (v.method === "standard" || v.method === "actual") p.vehicle.method = v.method;
      if (v.description != null) p.vehicle.description = str(v.description);
      if (v.totalMiles != null) p.vehicle.totalMiles = num(v.totalMiles);
      done.push("vehicle");
    }
    if (done.length) { p.updatedAt = new Date().toISOString(); await upsertFinance("fin_profile", ownerId, [p as unknown as { id: string }]); wrote.changed = true; }
    return { updated: done };
  }

  if (name === "what_if") {
    const base = computeTaxes(wb);
    const alt = computeTaxes(wb, { extraRevenue: num(input.extra_revenue), extraExpenses: num(input.extra_expenses), extraRetirement: num(input.extra_retirement) });
    const out = (s: typeof base) => ({ netProfit: s.netProfit, totalFederalTax: s.totalTax, federalOwed: s.federalBalance, arizonaOwed: s.az.balance, seTax: s.seTax, qbiDeduction: s.qbi.deduction });
    const takeHome = (s: typeof base) => s.netProfit + s.w2Wages - s.totalTax - s.az.liability + s.actc + s.eitc;
    return { current: out(base), scenario: out(alt), changeInTotalTax: Math.round((alt.totalTax + alt.az.liability - alt.actc - alt.eitc - (base.totalTax + base.az.liability - base.actc - base.eitc)) * 100) / 100, changeInTakeHome: Math.round((takeHome(alt) - takeHome(base)) * 100) / 100 };
  }

  return { error: `Unknown tool ${name}` };
}

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ToolTrace = { name: string; summary: string };

export async function runAssistant(history: ChatTurn[], ownerId: string): Promise<{ reply: string; changed: boolean; tools: ToolTrace[] }> {
  const profile = await getProfile(ownerId);
  const system =
    "You are the bookkeeping and tax-prep assistant inside the owner's Channel Cast dashboard (Billing → Accounting). " +
    "The owner runs a small business as a sole proprietor / single-member LLC alongside a W-2 job, lives in Arizona, " +
    `files as ${FILING_STATUS_LABEL[profile.filingStatus].toLowerCase()} with ${profile.dependents.length} dependent(s) (${profile.dependents.map((d) => d.relationship).join(", ")}), and wants two things: accurate books for filing, and to turn the business profitable.\n\n` +
    "How to work:\n" +
    "- Use the tools for anything about their numbers; never invent figures. Call get_tax_summary before discussing totals, taxes or profit.\n" +
    "- When they tell you about a purchase, payment, trip or hours, record it with the right tool, then say exactly what you recorded.\n" +
    "- Pick categories from the list below. Meals are 50% deductible; mixed-use items get a business-use %.\n" +
    "- Be direct about money: if the business is losing money, say so and suggest concrete moves (pricing, retainers, cutting recurring costs, billing for unbilled time).\n" +
    "- Explain tax rules in plain words with the form and line. You are not a CPA or attorney; flag anything aggressive or uncertain for their preparer, and never suggest hiding income or inventing expenses.\n" +
    "- Keep replies short and skimmable.\n\n" +
    `Selected tax year: ${profile.taxYear}. Today: ${new Date().toISOString().slice(0, 10)}.\n\nCategories:\n${categoryGuide(profile)}`;

  const messages: Anthropic.Beta.BetaMessageParam[] = history
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .slice(-30)
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.slice(0, 12000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") throw new FinanceAiError("Ask a question first.", 400);

  const wrote = { changed: false };
  const tools: ToolTrace[] = [];
  for (let hop = 0; hop < 8; hop++) {
    const res = await ask({
      max_tokens: 16000,
      output_config: { effort: "medium" },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
    });
    if (res.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: res.content }); continue; }
    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !uses.length) return { reply: textOf(res) || "Done.", changed: wrote.changed, tools };

    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const u of uses) {
      try {
        const out = await runTool(u.name, (u.input ?? {}) as Record<string, unknown>, ownerId, wrote);
        tools.push({ name: u.name, summary: summarize(u.name, out) });
        results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out) });
      } catch (err) {
        results.push({ type: "tool_result", tool_use_id: u.id, content: `Error: ${(err as Error).message}`, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return { reply: "I ran out of steps on that one — try asking for one piece at a time.", changed: wrote.changed, tools };
}

function summarize(name: string, out: unknown): string {
  const o = (out ?? {}) as Record<string, unknown>;
  switch (name) {
    case "add_entries": return `Added ${o.added ?? 0} ledger entr${o.added === 1 ? "y" : "ies"}`;
    case "update_entries": return `Updated ${o.updated ?? 0} entr${o.updated === 1 ? "y" : "ies"}`;
    case "add_mileage": return `Logged ${o.added ?? 0} trip(s)`;
    case "log_time": return `Logged ${o.added ?? 0} time entr${o.added === 1 ? "y" : "ies"}`;
    case "update_tax_profile": return `Updated profile: ${((o.updated as string[]) ?? []).join(", ") || "nothing"}`;
    case "search_entries": return `Searched the ledger (${o.total ?? 0} matches)`;
    case "what_if": return "Ran a what-if scenario";
    case "get_tax_summary": return "Read the tax summary";
    default: return name;
  }
}
