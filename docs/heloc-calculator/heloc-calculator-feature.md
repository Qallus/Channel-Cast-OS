# Feature: Mortgage vs. First-Position HELOC Calculator

Port the standalone `heloc-comparison.html` calculator into the Channel Cast Next.js app as a client-side route. The reference HTML is the source of truth for the math; when in doubt, match it.

## Goal

A side-by-side comparison a consultant fills in during a meeting. Three scenarios, same inputs:

1. **Keep the mortgage** – baseline amortization with the full PITI payment (P&I + taxes + insurance + mortgage insurance + HOA).
2. **Mortgage + extra principal** – same loan, spare monthly cash flow applied to principal.
3. **First-position HELOC** – HELOC replaces the mortgage; all income deposited, expenses (including taxes, insurance, HOA) drawn, interest on average monthly balance. Mortgage insurance is eliminated.

Outputs per scenario: monthly payment, time to payoff, total interest, total mortgage insurance, savings vs. baseline (and HELOC vs. extra principal). Plus a balance-over-time line chart and a CLTV eligibility check.

## Why the payment is split up

Homeowners quote their full house payment (PITI). If that number is treated as principal and interest, the calculator wildly overstates how fast the loan pays off. P&I is always derived from balance, rate, and months remaining (with an override), and escrow items are entered separately. Mortgage insurance is tracked on its own because it can end mid-loan and because a HELOC removes it entirely, which is a real, quantifiable saving.

## Stack constraints

- Next.js 15 App Router, TypeScript, Tailwind 3 (existing config).
- Client component (`"use client"`). No server actions, no persistence, no auth.
- Charting: `recharts` (add if not already a dependency). Do not add Chart.js.
- Match existing Channel Cast theme: near-black background, lime `#C6FF00` accent. Use lime only for the "fastest payoff" highlight and the HELOC series line; everything else neutral.
- Numbers use `tabular-nums`.

## File structure

```
app/tools/heloc-calculator/page.tsx
components/heloc-calculator/HelocCalculator.tsx   # state + layout
components/heloc-calculator/MortgageInputs.tsx     # loan + escrow card
components/heloc-calculator/CashFlowInputs.tsx     # income/expenses card
components/heloc-calculator/HelocInputs.tsx        # HELOC terms + CLTV check
components/heloc-calculator/ScenarioCard.tsx       # one results column
components/heloc-calculator/BalanceChart.tsx       # recharts line chart
components/heloc-calculator/ContextNotes.tsx       # explanation + caveats
lib/heloc/calc.ts                                  # pure functions, no React
lib/heloc/calc.test.ts
lib/heloc/format.ts                                # fmt, pct, monthsToString
```

## Inputs

### Current mortgage

| Field | id | Default | Notes |
|---|---|---|---|
| Loan type | `loanType` | FHA | Select: Conventional / FHA / VA / USDA. Drives the MI hint text only. |
| Home value today | `homeValue` | 450000 | |
| Balance owed | `balance` | 200000 | |
| Interest rate (%) | `mortRate` | 3 | |
| Months remaining | `monthsLeft` | 324 | |
| Principal & interest only | `mortPayment` | blank | Auto-computed; placeholder shows the computed value; user may override. **Never accept PITI here.** |
| Property taxes / mo | `taxes` | 250 | |
| Home insurance / mo | `insurance` | 150 | |
| Mortgage insurance / mo | `mi` | 140 | PMI / FHA MIP / USDA fee |
| HOA / mo | `hoa` | 0 | |
| Mortgage insurance ends after (months) | `miEnds` | blank | Blank = life of loan |

MI hint text by loan type:
- Conventional: PMI can usually be cancelled once the balance reaches 80% of the original value, and must drop at 78%. Estimate how many months that takes and enter it.
- FHA: MIP stays for the life of the loan if the down payment was under 10%. With 10% or more down it ends after 11 years (132 months). Only a refinance removes it early.
- VA: No monthly mortgage insurance. Leave it at 0.
- USDA: Annual fee stays for the life of the loan.

Display under the card: P&I, Escrow + HOA, Total monthly (PITI).

### Household cash flow

