import { Calculator } from "lucide-react";

import { HelocCalculator } from "@/components/heloc-calculator/HelocCalculator";

export const metadata = { title: "Mortgage vs. First-Position HELOC · Channel Cast" };

export default function Page() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Calculator className="h-5 w-5" />
        </span>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
          Mortgage vs. First-Position HELOC
        </h1>
      </div>
      <HelocCalculator />
    </main>
  );
}
