// The printable "how to file" guide: every number from the workbook placed on
// the form and line it belongs to, in the order you'd enter them, followed by
// the documents checklist and the supporting ledger. Plain HTML so it prints
// (or saves as PDF) from any browser.

import { categoryOf, SCHEDULE_C_LINES } from "./categories.ts";
import { estimatedTaxPlan, inYear, type TaxInput, type TaxSummary } from "./tax.ts";
import { FILING_STATUS_LABEL } from "./tax-tables.ts";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const money = (n: number) => (n < 0 ? `(${Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD" })})` : n.toLocaleString("en-US", { style: "currency", currency: "USD" }));
const whole = (n: number) => Math.round(n).toLocaleString("en-US");

function row(line: string, label: string, amount: number | string, note = "") {
  return `<tr><td class="ln">${esc(line)}</td><td>${esc(label)}${note ? `<div class="note">${esc(note)}</div>` : ""}</td><td class="amt">${typeof amount === "number" ? money(amount) : esc(amount)}</td></tr>`;
}
const table = (rows: string, head = "") => `<table>${head}<tbody>${rows}</tbody></table>`;
const section = (n: number | string, title: string, body: string, intro = "") => `<section><h2><span class="num">${esc(n)}</span>${esc(title)}</h2>${intro ? `<p class="intro">${intro}</p>` : ""}${body}</section>`;

