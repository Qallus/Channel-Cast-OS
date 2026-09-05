"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEAL_STAGE, DEAL_STAGE_ORDER, type DealStage } from "@/lib/crm/deals";
import { defaultConfig, defaultStage, newItemId, type StoredStage } from "@/lib/crm/stage-config";
import { STAGE_GUIDE } from "@/lib/crm/pipeline-guidance";
import { cn } from "@/lib/utils";

type Draft = Record<DealStage, StoredStage>;

/** Items that satisfy themselves from the record — renaming is fine, deleting loses the automation. */
const isAuto = (stage: DealStage, itemId: string) =>
  Boolean(STAGE_GUIDE[stage]?.checklist.find((c) => c.id === itemId)?.auto);

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * The stage editor.
 *
 * pipeline-guidance.ts always carried its stages as data "so an admin screen can
 * edit it later without touching the Opportunity workspace". This is that screen:
 * the goal, the suggested actions and the Next Steps for every stage, editable
 * and shared by every opportunity.
 */
export function StageConfigDialog({
  open, initial, startStage, onClose, onSave, saving,
}: {
  open: boolean;
  /** Stored overrides; stages absent from it fall back to the built-in guide. */
  initial: Partial<Record<DealStage, StoredStage>> | null;
  startStage?: DealStage;
  onClose: () => void;
  onSave: (stages: Record<DealStage, StoredStage>) => void;
  saving?: boolean;
}) {
  const [stage, setStage] = useState<DealStage>(startStage ?? "new_working");
  const [draft, setDraft] = useState<Draft>(() => defaultConfig());

  useEffect(() => {
    if (!open) return;
    setStage(startStage ?? "new_working");
    setDraft({ ...defaultConfig(), ...(initial ?? {}) } as Draft);
  }, [open, initial, startStage]);

  const cur = draft[stage] ?? defaultStage(stage);
  const patch = (next: Partial<StoredStage>) => setDraft((d) => ({ ...d, [stage]: { ...cur, ...next } }));

  const setItem = (i: number, next: Partial<StoredStage["items"][number]>) =>
    patch({ items: cur.items.map((it, k) => (k === i ? { ...it, ...next } : it)) });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-hidden sm:max-w-[58rem]">
        <DialogHeader>
          <DialogTitle>Pipeline stages</DialogTitle>
          <p className="text-sm text-muted-foreground">
            The goal, suggested actions and Next Steps for each stage. Changes apply to every opportunity.
          </p>
        </DialogHeader>

        <div className="grid min-h-0 gap-4 sm:grid-cols-[13rem_minmax(0,1fr)]">
          {/* Stage picker */}
          <div className="flex gap-1 overflow-x-auto sm:max-h-[60vh] sm:flex-col sm:overflow-y-auto sm:pr-1">
            {DEAL_STAGE_ORDER.map((s) => {
              const count = (draft[s]?.items ?? []).length;
              const edited = Boolean(initial?.[s]);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className={cn(
                    "flex shrink-0 items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    stage === s ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="truncate">
                    {DEAL_STAGE[s].label}
                    {edited && <span className="ml-1 text-[10px] uppercase tracking-wide text-brand-strong">edited</span>}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Editor */}
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1 sm:max-h-[60vh]">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Goal</label>
              <Textarea rows={2} value={cur.goal} onChange={(e) => patch({ goal: e.target.value })}
                placeholder="What this stage is for." />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Guidance for success</label>
                <Button size="sm" variant="ghost" onClick={() => patch({ actions: [...cur.actions, ""] })}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <div className="space-y-1.5">
                {cur.actions.length === 0 && <p className="text-sm text-muted-foreground">No guidance for this stage.</p>}
                {cur.actions.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input value={a} placeholder="Something the rep should do"
                      onChange={(e) => patch({ actions: cur.actions.map((x, k) => (k === i ? e.target.value : x)) })} />
                    <Button size="icon" variant="ghost" title="Remove"
                      onClick={() => patch({ actions: cur.actions.filter((_, k) => k !== i) })}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next Steps</label>
                <Button size="sm" variant="ghost"
                  onClick={() => patch({ items: [...cur.items, { id: newItemId(), label: "", required: false }] })}>
                  <Plus className="h-3.5 w-3.5" /> Add step
                </Button>
              </div>
              <div className="space-y-1.5">
                {cur.items.length === 0 && <p className="text-sm text-muted-foreground">No steps for this stage yet.</p>}
                {cur.items.map((it, i) => {
                  const auto = isAuto(stage, it.id);
                  return (
                    <div key={it.id} className="flex items-center gap-1.5">
                      <Input value={it.label} placeholder="What has to be true to leave this stage"
                        onChange={(e) => setItem(i, { label: e.target.value })} />
                      <button
                        type="button"
                        onClick={() => setItem(i, { required: !it.required })}
                        title={it.required ? "Required to advance — click to make optional" : "Optional — click to require"}
                        className={cn(
                          "shrink-0 rounded-md border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                          it.required ? "border-warning/40 bg-warning/15 text-warning" : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {it.required ? "Required" : "Optional"}
                      </button>
                      <Button size="icon" variant="ghost" title="Move up" disabled={i === 0}
                        onClick={() => patch({ items: move(cur.items, i, i - 1) })}>
                        <ArrowUp className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Move down" disabled={i === cur.items.length - 1}
                        onClick={() => patch({ items: move(cur.items, i, i + 1) })}>
                        <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost"
                        title={auto ? "Ticks itself from the record — removing it loses that" : "Remove"}
                        onClick={() => patch({ items: cur.items.filter((_, k) => k !== i) })}>
                        <Trash2 className={cn("h-4 w-4", auto ? "text-warning" : "text-muted-foreground")} />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Required steps block advancing out of the stage. Some built-in steps tick themselves from the
                record — those keep working as long as you keep the step.
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={() => patch(defaultStage(stage))}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset {DEAL_STAGE[stage].label} to defaults
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={() => onSave(
              // Blank rows are an artefact of editing, not something to store.
              Object.fromEntries(DEAL_STAGE_ORDER.map((s) => {
                const v = draft[s] ?? defaultStage(s);
                return [s, {
                  goal: v.goal.trim(),
                  actions: v.actions.map((a) => a.trim()).filter(Boolean),
                  items: v.items.filter((i) => i.label.trim()).map((i) => ({ ...i, label: i.label.trim() })),
                }];
              })) as Record<DealStage, StoredStage>,
            )}
          >
            {saving ? "Saving…" : "Save stages"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
