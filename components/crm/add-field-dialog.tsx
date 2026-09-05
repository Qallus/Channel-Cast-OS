"use client";

import { useEffect, useMemo, useState } from "react";

import { FormField } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomFieldType } from "@/lib/crm/deals";
import { cn } from "@/lib/utils";

/**
 * Fields teams reach for often enough to be worth one click, with the type
 * already right. Picking one fills the form in; it does not lock it, so a
 * suggestion can be renamed before it is added.
 */
const SUGGESTED: { label: string; type: CustomFieldType }[] = [
  { label: "PO number", type: "text" },
  { label: "Campaign start", type: "date" },
  { label: "Campaign end", type: "date" },
  { label: "Contract status", type: "text" },
  { label: "Billing contact", type: "text" },
  { label: "Budget ceiling", type: "number" },
  { label: "Decision date", type: "date" },
  { label: "Competitor", type: "text" },
  { label: "Station / venue", type: "text" },
  { label: "Spots per week", type: "number" },
  { label: "Renewal date", type: "date" },
  { label: "Referred by", type: "text" },
];

const TYPE_LABEL: Record<CustomFieldType, string> = { text: "Text", number: "Number", date: "Date" };

export function AddFieldDialog({
  open, existingLabels, onClose, onAdd,
}: {
  open: boolean;
  /** Labels already on the panel, so the same field is not added twice. */
  existingLabels: string[];
  onClose: () => void;
  onAdd: (field: { label: string; type: CustomFieldType }) => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setType("text");
  }, [open]);

  const taken = useMemo(
    () => new Set(existingLabels.map((l) => l.trim().toLowerCase())),
    [existingLabels],
  );
  const trimmed = label.trim();
  const duplicate = trimmed !== "" && taken.has(trimmed.toLowerCase());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] gap-5 overflow-y-auto sm:max-w-[32rem]">
        <DialogHeader><DialogTitle>Add a key field</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Common fields</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => {
                const used = taken.has(s.label.toLowerCase());
                return (
                  <button
                    key={s.label}
                    type="button"
                    disabled={used}
                    onClick={() => { setLabel(s.label); setType(s.type); }}
                    title={used ? "Already on this opportunity" : `Add as ${TYPE_LABEL[s.type].toLowerCase()}`}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      used
                        ? "cursor-not-allowed border-border text-muted-foreground/50"
                        : trimmed === s.label
                          ? "border-brand-strong bg-accent text-accent-foreground"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <FormField label="Field name">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Anything you need to track"
                autoFocus
              />
            </FormField>
            <FormField label="Type">
              <Select value={type} onValueChange={(v) => setType(v as CustomFieldType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABEL) as CustomFieldType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {duplicate ? (
            <p className="text-xs text-destructive">This opportunity already has a field called “{trimmed}”.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The field is added to this opportunity and edits inline like the rest of the panel.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!trimmed || duplicate} onClick={() => onAdd({ label: trimmed, type })}>Add field</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
