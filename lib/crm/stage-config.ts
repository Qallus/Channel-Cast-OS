// Editable stage guidance and Next Steps.
//
// STAGE_GUIDE ships the defaults. This layer lets an admin change the goal,
// the suggested actions, and the Next Steps for every stage without a deploy —
// the thing pipeline-guidance.ts always said an admin screen would do.
//
// Overrides live in the `settings` collection under a single record, so the
// whole configuration loads with one request and saves as one document.

import type { Deal, DealStage } from "@/lib/crm/deals";
import { DEAL_STAGE_ORDER } from "@/lib/crm/deals";
import { STAGE_GUIDE, type ChecklistItem, type StageGuide } from "@/lib/crm/pipeline-guidance";

export const STAGE_CONFIG_ID = "pipeline_stage_config";

/**
 * A stored item. `auto` predicates are functions and cannot be serialised, so
 * an item that overrides a built-in keeps its id and the predicate is looked up
 * from STAGE_GUIDE when the config is resolved.
 */
export type StoredItem = { id: string; label: string; required?: boolean };
export type StoredStage = { goal: string; actions: string[]; items: StoredItem[] };

export type StageConfigRecord = {
  id: string;
  /** Only stages the team has actually edited; the rest fall through to defaults. */
  stages?: Partial<Record<DealStage, StoredStage>>;
};

/** The built-in guide flattened into the editable shape. */
export function defaultStage(stage: DealStage): StoredStage {
  const g = STAGE_GUIDE[stage];
  return {
    goal: g?.goal ?? "",
    actions: [...(g?.actions ?? [])],
    items: (g?.checklist ?? []).map((c) => ({ id: c.id, label: c.label, required: c.required })),
  };
}

export function defaultConfig(): Record<DealStage, StoredStage> {
  return Object.fromEntries(DEAL_STAGE_ORDER.map((s) => [s, defaultStage(s)])) as Record<DealStage, StoredStage>;
}

/** The stored `auto` predicate for a built-in item, so ticks stay automatic. */
function autoFor(stage: DealStage, itemId: string): ChecklistItem["auto"] {
  return STAGE_GUIDE[stage]?.checklist.find((c) => c.id === itemId)?.auto;
}

/**
 * The guide for one stage: the team's version when they've edited it, the
 * built-in otherwise, plus any items added to this deal alone.
 */
export function resolveStage(
  stage: DealStage,
  config: StageConfigRecord | null,
  deal?: Deal | null,
): StageGuide {
  const stored = config?.stages?.[stage] ?? defaultStage(stage);
  const extras = (deal?.extraItems ?? []).filter((e) => e.stage === stage);
  return {
    goal: stored.goal,
    actions: stored.actions,
    checklist: [
      ...stored.items.map((i) => ({ id: i.id, label: i.label, required: i.required, auto: autoFor(stage, i.id) })),
      ...extras.map((e) => ({ id: e.id, label: e.label, required: e.required })),
    ],
  };
}

export type ResolvedItemState = { item: ChecklistItem; done: boolean; automatic: boolean; custom: boolean };

/** Resolve a stage's Next Steps against the record plus any manual ticks. */
export function stepsFor(
  deal: Deal,
  config: StageConfigRecord | null,
  stage: DealStage = deal.stage,
): ResolvedItemState[] {
  const custom = new Set((deal.extraItems ?? []).map((e) => e.id));
  return resolveStage(stage, config, deal).checklist.map((item) => {
    const automatic = Boolean(item.auto?.(deal));
    return {
      item,
      automatic,
      done: automatic || Boolean(deal.checklist?.[`${stage}:${item.id}`]),
      custom: custom.has(item.id),
    };
  });
}

/** Required Next Steps still outstanding — what blocks leaving a stage. */
export function blockingSteps(deal: Deal, config: StageConfigRecord | null, stage: DealStage = deal.stage): ChecklistItem[] {
  return stepsFor(deal, config, stage).filter((c) => c.item.required && !c.done).map((c) => c.item);
}

/** A stable id for a newly added item, unique within its stage. */
export function newItemId(prefix = "item"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
