"use client";

import { Clock, LayoutGrid, ListChecks, Sparkles } from "lucide-react";
import { DEFAULT_SCRATCH_GROUPS, PLAN_TYPE_FEATURES } from "@/lib/plans/constants";
import type { PlanTemplate, PlanType, TemplateData } from "@/lib/plans/types";

// The right-hand preview panel. The miniature is an original abstract rendering of
// OUR board built from the template's real groups — not a product screenshot, and
// not anyone else's illustration.

export type PreviewSelection =
  | { kind: "type"; planType: PlanType }
  | { kind: "template"; template: PlanTemplate };

function BoardMiniature({ groups, taskCounts }: { groups: string[]; taskCounts: number[] }) {
  const columns = groups.slice(0, 4);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40 p-3" aria-hidden>
      <div className="flex gap-2 overflow-hidden">
        {columns.map((name, i) => (
          <div key={name} className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-md border border-border/70 bg-card p-2">
            <p className="truncate text-[10px] font-semibold text-foreground">{name}</p>
            {Array.from({ length: Math.min(taskCounts[i] ?? 0, 3) }).map((_, r) => (
              <div key={r} className="space-y-1 rounded border border-border/60 bg-background p-1.5">
                <div className="h-1 w-full rounded-full bg-muted-foreground/25" />
                <div className="h-1 w-2/3 rounded-full bg-muted-foreground/15" />
              </div>
            ))}
            {(taskCounts[i] ?? 0) === 0 ? <div className="h-1 w-1/2 rounded-full bg-muted-foreground/10" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs leading-5 text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

export function TemplatePreview({ selection }: { selection: PreviewSelection }) {
  const isTemplate = selection.kind === "template";
  const planType: PlanType = isTemplate ? selection.template.plan_type : selection.planType;
  const data: TemplateData = isTemplate ? selection.template.template_data ?? {} : {};

  // Same source as the groups actually created — see DEFAULT_SCRATCH_GROUPS.
  const groups = isTemplate ? (data.groups ?? []).map((g) => g.name) : DEFAULT_SCRATCH_GROUPS.map((g) => g.name);
  const tasks = data.tasks ?? [];
  const taskCount = isTemplate ? tasks.length : 0;

  const perColumn = groups.map((name, i) => {
    if (!isTemplate) return i === 0 ? 2 : i === 1 ? 1 : 0;
    const key = (data.groups ?? [])[i]?.key ?? name;
    return tasks.filter((t) => (t.group_key ?? "") === key).length;
  });

  const title = isTemplate ? selection.template.name : planType === "premium" ? "Premium plan" : "Basic plan";
  const description = isTemplate
    ? selection.template.description ?? ""
    : planType === "premium"
      ? "Everything in Basic plus structured project management for work with dependencies, goals and reporting."
      : "A clean plan with the essentials. Add groups and tasks as you go — you can change any of this later.";

  const features = PLAN_TYPE_FEATURES[planType];
  // A rough, honest estimate: reading the template plus naming it.
  const setupMinutes = isTemplate ? Math.max(2, Math.round(taskCount / 3) + groups.length) : 1;

  return (
    <div className="flex h-full flex-col gap-4">
      <BoardMiniature groups={groups} taskCounts={perColumn} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
            {planType === "premium" ? "Premium" : "Basic"}
          </span>
        </div>
        {description ? <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <Row icon={LayoutGrid} label="Views" value={features.views.join(", ")} />
        <Row
          icon={ListChecks}
          label={`Groups (${groups.length})`}
          value={groups.length ? groups.join(" → ") : "None — you'll add your own"}
        />
        <Row
          icon={Sparkles}
          label="Starter tasks"
          value={taskCount ? `${taskCount} task${taskCount === 1 ? "" : "s"}, ready to edit or delete` : "None — you'll add your own"}
        />
        <Row icon={Clock} label="Estimated setup" value={`About ${setupMinutes} minute${setupMinutes === 1 ? "" : "s"}`} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Included</p>
        <ul className="mt-2 space-y-1">
          {features.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
