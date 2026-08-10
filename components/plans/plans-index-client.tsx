"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatePlanDialog } from "./create-plan/create-plan-dialog";
import { ProgressIndicator } from "./shared/badges";
import { planColor, planIcon } from "@/lib/plans/constants";
import { cn } from "@/lib/utils";
import type { PlanPerson, PlanSummary, PlanTemplate } from "@/lib/plans/types";

type Filter = "all" | "mine" | "shared";

export function PlansIndexClient({
  plans,
  templates,
  people,
  owner,
  premiumAllowed,
}: {
  plans: PlanSummary[];
  templates: PlanTemplate[];
  people: PlanPerson[];
  owner: PlanPerson;
  premiumAllowed: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<PlanSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/plans/${deleting.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Plan delete failed.");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan delete failed.");
    } finally {
      setBusy(false);
    }
  }

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans
      .filter((plan) => (filter === "mine" ? plan.owner_id === owner.id : filter === "shared" ? plan.owner_id !== owner.id : true))
      .filter((plan) => !query || plan.name.toLowerCase().includes(query) || (plan.description ?? "").toLowerCase().includes(query));
  }, [plans, filter, search, owner.id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { value: "all", label: "All plans" },
              { value: "mine", label: "Owned by me" },
              { value: "shared", label: "Shared with me" },
            ] as Array<{ value: Filter; label: string }>
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              aria-pressed={filter === tab.value}
              className={cn(
                "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                filter === tab.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent/40",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plans…"
              className="pl-9"
              aria-label="Search plans"
            />
          </div>
          <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden /> New plan
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/25 px-6 py-16 text-center">
          <p className="text-sm font-medium">
            {plans.length === 0 ? "No plans yet." : search.trim() ? `No plans match “${search.trim()}”.` : "No plans in this filter."}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {plans.length === 0
              ? "A plan is a board of tasks you can group, assign and schedule. Start from scratch or pick a template."
              : "Try a different filter or clear the search."}
          </p>
          {plans.length === 0 ? (
            <Button size="sm" onClick={() => setCreating(true)} className="mt-4 gap-1.5">
              <Plus className="h-3.5 w-3.5" aria-hidden /> Create your first plan
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((plan) => {
            const Icon = planIcon(plan.icon);
            const color = planColor(plan.color);
            const progress = plan.task_count ? (plan.completed_count / plan.task_count) * 100 : 0;

            return (
              // The delete control is a sibling of the Link, not a child — a button
              // nested inside an anchor is invalid HTML and breaks keyboard nav.
              <div key={plan.id} className="group relative">
              <Link
                href={`/app/admin/plans/${plan.id}?view=${plan.default_view}`}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition",
                  "hover:border-primary/40 hover:shadow",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", color.chip)}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{plan.name}</p>
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {plan.description || "No description"}
                      </p>
                    </div>
                  </div>
                  {plan.plan_type === "premium" ? (
                    <span className="shrink-0 rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                      Premium
                    </span>
                  ) : null}
                </div>

                <ProgressIndicator value={progress} />

                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {plan.completed_count}/{plan.task_count} task{plan.task_count === 1 ? "" : "s"} done
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" aria-hidden />
                    <span className="tabular-nums">{plan.member_count}</span>
                    <span className="sr-only">members</span>
                  </span>
                </div>

                <p className="truncate border-t border-border pt-2 pr-8 text-xs text-muted-foreground">
                  {plan.owner_id === owner.id ? "Owned by you" : `Owned by ${plan.owner?.name ?? "someone else"}`}
                  {plan.visibility === "private" ? " · Private" : ""}
                </p>
              </Link>

              {plan.can_manage ? (
                <button
                  type="button"
                  onClick={() => setDeleting(plan)}
                  aria-label={`Delete ${plan.name}`}
                  title={`Delete ${plan.name}`}
                  className={cn(
                    "absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition",
                    "hover:bg-destructive/10 hover:text-destructive",
                    // Hidden until hover, but always reachable by keyboard.
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
              </div>
            );
          })}
        </div>
      )}

      <CreatePlanDialog
        open={creating}
        onOpenChange={setCreating}
        templates={templates}
        people={people}
        owner={owner}
        premiumAllowed={premiumAllowed}
      />

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDeleting(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this plan?</DialogTitle>
            <DialogDescription>
              {/* Deletion cascades, so say exactly what goes with it. */}
              <span className="font-medium text-foreground">{deleting?.name}</span> and its{" "}
              {deleting?.task_count ?? 0} task{deleting?.task_count === 1 ? "" : "s"}, groups, labels and activity history will
              be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? "Deleting…" : "Delete plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
