"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ScenarioRow = {
  label: string;
  value: string;
  /** Headline numbers — the monthly payment and the time to payoff. */
  big?: boolean;
};

/**
 * One results column. The winning column is the only place the lime accent
 * appears outside the HELOC chart series.
 */
export function ScenarioCard({
  title,
  rows,
  note,
  win,
}: {
  title: string;
  rows: ScenarioRow[];
  note?: string;
  win?: boolean;
}) {
  return (
    <Card className={cn("h-full", win && "ring-2 ring-brand")}>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
          {win ? (
            <span className="shrink-0 rounded bg-brand px-2 py-1 text-xs font-bold text-brand-foreground">
              Fastest payoff
            </span>
          ) : null}
        </div>

        <dl className="space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd
                className={cn(
                  "text-right font-bold tabular-nums text-foreground",
                  r.big ? "text-2xl" : "text-base",
                )}
              >
                {r.value}
              </dd>
            </div>
          ))}
        </dl>

        {note ? <p className="mt-4 text-sm text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}