export function taxGuideHtml(input: TaxInput, s: TaxSummary, opts: { autoPrint?: boolean } = {}): string {
  const { profile } = input;
  const year = s.year;
  const plan = estimatedTaxPlan(s, year + 1);
  const entries = input.entries.filter((e) => inYear(e.date, year));
  const trips = input.trips.filter((t) => inYear(t.date, year)).sort((a, b) => a.date.localeCompare(b.date));
  const time = input.time.filter((t) => inYear(t.date, year));
  const owesFed = s.federalBalance > 0;
  const owesAz = s.az.balance > 0;
  const kids = s.dependents.filter((d) => d.credit === "ctc").length;
  const others = s.dependents.filter((d) => d.credit === "odc").length;
  const under17 = s.dependents.filter((d) => d.credit !== "none" && d.age != null && d.age < 17).length;
  const over17 = s.dependents.filter((d) => d.credit !== "none" && !(d.age != null && d.age < 17)).length;
  let step = 0;
  const next = () => ++step;

  const parts: string[] = [];

  // ── Cover / bottom line ────────────────────────────────────────────────
  parts.push(`
  <header>
    <div>
      <p class="eyebrow">Tax filing guide · ${year}</p>
      <h1>${esc(profile.taxpayer.name || "Tax organizer")}</h1>
      <p class="sub">${esc(FILING_STATUS_LABEL[s.filingStatus])} · Arizona resident · ${esc(profile.businesses.map((b) => b.name).join(", "))}</p>
    </div>
    <div class="gen">Prepared ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}<br/>from the Channel Cast Financing workbook</div>
  </header>
  <div class="bottom">
    <div><p>Federal</p><strong class="${owesFed ? "owe" : "refund"}">${owesFed ? "Owe" : "Refund"} ${money(Math.abs(s.federalBalance))}</strong></div>
    <div><p>Arizona</p><strong class="${owesAz ? "owe" : "refund"}">${owesAz ? "Owe" : "Refund"} ${money(Math.abs(s.az.balance))}</strong></div>
    <div><p>Business net</p><strong>${money(s.netProfit)}</strong></div>
    <div><p>AGI</p><strong>${money(s.agi)}</strong></div>
  </div>
  <p class="disclaimer">This is an organizer's estimate built from your records — not a filed return and not tax advice. Tax software or your preparer computes the final figures; use this to know what goes where and to check their numbers. Line numbers follow the current IRS and Arizona forms; if a line has moved, match it by its description.</p>`);

  // ── Filing order ───────────────────────────────────────────────────────
  const order = [
    "Gather the documents on the checklist at the end of this guide.",
    ...profile.businesses.map((b) => `Schedule C for ${b.name} — income and expenses below.`),
    profile.homeOffice.enabled ? `${profile.homeOffice.method === "simplified" ? "Simplified home office (Schedule C line 30)" : "Form 8829 — home office"}.` : "",
    entries.some((e) => e.category === "exp_equipment") ? "Form 4562 — Section 179 for the equipment listed." : "",
    s.seTax > 0 ? "Schedule SE — self-employment tax." : "",
    "Schedule 1 — business income and adjustments.",
    s.belowLine.length ? "Schedule 1-A — new deductions (overtime / car loan / charity)." : "",
    s.usesItemized ? "Schedule A — itemized deductions." : "Take the standard deduction.",
    s.qbi.deduction > 0 ? "Form 8995 — qualified business income deduction." : "",
    s.dependentCareCredit > 0 ? "Form 2441 — child and dependent care credit." : "",
    kids + others > 0 ? "Schedule 8812 — child tax credit and credit for other dependents." : "",
    s.eitc > 0 ? "Schedule EIC — earned income credit." : "",
    "Form 1040.",
    "Arizona Form 140 (it starts from your federal AGI).",
    owesFed || owesAz ? `Pay by April 15, ${year + 1}: IRS Direct Pay / EFTPS; AZTaxes.gov for Arizona. Filing an extension (Form 4868 / AZ 204) extends filing to October 15 but not payment.` : "E-file and choose direct deposit for the refund.",
  ].filter(Boolean);
  parts.push(section(next(), "Filing order", `<ol class="steps">${order.map((o) => `<li>${esc(o)}</li>`).join("")}</ol>`));

  // ── Household ──────────────────────────────────────────────────────────
  parts.push(section(next(), "Filing status & dependents", table(
    row("", "Filing status", FILING_STATUS_LABEL[s.filingStatus], s.filingStatus === "head_of_household" ? (s.hohQualified ? "Qualifies — you have a qualifying person who lived with you more than half the year, and you paid over half the cost of keeping up the home." : "Check: no dependent as entered qualifies you for head of household.") : "") +
    s.dependents.map((d) => row("", `${d.name}${d.age != null ? ` (age ${d.age} at year end)` : ""}`, d.credit === "ctc" ? `CTC ${money(d.federalAmount)}` : d.credit === "odc" ? `ODC ${money(d.federalAmount)}` : "Not claimed", d.reasons.join(" "))).join(""),
  ), "Enter each dependent's name, SSN, relationship and months lived with you on page 1 of Form 1040. Check the Child Tax Credit box for children under 17, the Credit for Other Dependents box for the rest."));

  // ── Income ─────────────────────────────────────────────────────────────
  if (profile.w2Jobs.length) {
    parts.push(section(next(), "W-2 wages", table(
      profile.w2Jobs.map((j) => row("", j.employer || "Employer", j.wages, `Box 2 federal withheld ${money(j.fedWithheld)} · Box 3 ${money(j.ssWages)} · Box 5 ${money(j.medicareWages)} · Box 16 AZ ${money(j.stateWages)} · Box 17 AZ withheld ${money(j.stateWithheld)}`)).join("") +
      row("1040 · 1a", "Total W-2 wages", s.w2Wages),
    ), "Enter each W-2 exactly as printed; software totals them."));
  }

  // ── Schedule C ─────────────────────────────────────────────────────────
  for (const c of s.schedules) {
    const biz = profile.businesses.find((b) => b.id === c.businessId);
    const lineMap = new Map(c.lines.map((l) => [l.line, l.amount]));
    const otherDetail = entries.filter((e) => (e.business || profile.businesses[0]?.id) === c.businessId && categoryOf(e.category, profile.customCategories).line === "C27a")
      .reduce((m, e) => { const lab = categoryOf(e.category, profile.customCategories).label; m.set(lab, (m.get(lab) ?? 0) + e.amount * ((e.businessUsePct ?? 100) / 100)); return m; }, new Map<string, number>());
    const partII = SCHEDULE_C_LINES.filter((l) => lineMap.get(l.line)).map((l) => row(l.line.replace("C", "Line "), l.label, lineMap.get(l.line)!, l.line === "C9" ? (c.vehicle.method === "standard" ? `${whole(c.vehicle.businessMiles)} business miles × ${(c.vehicle.rate * 100).toFixed(1)}¢, plus parking/tolls` : `Actual costs × ${(c.vehicle.businessPct * 100).toFixed(0)}% business use`) : l.line === "C24b" ? "Already reduced to 50%" : l.line === "C13" ? "Section 179 — list each item on Form 4562 Part I" : "")).join("");
    const other = [...otherDetail.entries()].map(([k, v]) => `<tr class="sub"><td></td><td>${esc(k)}</td><td class="amt">${money(v)}</td></tr>`).join("");
    parts.push(section(next(), `Schedule C — ${c.businessName}`, `
      <p class="meta">Line A: ${esc(biz?.activity || "—")} · Line B (NAICS): ${esc(biz?.naicsCode || "look up")} · Line F: ${esc(biz?.accountingMethod === "accrual" ? "Accrual" : "Cash")} · Line G: Yes, you materially participated · Line I/J: did you pay anyone $600+? If so, file 1099-NECs.</p>
      <h3>Part I — Income</h3>
      ${table(row("Line 1", "Gross receipts or sales", c.grossReceipts) + (c.returns ? row("Line 2", "Returns and allowances", c.returns) : "") + (c.cogs ? row("Line 4", "Cost of goods sold (Part III)", c.cogs) : "") + (c.otherIncome ? row("Line 6", "Other income", c.otherIncome) : "") + row("Line 7", "Gross income", c.grossIncome))}
      <h3>Part II — Expenses</h3>
      ${table((partII || row("", "No expenses recorded", 0)) + (other ? `<tr class="sub"><td></td><td colspan="2"><em>Line 27a / Part V detail — list each:</em></td></tr>${other}` : "") + row("Line 28", "Total expenses before home office", c.totalExpenses - c.homeOffice.amount) + (c.homeOffice.amount ? row("Line 30", c.homeOffice.method === "simplified" ? "Home office — simplified method" : "Home office — from Form 8829", c.homeOffice.amount, c.homeOffice.disallowed ? `${money(c.homeOffice.disallowed)} limited by income${c.homeOffice.method === "actual" ? " — carries forward" : ""}` : "") : "") + row("Line 31", c.netProfit < 0 ? "Net loss" : "Net profit", c.netProfit, c.netProfit < 0 ? "Line 32a: check “All investment is at risk”." : "Carries to Schedule 1 line 3 and Schedule SE line 2."))}
      ${c.vehicle.businessMiles > 0 ? `<h3>Part IV — Vehicle</h3>${table(row("Line 43", "Date placed in service", profile.vehicle.placedInService || "enter") + row("Line 44a", "Business miles", whole(c.vehicle.businessMiles)) + row("Line 44b", "Commuting miles", whole(profile.vehicle.commuteMiles ?? 0)) + row("Line 44c", "Other (personal) miles", whole(Math.max(0, (profile.vehicle.totalMiles || 0) - c.vehicle.businessMiles - (profile.vehicle.commuteMiles ?? 0)))) + row("Line 45–47b", "Personal use available? Another vehicle? Evidence? Written?", "Yes — mileage log attached"))}` : ""}
    `));
  }

  // ── Home office ────────────────────────────────────────────────────────
  const hoSched = s.schedules.find((x) => x.homeOffice.method !== "none");
  if (hoSched) {
    const ho = profile.homeOffice;
    parts.push(section(next(), hoSched.homeOffice.method === "simplified" ? "Home office — simplified method" : "Form 8829 — home office", table(
      row("", "Office area / home area", `${whole(ho.officeSqft)} / ${whole(ho.homeSqft)} sq ft`, ho.homeSqft ? `${((ho.officeSqft / ho.homeSqft) * 100).toFixed(2)}% business use` : "") +
      (hoSched.homeOffice.method === "actual" ? row("Line 10/11", "Mortgage interest & real estate taxes — business share", hoSched.homeOffice.mortgageInterestShare + hoSched.homeOffice.propertyTaxShare, "The rest of each goes on Schedule A if you itemize") + row("Line 42", "Depreciation of the home", "Your preparer computes this (basis × business %)") : row("", "Months used", String(ho.monthsUsed))) +
      row("", "Deduction", hoSched.homeOffice.amount),
    ), "The space must be used regularly and only for the business."));
  }

  // ── Equipment ──────────────────────────────────────────────────────────
  const equipment = entries.filter((e) => e.category === "exp_equipment");
  if (equipment.length) {
    parts.push(section(next(), "Form 4562 — Section 179 equipment", table(
      equipment.map((e) => row(e.date, e.description, e.amount * ((e.businessUsePct ?? 100) / 100), `Cost ${money(e.amount)} · ${e.businessUsePct ?? 100}% business use`)).join("") +
      row("Line 2 / 12", "Total elected", equipment.reduce((a, e) => a + e.amount * ((e.businessUsePct ?? 100) / 100), 0)),
    ), "Part I, line 6: describe each item and its business cost. Section 179 can't create a loss — any excess carries forward (line 13); your software applies this, or use bonus depreciation instead."));
  }

  // ── SE / Schedule 1 ────────────────────────────────────────────────────
  if (s.seTax > 0) {
    parts.push(section(next(), "Schedule SE — self-employment tax", table(
      row("Line 2", "Net profit from Schedule C", s.netProfit) + row("Line 4a", "× 92.35%", s.seNetEarnings) + row("Line 8a", "W-2 Social Security wages (reduces the 12.4% part)", profile.w2Jobs.reduce((a, j) => a + j.ssWages, 0)) +
      row("Line 12", "Self-employment tax → Schedule 2 line 4", s.seTax) + row("Line 13", "Deduction for half → Schedule 1 line 15", s.seDeduction),
    )));
  }
  parts.push(section(next(), "Schedule 1 — additional income & adjustments", table(
    row("Line 3", "Business income (loss)", s.netProfit) + (s.capitalGains ? row("1040 · 7", "Capital gain (loss)", s.capitalGains) : "") + (s.otherIncome ? row("Line 8z / 1040 2b", "Interest & other income", s.otherIncome) : "") +
    s.adjustments.map((a) => row("Part II", a.label, a.amount)).join("") +
    row("Line 26", "Total adjustments", s.adjustments.reduce((x, a) => x + a.amount, 0)),
  )));

  // ── Deductions ─────────────────────────────────────────────────────────
  parts.push(section(next(), s.usesItemized ? "Schedule A — itemized deductions" : "Deduction — standard", table(
    row("", "Standard deduction", s.standardDeduction) +
    row("Sch. A 5e", "State & local taxes (capped)", s.itemized.salt, "AZ withholding + estimates + property tax + vehicle license tax") +
    row("Sch. A 8a", "Home mortgage interest (personal share)", s.itemized.mortgageInterest) +
    row("Sch. A 11–14", "Charitable gifts", s.itemized.charity) +
    row("Sch. A 4", "Medical over 7.5% of AGI", s.itemized.medical) +
    row("Sch. A 17", "Total itemized", s.itemized.total) +
    row("1040 · 12", `Use the ${s.usesItemized ? "itemized" : "standard"} deduction`, s.deduction),
  )));
  if (s.belowLine.length) parts.push(section(next(), "Schedule 1-A — additional deductions", table(s.belowLine.map((b) => row("", b.label, b.amount)).join(""))));

  // ── 1040 ───────────────────────────────────────────────────────────────
  parts.push(section(next(), "Form 1040 — the return", table(
    row("1a", "W-2 wages", s.w2Wages) + row("8", "Additional income from Schedule 1", s.netProfit + s.otherIncome) + row("9", "Total income", s.w2Wages + s.netProfit + s.otherIncome + s.capitalGains) +
    row("10", "Adjustments from Schedule 1", s.adjustments.reduce((x, a) => x + a.amount, 0)) + row("11", "Adjusted gross income", s.agi) +
    row("12", "Standard or itemized deduction", s.deduction) + row("13", "Qualified business income deduction (Form 8995)", s.qbi.deduction, s.qbi.carryforward ? `QBI loss carryforward ${money(s.qbi.carryforward)}` : "") +
    (s.belowLine.length ? row("13b", "Schedule 1-A deductions", s.belowLine.reduce((x, b) => x + b.amount, 0)) : "") +
    row("15", "Taxable income", s.taxableIncome) + row("16", "Tax", s.incomeTax, `${Math.round(s.marginalRate * 100)}% top bracket`) +
    row("19", "Child tax credit + credit for other dependents (Sch. 8812)", s.ctcNonrefundable + s.odc, `${kids} × child, ${others} × other dependent`) +
    (s.dependentCareCredit ? row("20", "Child & dependent care credit (Form 2441 → Sch. 3)", s.dependentCareCredit) : "") +
    row("23", "Self-employment & other taxes (Schedule 2)", s.seTax + s.additionalMedicare) + row("24", "Total tax", s.totalTax) +
    row("25a", "Federal withholding from W-2s", s.federalWithheld) + row("26", "Estimated payments", s.federalEstimates) +
    row("27", "Earned income credit", s.eitc) + row("28", "Additional child tax credit (refundable)", s.actc) +
    row("33", "Total payments", s.federalPayments) +
    row(owesFed ? "37" : "34", owesFed ? "Amount you owe" : "Overpaid — refund", Math.abs(s.federalBalance)),
  )));

  // ── Arizona ────────────────────────────────────────────────────────────
  parts.push(section(next(), "Arizona Form 140", table(
    row("", "Federal adjusted gross income", s.az.agi) +
    row("", s.usesItemized ? "Itemized deductions" : "Standard deduction", s.az.deduction) +
    row("", "Arizona taxable income", s.az.taxable) + row("", "Tax at 2.5%", s.az.tax) +
    row("Boxes 10a/10b", "Dependent tax credit", s.az.dependentCredit, `${under17} under 17 × $100, ${over17} age 17+ × $25`) +
    (s.az.otherCredits ? row("", "Other Arizona credits (QCO / QFCO / STO)", s.az.otherCredits, "Attach Form 301 and the credit forms") : "") +
    row("", "Arizona tax after credits", s.az.liability) + row("", "Arizona withholding (W-2 box 17)", s.az.withheld) + row("", "Arizona estimated payments", s.az.estimates) +
    row("", s.az.balance > 0 ? "Amount owed" : "Refund", Math.abs(s.az.balance)),
  ), "Arizona starts from federal AGI. Report each dependent's name, SSN, relationship and months in your home."));

  // ── Next year ──────────────────────────────────────────────────────────
  parts.push(section(next(), `${year + 1} estimated payments`, table(
    plan.due.map((d) => row(d, "Federal (1040-ES) · Arizona (140ES)", `${money(plan.fedPerQuarter)} · ${money(plan.azPerQuarter)}`)).join(""),
  ), `Safe harbor: total federal payments of ${money(plan.safeHarbor)} (this year's tax${s.agi > 150000 ? " × 110%" : ""}) avoid an underpayment penalty, whatever the business earns. Raising W-4 withholding works as well.`));

  // ── Documents checklist ────────────────────────────────────────────────
  const docs = [
    `W-2s (${profile.w2Jobs.length || "each employer"})`, "1099-NEC / 1099-K / 1099-MISC from clients and payment processors (Stripe, Square, PayPal)",
    "1099-INT / 1099-B for interest and investments", "Form 1098 mortgage interest statement and the property tax bill",
    "Business credit card and bank statements for the year", "Receipts for every expense of $75+ and all lodging",
    "Mileage log (Appendix B)", "Equipment purchase receipts (Form 4562)", "Childcare provider name, address and EIN/SSN",
    "Each dependent's SSN and date of birth", "Health insurance forms (1095-A/B/C)", "Last year's AGI (for e-file signature) and any IRS IP PIN",
    "Records of estimated tax payments (IRS online account / AZTaxes)", "Arizona charitable / school tuition credit receipts",
  ];
  parts.push(section(next(), "Documents checklist", `<ul class="check">${docs.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>`));

  // ── Notes ──────────────────────────────────────────────────────────────
  const notes = [...s.notes, ...s.table.estimated.map((x) => `Estimated figure: ${x}`)];
  if (notes.length) parts.push(section(next(), "Notes & assumptions", `<ul>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`));

  // ── Appendix A: ledger by category ─────────────────────────────────────
  const byCat = new Map<string, typeof entries>();
  for (const e of entries) {
    const c = categoryOf(e.category, profile.customCategories);
    if (c.kind === "excluded") continue;
    const list = byCat.get(c.id) ?? [];
    list.push(e);
    byCat.set(c.id, list);
  }
  const cats = [...byCat.entries()].sort((a, b) => categoryOf(a[0]).line.localeCompare(categoryOf(b[0]).line, undefined, { numeric: true }));
  parts.push(`<section class="appendix"><h2><span class="num">A</span>Ledger by category</h2>${cats.map(([id, list]) => {
    const c = categoryOf(id, profile.customCategories);
    const total = list.reduce((a, e) => a + e.amount, 0);
    return `<h3>${esc(c.label)} <span class="muted">· ${esc(c.lineLabel)} · ${money(total)}</span></h3>${table(list.sort((a, b) => a.date.localeCompare(b.date)).map((e) => `<tr><td class="ln">${esc(e.date)}</td><td>${esc(e.description)}${e.vendor ? ` <span class="muted">· ${esc(e.vendor)}</span>` : ""}${(e.businessUsePct ?? 100) < 100 ? ` <span class="muted">· ${e.businessUsePct}% business</span>` : ""}${e.notes ? `<div class="note">${esc(e.notes)}</div>` : ""}${(e.custom ?? []).length ? `<div class="note">${(e.custom ?? []).map((x) => `${esc(x.label)}: ${esc(x.value)}`).join(" · ")}</div>` : ""}</td><td class="amt">${money(e.amount)}</td></tr>`).join(""))}`;
  }).join("") || "<p>No transactions.</p>"}</section>`);

  // ── Appendix B: mileage ────────────────────────────────────────────────
  if (trips.length) {
    parts.push(`<section class="appendix"><h2><span class="num">B</span>Mileage log</h2>${table(trips.map((t) => `<tr><td class="ln">${esc(t.date)}</td><td>${esc(t.from)} → ${esc(t.to)}<div class="note">${esc(t.purpose)}${t.roundTrip ? " · round trip" : ""}</div></td><td class="amt">${(t.miles * (t.roundTrip ? 2 : 1)).toFixed(1)} mi</td></tr>`).join("") + `<tr class="total"><td></td><td>Total business miles</td><td class="amt">${whole(trips.reduce((a, t) => a + t.miles * (t.roundTrip ? 2 : 1), 0))} mi</td></tr>`)}</section>`);
  }
  if (time.length) {
    const hrs = time.reduce((a, t) => a + t.hours, 0);
    const unb = time.filter((t) => !t.billed);
    parts.push(`<section class="appendix"><h2><span class="num">C</span>Time summary</h2><p class="intro">${hrs.toFixed(1)} hours logged; ${unb.reduce((a, t) => a + t.hours, 0).toFixed(1)} unbilled (${money(unb.reduce((a, t) => a + t.hours * t.rate, 0))} at your rates). Unbilled time is not deductible — shown for planning only.</p></section>`);
  }
  if (profile.custom.length) {
    parts.push(`<section class="appendix"><h2><span class="num">D</span>Other details</h2>${table(profile.custom.map((c) => `<tr><td class="ln"></td><td>${esc(c.label)}</td><td class="amt">${esc(c.value)}</td></tr>`).join(""))}</section>`);
  }

  return `<!doctype html><html><head><meta charset="utf-8"><title>${year} Tax Filing Guide</title><style>${CSS}</style>
${opts.autoPrint ? "<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>" : ""}</head><body><main>${parts.join("")}</main></body></html>`;
}

