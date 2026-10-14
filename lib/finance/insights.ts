// "Why am I losing money, and what do I do about it?" Plain-language findings
// drawn from the ledger, logs and tax summary. Each one is specific enough to act on.

import { categoryOf } from "./categories.ts";
import { computeTaxes, inYear, type TaxInput, type TaxSummary } from "./tax.ts";

export type Insight = {
  id: string;
  tone: "good" | "warn" | "risk" | "info";
  title: string;
  detail: string;
  /** A rough dollar figure the user can weigh it by. */
  impact?: number;
};

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export type MonthRow = { month: string; income: number; expenses: number; net: number };

export function monthlyPnl(input: TaxInput): MonthRow[] {
  const year = input.profile.taxYear;
  const rows: MonthRow[] = Array.from({ length: 12 }, (_, i) => ({ month: new Date(year, i, 1).toLocaleString("en-US", { month: "short" }), income: 0, expenses: 0, net: 0 }));
  for (const e of input.entries) {
    if (!inYear(e.date, year)) continue;
    const m = Number(e.date.slice(5, 7)) - 1;
    if (m < 0 || m > 11) continue;
    const c = categoryOf(e.category, input.profile.customCategories);
    if (c.kind === "income") rows[m].income += Number(e.amount) || 0;
    else if (c.kind === "expense") rows[m].expenses += Number(e.amount) || 0;
  }
  for (const r of rows) { r.income = Math.round(r.income); r.expenses = Math.round(r.expenses); r.net = r.income - r.expenses; }
  return rows;
}

