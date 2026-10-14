// Every ledger category maps to the line of the form it ends up on, so the
// printed guide can say "enter $X on Schedule C line 18" rather than just a total.

import type { CustomCategory, FinProfile } from "./types.ts";

export type CategoryKind = "income" | "expense" | "personal" | "payment" | "excluded";

export type CategoryDef = {
  id: string;
  label: string;
  kind: CategoryKind;
  /** Where it lands: "C1" = Schedule C line 1, "A" = Schedule A, "8829" = home-office, etc. */
  line: string;
  lineLabel: string;
  hint?: string;
  /** Share of the amount that is deductible (meals are 50%). */
  deductiblePct?: number;
  /** Also counts toward the actual-expense home office (Form 8829) pool. */
  homeExpense?: boolean;
  /** Counts toward actual vehicle expenses (only used when the vehicle uses the actual method). */
  vehicleExpense?: boolean;
};

export const CATEGORIES: CategoryDef[] = [
  // ── Business income (Schedule C Part I) ────────────────────────────────
  { id: "inc_services", label: "Services revenue", kind: "income", line: "C1", lineLabel: "Sch. C line 1 — Gross receipts", hint: "Client work, retainers, consulting, invoices paid" },
  { id: "inc_products", label: "Product sales", kind: "income", line: "C1", lineLabel: "Sch. C line 1 — Gross receipts", hint: "Devices, hardware, merch" },
  { id: "inc_subscriptions", label: "Subscription revenue", kind: "income", line: "C1", lineLabel: "Sch. C line 1 — Gross receipts", hint: "Recurring SaaS / advertiser plans" },
  { id: "inc_other_business", label: "Other business income", kind: "income", line: "C6", lineLabel: "Sch. C line 6 — Other income", hint: "Credit-card rewards on business spend, refunds of deducted items" },
  { id: "inc_returns", label: "Refunds given to customers", kind: "expense", line: "C2", lineLabel: "Sch. C line 2 — Returns & allowances" },
  { id: "cogs", label: "Cost of goods sold", kind: "expense", line: "C4", lineLabel: "Sch. C line 4 / Part III — COGS", hint: "Inventory and parts for products you sell" },

  // ── Business expenses (Schedule C Part II) ─────────────────────────────
  { id: "exp_advertising", label: "Advertising & marketing", kind: "expense", line: "C8", lineLabel: "Sch. C line 8 — Advertising" },
  { id: "exp_vehicle", label: "Vehicle (actual costs)", kind: "expense", line: "C9", lineLabel: "Sch. C line 9 — Car & truck", hint: "Gas, repairs, insurance — only used with the actual-expense method", vehicleExpense: true },
  { id: "exp_parking", label: "Parking & tolls", kind: "expense", line: "C9", lineLabel: "Sch. C line 9 — Car & truck", hint: "Deductible on top of the standard mileage rate" },
  { id: "exp_commissions", label: "Commissions & fees", kind: "expense", line: "C10", lineLabel: "Sch. C line 10 — Commissions & fees" },
  { id: "exp_contract_labor", label: "Contract labor", kind: "expense", line: "C11", lineLabel: "Sch. C line 11 — Contract labor", hint: "Freelancers — anyone paid $600+ needs a 1099-NEC" },
  { id: "exp_equipment", label: "Equipment (Section 179)", kind: "expense", line: "C13", lineLabel: "Sch. C line 13 — Depreciation / §179 (Form 4562)", hint: "Computers, cameras, devices, furniture — expensed in full this year" },
  { id: "exp_insurance", label: "Business insurance", kind: "expense", line: "C15", lineLabel: "Sch. C line 15 — Insurance (not health)" },
  { id: "exp_interest_card", label: "Interest — business credit card", kind: "expense", line: "C16b", lineLabel: "Sch. C line 16b — Interest (other)" },
  { id: "exp_interest_loan", label: "Interest — business loan / LOC", kind: "expense", line: "C16b", lineLabel: "Sch. C line 16b — Interest (other)" },
  { id: "exp_legal", label: "Legal & professional", kind: "expense", line: "C17", lineLabel: "Sch. C line 17 — Legal & professional", hint: "CPA, attorney, tax prep, registered agent" },
  { id: "exp_office", label: "Office expense", kind: "expense", line: "C18", lineLabel: "Sch. C line 18 — Office expense", hint: "Postage, printing, small office items" },
  { id: "exp_rent_equipment", label: "Rent — equipment", kind: "expense", line: "C20a", lineLabel: "Sch. C line 20a — Rent: vehicles, machinery, equipment" },
  { id: "exp_rent_space", label: "Rent — office / space", kind: "expense", line: "C20b", lineLabel: "Sch. C line 20b — Rent: other business property", hint: "Coworking, storage, placement fees for devices" },
  { id: "exp_repairs", label: "Repairs & maintenance", kind: "expense", line: "C21", lineLabel: "Sch. C line 21 — Repairs & maintenance" },
  { id: "exp_supplies", label: "Supplies", kind: "expense", line: "C22", lineLabel: "Sch. C line 22 — Supplies", hint: "Cables, mounts, small parts used up in the work" },
  { id: "exp_taxes_licenses", label: "Taxes & licenses", kind: "expense", line: "C23", lineLabel: "Sch. C line 23 — Taxes & licenses", hint: "AZ TPT, LLC annual fee, business licenses (not income tax)" },
  { id: "exp_travel", label: "Travel", kind: "expense", line: "C24a", lineLabel: "Sch. C line 24a — Travel", hint: "Airfare, hotels, rideshare on overnight business trips" },
  { id: "exp_meals", label: "Business meals (50%)", kind: "expense", line: "C24b", lineLabel: "Sch. C line 24b — Deductible meals (50%)", deductiblePct: 50, hint: "Record who you met and why" },
  { id: "exp_utilities", label: "Utilities (business)", kind: "expense", line: "C25", lineLabel: "Sch. C line 25 — Utilities" },
  { id: "exp_phone_internet", label: "Phone & internet", kind: "expense", line: "C25", lineLabel: "Sch. C line 25 — Utilities", hint: "Set business-use % on mixed lines" },
  { id: "exp_software", label: "Software & subscriptions", kind: "expense", line: "C27a", lineLabel: "Sch. C line 27a — Other expenses", hint: "SaaS, hosting, APIs, domains, AI tools" },
  { id: "exp_hosting", label: "Cloud hosting & infrastructure", kind: "expense", line: "C27a", lineLabel: "Sch. C line 27a — Other expenses", hint: "Supabase, Vercel, Coolify server, Twilio" },
  { id: "exp_rnd", label: "Research & development (§174A)", kind: "expense", line: "C27a", lineLabel: "Sch. C line 27a — R&E (domestic §174A, expensed)", hint: "Prototyping, testing, dev contractors, materials for new products" },
  { id: "exp_bank_fees", label: "Bank & merchant fees", kind: "expense", line: "C27a", lineLabel: "Sch. C line 27a — Other expenses", hint: "Stripe/Square fees, wire fees" },
  { id: "exp_education", label: "Education & training", kind: "expense", line: "C27a", lineLabel: "Sch. C line 27a — Other expenses" },
  { id: "exp_shipping", label: "Shipping & freight", kind: "expense", line: "C27a", lineLabel: "Sch. C line 27a — Other expenses" },
  { id: "exp_dues", label: "Dues & memberships", kind: "expense", line: "C27a", lineLabel: "Sch. C line 27a — Other expenses" },
  { id: "exp_gifts", label: "Business gifts ($25/person)", kind: "expense", line: "C27a", lineLabel: "Sch. C line 27a — Other expenses" },
  { id: "exp_bad_debt", label: "Bad debt (accrual only)", kind: "expense", line: "C27a", lineLabel: "Sch. C line 27a — Other expenses", hint: "Only for income you already reported. Unpaid work on cash basis isn't deductible." },
  { id: "exp_other", label: "Other business expense", kind: "expense", line: "C27a", lineLabel: "Sch. C line 27a — Other expenses" },

  // ── Home (split between Form 8829 and Schedule A) ──────────────────────
  { id: "home_mortgage_interest", label: "Mortgage interest (Form 1098)", kind: "personal", line: "A8", lineLabel: "Sch. A line 8a / Form 8829", homeExpense: true },
  { id: "home_property_tax", label: "Property tax", kind: "personal", line: "A5b", lineLabel: "Sch. A line 5b / Form 8829", homeExpense: true },
  { id: "home_insurance", label: "Homeowners insurance", kind: "personal", line: "8829", lineLabel: "Form 8829 (office share only)", homeExpense: true },
  { id: "home_utilities", label: "Home utilities", kind: "personal", line: "8829", lineLabel: "Form 8829 (office share only)", homeExpense: true },
  { id: "home_repairs", label: "Home repairs", kind: "personal", line: "8829", lineLabel: "Form 8829 (office share only)", homeExpense: true },
  { id: "home_hoa", label: "HOA dues", kind: "personal", line: "8829", lineLabel: "Form 8829 (office share only)", homeExpense: true },
  { id: "home_rent", label: "Rent (if renting your home)", kind: "personal", line: "8829", lineLabel: "Form 8829 (office share only)", homeExpense: true },

  // ── Personal deductions & credits ──────────────────────────────────────
  { id: "per_charity", label: "Charitable donations", kind: "personal", line: "A11", lineLabel: "Sch. A line 11–12" },
  { id: "per_medical", label: "Medical & dental", kind: "personal", line: "A1", lineLabel: "Sch. A line 1 (over 7.5% of AGI)" },
  { id: "per_childcare", label: "Childcare / daycare", kind: "personal", line: "2441", lineLabel: "Form 2441 — Child & dependent care" },
  { id: "per_state_tax", label: "State income tax paid (prior year balance)", kind: "personal", line: "A5a", lineLabel: "Sch. A line 5a" },
  { id: "per_vehicle_tax", label: "Vehicle license tax (VLT)", kind: "personal", line: "A5c", lineLabel: "Sch. A line 5c — personal property tax", hint: "AZ registration's VLT portion is deductible" },
  { id: "per_personal", label: "Personal (not deductible)", kind: "excluded", line: "—", lineLabel: "Not on the return" },

  // ── Tax payments ───────────────────────────────────────────────────────
  { id: "pay_fed_estimate", label: "Federal estimated tax payment", kind: "payment", line: "1040-26", lineLabel: "Form 1040 line 26" },
  { id: "pay_az_estimate", label: "Arizona estimated tax payment", kind: "payment", line: "AZ140-59", lineLabel: "AZ Form 140 — estimated payments" },

  // ── Money that moves but isn't income or expense ───────────────────────
  { id: "xfer_transfer", label: "Transfer between accounts", kind: "excluded", line: "—", lineLabel: "Not on the return" },
  { id: "xfer_card_payment", label: "Credit card payment", kind: "excluded", line: "—", lineLabel: "Not on the return", hint: "The purchases are the expense, not the payment" },
  { id: "xfer_owner_draw", label: "Owner draw", kind: "excluded", line: "—", lineLabel: "Not on the return" },
  { id: "xfer_owner_contribution", label: "Owner contribution / loan to business", kind: "excluded", line: "—", lineLabel: "Not on the return" },
  { id: "xfer_loan_principal", label: "Loan principal", kind: "excluded", line: "—", lineLabel: "Not on the return", hint: "Only the interest part is deductible" },
  { id: "uncategorized", label: "Uncategorized", kind: "excluded", line: "—", lineLabel: "Needs a category" },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Resolve a category, including the custom ones defined on the profile. */
export function categoryOf(id: string, custom: CustomCategory[] = []): CategoryDef {
  const hit = BY_ID.get(id);
  if (hit) return hit;
  const c = custom.find((x) => x.id === id);
  if (c) {
    const kind: CategoryKind = c.kind === "income" ? "income" : c.kind === "expense" ? "expense" : "personal";
    return { id: c.id, label: c.label, kind, line: kind === "income" ? "C6" : kind === "expense" ? "C27a" : "—", lineLabel: c.line || (kind === "expense" ? "Sch. C line 27a — Other expenses" : kind === "income" ? "Sch. C line 6 — Other income" : "Personal") };
  }
  return BY_ID.get("uncategorized")!;
}

export function allCategories(profile?: Pick<FinProfile, "customCategories">): CategoryDef[] {
  return [...CATEGORIES, ...(profile?.customCategories ?? []).map((c) => categoryOf(c.id, profile?.customCategories))];
}

export const CATEGORY_GROUPS: { label: string; filter: (c: CategoryDef) => boolean }[] = [
  { label: "Business income", filter: (c) => c.kind === "income" },
  { label: "Business expenses", filter: (c) => c.kind === "expense" },
  { label: "Home & personal", filter: (c) => c.kind === "personal" },
  { label: "Tax payments", filter: (c) => c.kind === "payment" },
  { label: "Not on the return", filter: (c) => c.kind === "excluded" },
];

/** Schedule C line order for the printed guide. */
export const SCHEDULE_C_LINES: { line: string; label: string }[] = [
  { line: "C8", label: "Advertising" }, { line: "C9", label: "Car and truck expenses" }, { line: "C10", label: "Commissions and fees" },
  { line: "C11", label: "Contract labor" }, { line: "C13", label: "Depreciation and section 179" }, { line: "C15", label: "Insurance (other than health)" },
  { line: "C16b", label: "Interest (other)" }, { line: "C17", label: "Legal and professional services" }, { line: "C18", label: "Office expense" },
  { line: "C20a", label: "Rent — vehicles, machinery, equipment" }, { line: "C20b", label: "Rent — other business property" },
  { line: "C21", label: "Repairs and maintenance" }, { line: "C22", label: "Supplies" }, { line: "C23", label: "Taxes and licenses" },
  { line: "C24a", label: "Travel" }, { line: "C24b", label: "Deductible meals" }, { line: "C25", label: "Utilities" }, { line: "C27a", label: "Other expenses" },
];