| Field | id | Default |
|---|---|---|
| Monthly take-home income | `income` | 9500 |
| Monthly expenses (excluding house payment) | `expenses` | 5500 |

Expenses exclude the entire house payment because those items are entered on the mortgage card. Display: cash flow before housing, left over after full PITI (red if negative), left over under HELOC.

### First-position HELOC

| Field | id | Default |
|---|---|---|
| HELOC rate (%) | `helocRate` | 8.25 |
| Max CLTV allowed (%) | `maxLtv` | 90 |
| Closing costs rolled in | `closing` | 3500 |
| Annual fee | `annualFee` | 75 |

Display: current LTV, line needed (`balance + closing`), pass/fail against `maxLtv`. Note that a HELOC has no escrow; taxes, insurance, HOA are paid from the line, and MI goes away.

## Derived values

```ts
const pi        = inputs.mortPayment || monthlyPayment(balance, mortRate, monthsLeft);
const escrow    = taxes + insurance + mi + hoa;
const piti      = pi + escrow;
const cfGross   = income - expenses;                     // before any housing
const cfNet     = cfGross - piti;                        // left after full mortgage payment
const helocDraws = expenses + taxes + insurance + hoa;   // what gets pulled from the line each month
const cfHeloc   = income - helocDraws;                   // effective HELOC payment
const lineNeeded = balance + closing;
const cltv      = lineNeeded / homeValue;
```

## Calculation logic (`lib/heloc/calc.ts`)

Cap all simulations at `MAX_MONTHS = 600`. A scenario that doesn't reach zero returns `months: null` (display "Never").

```ts
export type Scenario = {
  months: number | null;
  interest: number;
  miPaid: number;          // 0 for HELOC
  series: number[];        // balance at end of each year, index 0 = start
  firstInt?: number;       // HELOC only: month-1 interest (minimum payment)
};

export function monthlyPayment(balance: number, annualRate: number, months: number): number {
  const i = annualRate / 12;
  if (months <= 0) return 0;
  if (i === 0) return balance / months;
  return (balance * i) / (1 - Math.pow(1 + i, -months));
}

/**
 * Fixed P&I amortization. extraFn receives this month's MI amount and returns
 * extra principal to apply (so extra grows when MI drops off). miEnds null = life of loan.
 */
export function amortize(
  balance: number, annualRate: number, pi: number,
  extraFn: (miThisMonth: number) => number,
  mi: number, miEnds: number | null
): Scenario {
  const i = annualRate / 12;
  let bal = balance, interest = 0, miPaid = 0, m = 0;
  const series = [balance];
  while (bal > 0.005 && m < MAX_MONTHS) {
    const miThisMonth = (miEnds === null || m < miEnds) ? mi : 0;
    const int = bal * i;
    const pay = Math.min(pi + extraFn(miThisMonth), bal + int);
    if (pay <= int) break;                 // never pays off
    interest += int; miPaid += miThisMonth;
    bal = bal + int - pay;
    m++;
    if (m % 12 === 0) series.push(Math.max(bal, 0));
  }
  const done = bal <= 0.005;
  if (done && m % 12 !== 0) series.push(0);
  return { months: done ? m : null, interest, miPaid, series };
}

export function helocScenario(
  balance: number, annualRate: number, income: number, draws: number, annualFee: number
): Scenario {
  const i = annualRate / 12;
  let bal = balance, interest = 0, m = 0, firstInt: number | undefined;
  const series = [balance];
  while (bal > 0.005 && m < MAX_MONTHS) {
    if (m > 0 && m % 12 === 0) bal += annualFee;
    const avg = Math.max(bal - income + draws / 2, 0);   // income at start, draws through the month
    const int = avg * i;
    if (firstInt === undefined) firstInt = int;
    interest += int;
    bal = bal - income + draws + int;
    m++;
    if (m % 12 === 0) series.push(Math.max(bal, 0));
    if (bal >= balance * 1.5) break;                     // runaway, treat as never
  }
  const done = bal <= 0.005;
  if (done && m % 12 !== 0) series.push(0);
  return { months: done ? m : null, interest, miPaid: 0, series, firstInt };
}
```

Scenario wiring:

