/** Display helpers for the mortgage vs. first-position HELOC calculator. */

/** Whole-dollar currency, e.g. `$1,234`. */
export function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** A ratio as a one-decimal percentage, e.g. `0.452` → `45.2%`. */
export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/** A month count as "27 yrs 3 mo". `null` (never pays off) renders as "Never". */
export function monthsToString(m: number | null): string {
  if (m === null) return "Never";
  const y = Math.floor(m / 12);
  const r = m % 12;
  const out = `${y ? `${y} yr${y > 1 ? "s" : ""} ` : ""}${r ? `${r} mo` : ""}`.trim();
  return out || "0 mo";
}