const CSS = `
@page{size:8.5in 11in;margin:0.55in}
*{box-sizing:border-box}
html,body{margin:0;background:#fff;color:#14241a;font:12px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
main{max-width:7.4in;margin:0 auto;padding:16px}
header{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #14241a;padding-bottom:10px}
.eyebrow{margin:0;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#5b6b5b}
h1{margin:2px 0;font-size:24px}
.sub{margin:0;color:#5b6b5b}
.gen{text-align:right;font-size:10px;color:#5b6b5b}
.bottom{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0 8px}
.bottom div{border:1px solid #dde5d3;border-radius:8px;padding:8px 10px}
.bottom p{margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#5b6b5b}
.bottom strong{font-size:16px}
.owe{color:#b42318}.refund{color:#2f7a3b}
.disclaimer{font-size:10px;color:#5b6b5b;border-left:3px solid #c7d2bd;padding-left:8px}
section{margin-top:18px;break-inside:auto}
h2{font-size:15px;margin:0 0 6px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #dde5d3;padding-bottom:4px;break-after:avoid}
h3{font-size:12px;margin:10px 0 4px;break-after:avoid}
.num{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:10px;background:#14241a;color:#fff;font-size:10px;padding:0 6px}
.intro,.meta{margin:0 0 6px;color:#3d4d3d}
.meta{font-size:11px}
table{width:100%;border-collapse:collapse}
td{padding:4px 6px;border-bottom:1px solid #eef2e9;vertical-align:top}
tr{break-inside:avoid}
td.ln{width:86px;color:#5b6b5b;white-space:nowrap;font-size:11px}
td.amt{width:150px;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
tr.sub td{border-bottom:none;padding-top:1px;padding-bottom:1px;font-size:11px;color:#3d4d3d}
tr.sub td.amt{font-weight:400}
tr.total td{border-top:1.5px solid #14241a;font-weight:700}
.note{font-size:10px;color:#5b6b5b}
.muted{color:#8a998a;font-weight:400}
ol.steps{margin:0;padding-left:20px}ol.steps li{margin:2px 0}
ul.check{list-style:none;padding:0;columns:2;margin:0}ul.check li{margin:2px 0;break-inside:avoid}ul.check li:before{content:"☐ ";}
.appendix{break-before:page}
.appendix h3{margin-top:12px}
@media print{main{padding:0;max-width:none}}
`;