```ts
const base  = amortize(balance, mortRate, pi, () => 0, mi, miEnds);
const extra = amortize(balance, mortRate, pi,
  miNow => Math.max(cfGross - pi - taxes - insurance - hoa - miNow, 0), mi, miEnds);
const hel   = helocScenario(lineNeeded, helocRate, income, helocDraws, annualFee);
const cost  = (s: Scenario) => s.interest + s.miPaid;   // used for "saved" comparisons
```

"Fastest payoff" badge goes on whichever scenario has the lowest non-null `months`.

## Unit tests (minimum)

- `monthlyPayment(200000, 0.03, 324)` ≈ 901 (±1).
- `amortize` with the computed P&I and no extra pays off in exactly `monthsLeft` months.
- `amortize` with `pi` ≤ first-month interest returns `months: null`.
- `amortize` with `mi = 100, miEnds = 12` reports `miPaid = 1200`; with `miEnds = null` it reports `mi * months`.
- Extra principal increases after `miEnds` (payoff faster than a run with `miEnds = null`, all else equal).
- `helocScenario` with `income - draws` ≤ month-1 interest returns `months: null`.
- `helocScenario` with strong cash flow pays off faster than baseline `amortize`.
- Default inputs above reproduce the reference HTML's three payoff times and interest totals.

## Results card content

**Keep the mortgage**: monthly payment (PITI) [large], of which P&I, time to payoff [large], total interest, total mortgage insurance, total cost (interest + MI). Note: "The baseline: nothing changes."

**Mortgage + extra principal**: monthly payment (PITI + extra) [large], time to payoff [large], total interest, total mortgage insurance, saved vs. baseline (months and total cost). Note: "Same loan, same rate; spare cash flow goes to principal every month. No refinance, no new risk. Mortgage insurance still runs until it ends or the loan is gone." If `cfNet <= 0`: "No spare cash flow after PITI, so this matches the baseline."

**First-position HELOC**: minimum payment (month-1 interest), taxes/insurance/HOA paid from the line, effective payment (`cfHeloc`) [large], time to payoff [large], total interest, mortgage insurance ($0), saved vs. baseline, saved vs. extra principal. Note shows starting balance and rate, or "Spare cash flow does not cover the interest, so the balance never falls." when `months` is null.

## Chart

Recharts `LineChart`, x-axis "Yr 0…Yr N", y-axis currency in `$Xk`. Three series: baseline (muted grey), extra principal (light grey/white), HELOC (lime, thicker). Shared tooltip formatted as currency. Pad shorter series with zeros.

## Context section (copy)

**How the HELOC scenario is calculated**
The HELOC pays off the mortgage and becomes the only lien. All take-home income is deposited into the line each month; living expenses, property taxes, insurance, and HOA are drawn back out. Interest is charged on the average balance for the month, so leaving income in the line reduces interest. The minimum payment is interest-only; the effective payment is all of the household's spare cash flow. Mortgage insurance is eliminated because there is no mortgage.

**What to be honest about**
- Most of the acceleration comes from cash flow, not the product. Compare against the middle column, not just the left one.
- A low fixed rate is worth a lot. Swapping 3% fixed for 8% variable only wins if the cash flow is strong enough to keep the balance falling fast.
- HELOC rates are variable. Rerun with a higher rate to stress test.
- The strategy assumes spending discipline every month. Income that gets spent instead of deposited stays on the balance at HELOC rates.
- Some lenders can freeze or reduce a line if home values fall.

## Acceptance criteria

- `/tools/heloc-calculator` renders with defaults and recalculates on every input change; no submit button.
- Reset button restores defaults.
- Blank P&I field shows the computed value as placeholder and uses it; the label makes clear it is P&I only.
- Changing loan type updates the MI hint text.
- Blank "MI ends after" means MI for the life of the loan.
- CLTV box turns pass/fail based on `maxLtv`.
- All three scenarios, chart, and notes match the reference HTML output for the default inputs.
- No console errors; passes `next lint` and `tsc --noEmit`.
- Responsive: three columns on `lg`, stacked below.

## Out of scope for this pass

Rate stress-test slider, PMI auto-cancellation from original loan amount/value, printable client summary, saving/sharing scenarios. Ask before adding.
