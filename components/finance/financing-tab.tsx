"use client";

import { useMemo, useState } from "react";
import { BookOpen, Bot, ClipboardList, FileUp, LayoutDashboard, ListChecks, Printer, Route, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toast, useToast } from "@/components/ui/toast";
import { taxGuideHtml } from "@/lib/finance/print";
import { computeTaxes, type TaxInput } from "@/lib/finance/tax";
import { TAX_YEARS, type TaxYear } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

import { AssistantPanel } from "./assistant-panel";
import { ImportPanel } from "./import-panel";
import { LedgerPanel } from "./ledger-panel";
import { LogsPanel } from "./logs-panel";
import { OverviewPanel } from "./overview-panel";
import { ProfilePanel } from "./profile-panel";
import { TurboTaxPanel } from "./turbotax-panel";
import { useFinance } from "./use-finance";

type Panel = "overview" | "ledger" | "import" | "logs" | "profile" | "guide" | "turbotax" | "assistant";
const PANELS: { id: Panel; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "ledger", label: "Ledger", icon: ListChecks },
  { id: "import", label: "Import", icon: FileUp },
  { id: "logs", label: "Mileage & hours", icon: Route },
  { id: "profile", label: "Tax profile", icon: UserRound },
  { id: "guide", label: "Filing guide", icon: BookOpen },
  { id: "turbotax", label: "TurboTax simulator", icon: ClipboardList },
  { id: "assistant", label: "AI assistant", icon: Bot },
];

export function FinancingTab() {
  const store = useFinance();
  const [panel, setPanel] = useState<Panel>("overview");
  const { toast, flash } = useToast();
  const { profile } = store;

  const input: TaxInput = useMemo(
    () => ({ profile, entries: store.entries.items, trips: store.trips.items, time: store.time.items }),
    [profile, store.entries.items, store.trips.items, store.time.items],
  );
  const summary = useMemo(() => computeTaxes(input), [input]);

  function printGuide() {
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) { flash("Allow pop-ups to print the filing guide.", "error"); return; }
    win.document.write(taxGuideHtml(input, summary, { autoPrint: true }));
    win.document.close();
    win.focus();
  }

  if (store.error) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">{store.error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1" aria-label="Accounting sections">
          {PANELS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPanel(p.id)} aria-current={panel === p.id ? "page" : undefined}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors", panel === p.id ? "bg-brand/15 text-brand-strong" : "text-muted-foreground hover:text-foreground")}>
              <p.icon className="h-4 w-4" /> {p.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Select value={String(profile.taxYear)} onValueChange={(v) => store.saveProfile({ ...profile, taxYear: Number(v) as TaxYear })}>
            <SelectTrigger className="w-[110px]" aria-label="Tax year"><SelectValue /></SelectTrigger>
            <SelectContent>{TAX_YEARS.map((y) => <SelectItem key={y} value={String(y)}>Tax year {y}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={printGuide} disabled={store.loading}><Printer className="h-4 w-4" /> Print filing guide</Button>
        </div>
      </div>

      {store.loading ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading your books…</div>
      ) : panel === "overview" ? (
        <OverviewPanel input={input} summary={summary} />
      ) : panel === "ledger" ? (
        <LedgerPanel store={store} flash={flash} />
      ) : panel === "import" ? (
        <ImportPanel store={store} flash={flash} onDone={() => setPanel("ledger")} />
      ) : panel === "logs" ? (
        <LogsPanel store={store} flash={flash} />
      ) : panel === "profile" ? (
        <ProfilePanel profile={profile} onChange={store.saveProfile} saved={store.profileSaved} />
      ) : panel === "guide" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">This is what prints: every number on the form and line it belongs to, in filing order, with the documents checklist and your full ledger behind it. Save it as a PDF for your preparer.</p>
          <iframe title="Filing guide preview" srcDoc={taxGuideHtml(input, summary)} className="h-[78vh] w-full rounded-xl border border-border bg-white" />
        </div>
      ) : panel === "turbotax" ? (
        <TurboTaxPanel input={input} summary={summary} />
      ) : (
        <AssistantPanel onChanged={store.reload} />
      )}

      <p className="text-xs text-muted-foreground">Estimates for planning and filing prep — not tax advice. Have a CPA or tax software confirm before you file. Private to you: stored only in the Channel Cast database, visible to your admin login.</p>
      <Toast toast={toast} />
    </div>
  );
}