export function expenseBreakdown(input: TaxInput): { id: string; label: string; amount: number }[] {
  const year = input.profile.taxYear;
  const map = new Map<string, { id: string; label: string; amount: number }>();
  for (const e of input.entries) {
    if (!inYear(e.date, year)) continue;
    const c = categoryOf(e.category, input.profile.customCategories);
    if (c.kind !== "expense") continue;
    const cur = map.get(c.id) ?? { id: c.id, label: c.label, amount: 0 };
    cur.amount += Number(e.amount) || 0;
    map.set(c.id, cur);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

/** Vendors charged in 3+ different months — the subscriptions that quietly add up. */
export function recurringVendors(input: TaxInput): { vendor: string; months: number; total: number; perMonth: number }[] {
  const year = input.profile.taxYear;
  const map = new Map<string, { months: Set<string>; total: number }>();
  for (const e of input.entries) {
    if (!inYear(e.date, year)) continue;
    const c = categoryOf(e.category, input.profile.customCategories);
    if (c.kind !== "expense") continue;
    const key = (e.vendor || e.description || "").toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 2).join(" ");
    if (!key) continue;
    const cur = map.get(key) ?? { months: new Set(), total: 0 };
    cur.months.add(e.date.slice(0, 7));
    cur.total += Number(e.amount) || 0;
    map.set(key, cur);
  }
  return [...map.entries()]
    .filter(([, v]) => v.months.size >= 3)
    .map(([vendor, v]) => ({ vendor, months: v.months.size, total: Math.round(v.total), perMonth: Math.round(v.total / v.months.size) }))
    .sort((a, b) => b.total - a.total);
}

export function buildInsights(input: TaxInput, s: TaxSummary): Insight[] {
  const out: Insight[] = [];
  const { profile } = input;
  const year = profile.taxYear;
  const entries = input.entries.filter((e) => inYear(e.date, year));
  const revenue = s.schedules.reduce((a, x) => a + x.grossReceipts + x.otherIncome, 0);
  const expenses = s.schedules.reduce((a, x) => a + x.totalExpenses, 0);
  const monthsWithData = new Set(entries.map((e) => e.date.slice(0, 7))).size || 1;

  // 1. The honest math on a loss.
  if (s.netProfit < 0) {
    const w2Only = computeTaxes(input, { excludeBusiness: true });
    const saved = (w2Only.federalBalance - s.federalBalance) + (w2Only.az.balance - s.az.balance);
    out.push({
      id: "loss-math", tone: "risk",
      title: `The business is down ${usd(-s.netProfit)} this year`,
      detail: `The loss lowers the tax on your W-2 pay by about ${usd(saved)} (federal + Arizona), so the real cost to you is about ${usd(-s.netProfit - saved)}. A tax loss is never a win — every $1 lost only gets back about ${Math.round((saved / -s.netProfit) * 100)}¢.`,
      impact: -s.netProfit - saved,
    });
  } else if (s.netProfit > 0) {
    out.push({ id: "profit", tone: "good", title: `Net profit ${usd(s.netProfit)}`, detail: `After self-employment tax (${usd(s.seTax)}) and the 20% QBI deduction (${usd(s.qbi.deduction)}), the business adds roughly ${usd(s.netProfit - s.seTax - s.netProfit * s.marginalRate)} to your pocket.` });
  }

  // 2. Break-even.
  const monthlyBurn = expenses / monthsWithData;
  const monthlyRevenue = revenue / monthsWithData;
  if (monthlyBurn > 0) {
    const gap = monthlyBurn - monthlyRevenue;
    out.push({
      id: "break-even", tone: gap > 0 ? "warn" : "good",
      title: gap > 0 ? `You need ${usd(gap)} more revenue a month to break even` : `Revenue covers costs by ${usd(-gap)} a month`,
      detail: `Average spend is ${usd(monthlyBurn)}/mo against ${usd(monthlyRevenue)}/mo coming in (${monthsWithData} month${monthsWithData === 1 ? "" : "s"} of data).`,
      impact: gap > 0 ? gap * 12 : undefined,
    });
  }

  // 3. Where the money goes.
  const top = expenseBreakdown(input).slice(0, 3);
  if (top.length && expenses > 0) {
    out.push({ id: "top-costs", tone: "info", title: `Top costs: ${top.map((t) => t.label).join(", ")}`, detail: top.map((t) => `${t.label} ${usd(t.amount)} (${Math.round((t.amount / expenses) * 100)}%)`).join(" · ") });
  }
  const subs = recurringVendors(input);
  const subsTotal = subs.reduce((a, x) => a + x.perMonth, 0);
  if (subs.length >= 3) {
    out.push({ id: "subscriptions", tone: "warn", title: `${subs.length} recurring charges ≈ ${usd(subsTotal)}/month`, detail: `Biggest: ${subs.slice(0, 5).map((x) => `${x.vendor} ${usd(x.perMonth)}/mo`).join(", ")}. Cancel what didn't earn money this quarter.`, impact: subsTotal * 12 });
  }

  // 4. Client concentration.
  const clients = new Map<string, number>();
  for (const e of entries) {
    const c = categoryOf(e.category, profile.customCategories);
    if (c.kind !== "income") continue;
    const k = (e.vendor || e.description || "Unknown").trim();
    clients.set(k, (clients.get(k) ?? 0) + (Number(e.amount) || 0));
  }
  const topClient = [...clients.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topClient && revenue > 0 && topClient[1] / revenue > 0.5) {
    out.push({ id: "concentration", tone: "warn", title: `${Math.round((topClient[1] / revenue) * 100)}% of revenue is one client`, detail: `${topClient[0]} brings in ${usd(topClient[1])}. Losing it would take the business to ${usd(s.netProfit - topClient[1])}. A second retainer is the biggest lever you have.` });
  }

  // 5. Time.
  const time = input.time.filter((t) => inYear(t.date, year));
  const hours = time.reduce((a, t) => a + (Number(t.hours) || 0), 0);
  const unbilled = time.filter((t) => !t.billed);
  const unbilledValue = unbilled.reduce((a, t) => a + (Number(t.hours) || 0) * (Number(t.rate) || 0), 0);
  if (hours > 0) {
    out.push({ id: "hourly", tone: revenue / hours < 50 ? "warn" : "info", title: `${usd(revenue / hours)} of revenue per hour logged`, detail: `${Math.round(hours)} hours logged against ${usd(revenue)} revenue (${usd(s.netProfit / hours)}/hr after costs). Log every hour — billed or not — for a true rate.` });
  }
  if (unbilledValue > 0) {
    out.push({ id: "unbilled", tone: "warn", title: `${usd(unbilledValue)} of time given away`, detail: `${Math.round(unbilled.reduce((a, t) => a + t.hours, 0))} unbilled hours. This isn't deductible — the IRS doesn't let you write off the value of your own time — but it's revenue you could be invoicing. Scope work, bill for change requests, or raise the retainer.`, impact: unbilledValue });
  }

  // 6. Hobby-loss rule (§183).
  const history = [...profile.priorYears.filter((p) => p.year < year).map((p) => ({ year: p.year, net: p.netProfit })), { year, net: s.netProfit }].sort((a, b) => b.year - a.year).slice(0, 5);
  const lossYears = history.filter((h) => h.net < 0).length;
  if (lossYears >= 3) {
    out.push({ id: "hobby", tone: "risk", title: `${lossYears} loss years out of the last ${history.length}`, detail: "The IRS presumes a profit motive when a business makes money in 3 of 5 years. Without that, losses can be challenged as a hobby (§183). Keep a written business plan, separate accounts, these books, and record changes you make to become profitable." });
  } else if (s.netProfit < 0 && profile.priorYears.length === 0) {
    out.push({ id: "hobby-info", tone: "info", title: "Add prior years to track the 3-of-5 profit test", detail: "Enter past Schedule C results on the Tax profile tab so the hobby-loss check is accurate." });
  }

  // 7. Records.
  const uncategorized = entries.filter((e) => e.category === "uncategorized").length;
  if (uncategorized) out.push({ id: "uncategorized", tone: "warn", title: `${uncategorized} transaction${uncategorized === 1 ? " needs" : "s need"} a category`, detail: "Uncategorized lines don't count on the return. Use “Categorize with AI” on the Ledger tab." });
  const needReceipt = entries.filter((e) => {
    const c = categoryOf(e.category, profile.customCategories);
    return c.kind === "expense" && (Number(e.amount) || 0) >= 75 && !e.receiptPath;
  }).length;
  if (needReceipt) out.push({ id: "receipts", tone: "info", title: `${needReceipt} expense${needReceipt === 1 ? "" : "s"} of $75+ without a receipt`, detail: "Receipts are required for lodging and for any expense of $75 or more. A bank line alone may not hold up in an audit." });

  // 8. Opportunities.
  if (!profile.homeOffice.enabled && s.netProfit > 0) {
    out.push({ id: "home-office", tone: "info", title: "Home office deduction isn't set up", detail: "If part of your home is used regularly and only for the business, the simplified method is $5/sq ft up to 300 sq ft (up to $1,500). Turn it on under Tax profile → Home." });
  }
  if (s.netProfit > 10000 && (profile.adjustments.retirementContrib || 0) === 0) {
    const room = Math.round(Math.min(s.netProfit * 0.9235 - s.seDeduction, 70000) * 0.2);
    out.push({ id: "retirement", tone: "good", title: `Up to ~${usd(room)} could go into a SEP-IRA`, detail: `A SEP-IRA or Solo 401(k) contribution comes off your income at your ${Math.round(s.marginalRate * 100)}% federal bracket plus 2.5% Arizona. A SEP can be opened and funded up to the filing deadline.`, impact: room * (s.marginalRate + 0.025) });
  }
  const balance = s.federalBalance + s.az.balance;
  if (s.federalBalance > 1000) {
    out.push({ id: "estimates", tone: "warn", title: `You may owe ${usd(s.federalBalance)} federal — with an underpayment penalty`, detail: "Owing $1,000+ at filing usually means a penalty. Raise your W-4 withholding (withholding counts as paid evenly through the year) or make quarterly estimates." });
  } else if (balance < -500) {
    out.push({ id: "refund", tone: "good", title: `Estimated refund ${usd(-balance)}`, detail: "You could lower withholding and keep that money working in the business instead." });
  }
  if (s.actc + s.eitc > 0) {
    out.push({ id: "refundable", tone: "info", title: `${usd(s.actc + s.eitc)} in refundable credits`, detail: `Additional child tax credit ${usd(s.actc)} + earned income credit ${usd(s.eitc)}. These depend on earned income, which the business result changes — a bigger loss lowers earned income too.` });
  }
  out.push({ id: "az-credits", tone: "info", title: "Arizona dollar-for-dollar credits", detail: "Donations to a Qualifying Charitable Organization, Qualifying Foster Care Organization, or a School Tuition Organization come straight off Arizona tax (not just a deduction). Check this year's limits on azdor.gov before giving." });

  return out;
}
