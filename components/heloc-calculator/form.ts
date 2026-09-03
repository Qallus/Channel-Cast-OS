import { DEFAULT_INPUTS, type HelocInputs, type LoanType } from "@/lib/heloc/calc";

/**
 * Every numeric field is held as a raw string so a field can be emptied while
 * the consultant retypes it. `mortPayment` and `miEnds` are meaningfully blank:
 * blank P&I means "use the computed payment", blank MI end means "life of loan".
 */
export type NumericField =
  | "homeValue"
  | "balance"
  | "mortRate"
  | "monthsLeft"
  | "mortPayment"
  | "taxes"
  | "insurance"
  | "mi"
  | "hoa"
  | "miEnds"
  | "income"
  | "expenses"
  | "helocRate"
  | "maxLtv"
  | "closing"
  | "annualFee";

export type Form = { loanType: LoanType } & Record<NumericField, string>;

const str = (n: number | null) => (n === null ? "" : String(n));

export const DEFAULT_FORM: Form = {
  loanType: DEFAULT_INPUTS.loanType,
  homeValue: str(DEFAULT_INPUTS.homeValue),
  balance: str(DEFAULT_INPUTS.balance),
  mortRate: str(DEFAULT_INPUTS.mortRate),
  monthsLeft: str(DEFAULT_INPUTS.monthsLeft),
  mortPayment: str(DEFAULT_INPUTS.mortPayment),
  taxes: str(DEFAULT_INPUTS.taxes),
  insurance: str(DEFAULT_INPUTS.insurance),
  mi: str(DEFAULT_INPUTS.mi),
  hoa: str(DEFAULT_INPUTS.hoa),
  miEnds: str(DEFAULT_INPUTS.miEnds),
  income: str(DEFAULT_INPUTS.income),
  expenses: str(DEFAULT_INPUTS.expenses),
  helocRate: str(DEFAULT_INPUTS.helocRate),
  maxLtv: str(DEFAULT_INPUTS.maxLtv),
  closing: str(DEFAULT_INPUTS.closing),
  annualFee: str(DEFAULT_INPUTS.annualFee),
};

/** A blank or unparseable field reads as 0, matching the reference calculator. */
const num = (v: string) => Number.parseFloat(v) || 0;

/** A blank field means "not set"; 0 is a real value. */
const optional = (v: string) => (v.trim() === "" ? null : num(v));

export function toInputs(form: Form): HelocInputs {
  return {
    loanType: form.loanType,
    homeValue: num(form.homeValue),
    balance: num(form.balance),
    mortRate: num(form.mortRate),
    monthsLeft: num(form.monthsLeft),
    // 0 falls back to the computed P&I, exactly as the reference does.
    mortPayment: num(form.mortPayment) || null,
    taxes: num(form.taxes),
    insurance: num(form.insurance),
    mi: num(form.mi),
    hoa: num(form.hoa),
    miEnds: optional(form.miEnds),
    income: num(form.income),
    expenses: num(form.expenses),
    helocRate: num(form.helocRate),
    maxLtv: num(form.maxLtv),
    closing: num(form.closing),
    annualFee: num(form.annualFee),
  };
}

/** Updates one field of the form; typed so `loanType` only accepts a LoanType. */
export type SetField = <K extends keyof Form>(field: K, value: Form[K]) => void;
