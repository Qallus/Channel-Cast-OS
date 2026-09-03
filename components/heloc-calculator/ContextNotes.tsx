import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CAVEATS = [
  "Most of the acceleration comes from cash flow, not the product. Compare against the middle column, not just the left one.",
  "A low fixed rate is worth a lot. Swapping 3% fixed for 8% variable only wins if the cash flow is strong enough to keep the balance falling fast.",
  "HELOC rates are variable. Rerun with a higher rate to stress test.",
  "The strategy assumes spending discipline every month. Income that gets spent instead of deposited stays on the balance at HELOC rates.",
  "Some lenders can freeze or reduce a line if home values fall.",
];

export function ContextNotes() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>How the HELOC scenario is calculated</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The HELOC pays off the mortgage and becomes the only lien. All take-home income is deposited into the line
            each month; living expenses, property taxes, insurance, and HOA are drawn back out. Interest is charged on
            the average balance for the month, so leaving income in the line reduces interest. The minimum payment is
            interest-only; the effective payment is all of the household&apos;s spare cash flow. Mortgage insurance is
            eliminated because there is no mortgage.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What to be honest about</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {CAVEATS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
