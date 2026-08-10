"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, Sparkles, SquareStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlanTypeCard } from "./plan-type-card";
import { TemplatePreview, type PreviewSelection } from "./template-preview";
import { PlanConfigurationForm, BLANK_PLAN_CONFIG, type PlanConfig } from "./plan-configuration-form";
import { TEMPLATE_SOURCES, planIcon } from "@/lib/plans/constants";
import { cn } from "@/lib/utils";
import type { PlanPerson, PlanTemplate, PlanType, TemplateSource } from "@/lib/plans/types";

// "Create a plan" — a two-step dialog.
//   Step 1 (choose):    plan type or template on the left, live preview on the right.
//   Step 2 (configure): the plan form on the left, a review summary on the right.
// Desktop is two columns; below md the preview stacks under the selector and the
// footer stays sticky. Inspired by the reference workflow only — the layout, colours
// and icons are all ours.

type Step = "choose" | "configure";

function templateSource(template: PlanTemplate, actorId: string): TemplateSource {
  if (template.created_by === actorId && !template.is_system_template) return "mine";
  if (template.visibility === "shared") return "shared";
  return "app";
}

function TemplateBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
      {label}
    </span>
  );
}

export function CreatePlanDialog({
  open,
  onOpenChange,
  templates,
  people,
  owner,
  premiumAllowed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: PlanTemplate[];
  people: PlanPerson[];
  owner: PlanPerson;
  premiumAllowed: boolean;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("choose");
  const [planType, setPlanType] = useState<PlanType>("basic");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [source, setSource] = useState<TemplateSource>("app");
  const [search, setSearch] = useState("");
  const [config, setConfig] = useState<PlanConfig>(BLANK_PLAN_CONFIG);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId) ?? null, [templates, templateId]);

  // A premium template forces a premium plan, so the badge and the gate agree with
  // what the server will actually do.
  const effectiveType: PlanType = selectedTemplate ? selectedTemplate.plan_type : planType;
  const blockedByPremium = effectiveType === "premium" && !premiumAllowed;

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates
      .filter((t) => templateSource(t, owner.id) === source)
      .filter((t) =>
        !query ||
        t.name.toLowerCase().includes(query) ||
        (t.description ?? "").toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query),
      );
  }, [templates, source, search, owner.id]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlanTemplate[]>();
    for (const template of visible) {
      const list = map.get(template.category) ?? [];
      list.push(template);
      map.set(template.category, list);
    }
    return [...map.entries()];
  }, [visible]);

  const selection: PreviewSelection = selectedTemplate
    ? { kind: "template", template: selectedTemplate }
    : { kind: "type", planType };

  const primaryLabel = selectedTemplate
    ? "Use template"
    : planType === "premium"
      ? "Create Premium plan"
      : "Create Basic plan";

  function reset() {
    setStep("choose");
    setPlanType("basic");
    setTemplateId(null);
    setSource("app");
    setSearch("");
    setConfig(BLANK_PLAN_CONFIG);
    setError(null);
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function advance() {
    setError(null);
    setConfig((current) => ({
      ...current,
      // Seed the name from the template the first time through, but never clobber
      // something the user has already typed.
      name: current.name || (selectedTemplate ? selectedTemplate.name : ""),
      defaultView: selectedTemplate?.template_data?.views?.[0] ?? current.defaultView,
    }));
    setStep("configure");
  }

  const dateError =
    config.startDate && config.targetDate && config.targetDate < config.startDate
      ? "The target date is before the start date."
      : null;

  async function submit() {
    if (!config.name.trim()) {
      setError("Give the plan a name.");
      return;
    }
    if (dateError) {
      setError(dateError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: config.name,
          description: config.description,
          planType: effectiveType,
          visibility: config.visibility,
          defaultView: config.defaultView,
          color: config.color,
          icon: config.icon,
          startDate: config.startDate || null,
          targetDate: config.targetDate || null,
          memberIds: config.memberIds,
          templateId: selectedTemplate?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Plan create failed.");

      // Open the new plan in the view the user chose.
      router.push(`/app/admin/plans/${data.planId}?view=${config.defaultView}`);
      router.refresh();
      close(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan create failed.");
    } finally {
      setSaving(false);
    }
  }

  const SelectedIcon = planIcon(config.icon);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-lg">
        {/* DialogContent renders its own close button (absolute right-4 top-4), so
            this header leaves room for it rather than adding a second one. */}
        <div className="shrink-0 border-b border-border px-4 py-3 pr-14 sm:px-6 sm:py-4 sm:pr-14">
          <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">Create a plan</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs sm:text-sm">
            {step === "choose" ? "Start from scratch or pick a template." : "Name it and choose who can see it."}
          </DialogDescription>
        </div>

        {/* min-h-0 is load-bearing: a flex child defaults to min-height:auto and will
            refuse to shrink below its content, which pushes the footer out of the
            dialog instead of scrolling. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
            <div className="min-w-0 border-border p-4 sm:p-6 md:border-r">
              {step === "choose" ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start from scratch</h2>
                    <div className="grid gap-2" role="radiogroup" aria-label="Plan type">
                      <PlanTypeCard
                        title="Basic plan"
                        description="The essentials to get moving — tasks, groups, dates and labels."
                        icon={SquareStack}
                        selected={!selectedTemplate && planType === "basic"}
                        onSelect={() => {
                          setTemplateId(null);
                          setPlanType("basic");
                        }}
                      />
                      <PlanTypeCard
                        title="Premium plan"
                        description="Adds structured project management for more complex work."
                        icon={Sparkles}
                        selected={!selectedTemplate && planType === "premium"}
                        locked={!premiumAllowed}
                        lockedReason="Premium is not enabled for your account. Ask a super admin to turn it on."
                        onSelect={() => {
                          setTemplateId(null);
                          setPlanType("premium");
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose a template</h2>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search templates…"
                        className="pl-9"
                        aria-label="Search templates"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Template source">
                      {TEMPLATE_SOURCES.map((tab) => (
                        <button
                          key={tab.value}
                          type="button"
                          role="tab"
                          aria-selected={source === tab.value}
                          onClick={() => setSource(tab.value)}
                          className={cn(
                            "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium transition",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                            source === tab.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground hover:bg-accent/40",
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="max-h-[38vh] space-y-4 overflow-y-auto pr-1 md:max-h-[42vh]">
                      {grouped.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          {search.trim()
                            ? `No templates match “${search.trim()}”.`
                            : source === "mine"
                              ? "You haven't saved any templates yet."
                              : source === "shared"
                                ? "No templates have been shared with you yet."
                                : "No templates available."}
                        </p>
                      ) : (
                        grouped.map(([category, list]) => (
                          <div key={category} className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground">{category}</p>
                            <div className="grid gap-1.5">
                              {list.map((template) => {
                                const Icon = planIcon(template.slug === "construction-project" ? "hammer" : "folder-kanban");
                                const selected = templateId === template.id;
                                return (
                                  <button
                                    key={template.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => setTemplateId(selected ? null : template.id)}
                                    className={cn(
                                      "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition min-h-[44px]",
                                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                                      selected
                                        ? "border-primary/50 bg-accent/60 shadow-sm"
                                        : "border-border bg-card hover:border-primary/30 hover:bg-accent/30",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                                        selected ? "bg-primary text-primary-foreground" : "bg-muted text-primary",
                                      )}
                                    >
                                      <Icon className="h-4 w-4" aria-hidden />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="flex flex-wrap items-center gap-1.5">
                                        <span className="truncate text-sm font-medium">{template.name}</span>
                                        {template.plan_type === "premium" ? <TemplateBadge label="Premium" /> : null}
                                        {template.badge ? <TemplateBadge label={template.badge} /> : null}
                                        {templateSource(template, owner.id) === "shared" ? <TemplateBadge label="Shared" /> : null}
                                      </span>
                                      <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">
                                        {template.description}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <PlanConfigurationForm
                  value={config}
                  onChange={(patch) => setConfig((current) => ({ ...current, ...patch }))}
                  owner={owner}
                  people={people}
                  dateError={dateError}
                />
              )}
            </div>

            {/* Preview / review. Stacks below the selector on small screens. */}
            <div className="min-w-0 border-t border-border bg-muted/30 p-4 sm:p-6 md:border-t-0">
              {step === "choose" ? (
                <TemplatePreview selection={selection} />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <SelectedIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold tracking-tight">{config.name || "Untitled plan"}</p>
                      <p className="text-xs text-muted-foreground">
                        {effectiveType === "premium" ? "Premium" : "Basic"} plan
                        {selectedTemplate ? ` · ${selectedTemplate.name}` : ""}
                      </p>
                    </div>
                  </div>

                  <dl className="space-y-2.5 rounded-lg border border-border bg-card p-3">
                    {[
                      { label: "Template", value: selectedTemplate?.name ?? "None — starting empty" },
                      {
                        label: "Groups",
                        value: selectedTemplate?.template_data?.groups?.map((g) => g.name).join(", ") || "You'll add your own",
                      },
                      { label: "Starter tasks", value: String(selectedTemplate?.template_data?.tasks?.length ?? 0) },
                      { label: "Default view", value: config.defaultView === "board" ? "Board" : "Grid" },
                      { label: "Visibility", value: config.visibility === "team" ? "Team — anyone on the dashboard" : "Private — you and members" },
                      { label: "Members", value: `${config.memberIds.length + 1} (including you)` },
                      {
                        label: "Dates",
                        value:
                          config.startDate || config.targetDate
                            ? `${config.startDate || "no start"} → ${config.targetDate || "no target"}`
                            : "Not scheduled",
                      },
                    ].map((row) => (
                      <div key={row.label} className="grid grid-cols-[5.5rem_1fr] gap-2">
                        <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
                        <dd className="min-w-0 break-words text-xs">{row.value}</dd>
                      </div>
                    ))}
                  </dl>

                  {selectedTemplate ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Starter tasks are created unstarted and unassigned. If you set a start date, their dates are offset from it —
                      otherwise they stay unscheduled. Edit or delete any of them afterwards.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Last row of the flex column, so it's pinned to the bottom of the dialog on
            every breakpoint without needing position: sticky. */}
        <div className="shrink-0 flex flex-col gap-2 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-h-[1.25rem] text-sm text-destructive" role="alert">
            {error ?? (blockedByPremium && step === "choose" ? "Premium is not enabled for your account." : "")}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {step === "configure" ? (
              <Button variant="ghost" onClick={() => setStep("choose")} disabled={saving} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" aria-hidden /> Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
            )}
            {step === "choose" ? (
              <Button onClick={advance} disabled={blockedByPremium}>
                {primaryLabel}
              </Button>
            ) : (
              <Button onClick={submit} disabled={saving || !config.name.trim() || Boolean(dateError)}>
                {saving ? "Creating…" : "Create plan"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
