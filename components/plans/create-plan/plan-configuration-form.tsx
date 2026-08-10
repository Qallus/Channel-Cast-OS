"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { MemberAvatar } from "@/components/plans/shared/member-avatar-stack";
import { PLAN_COLORS, PLAN_ICONS, PLAN_VIEWS } from "@/lib/plans/constants";
import { cn } from "@/lib/utils";
import type { PlanPerson, PlanView } from "@/lib/plans/types";

export type PlanConfig = {
  name: string;
  description: string;
  visibility: "team" | "private";
  defaultView: PlanView;
  color: string;
  icon: string;
  startDate: string;
  targetDate: string;
  memberIds: string[];
};

export const BLANK_PLAN_CONFIG: PlanConfig = {
  name: "",
  description: "",
  visibility: "team",
  defaultView: "board",
  color: "gold",
  icon: "clipboard-list",
  startDate: "",
  targetDate: "",
  memberIds: [],
};

function Section({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// Workspace is deliberately absent: MJG is single-tenant and there is no workspaces
// table, so the field would be a one-option dropdown. See the plan_builder migration.
export function PlanConfigurationForm({
  value,
  onChange,
  owner,
  people,
  dateError,
}: {
  value: PlanConfig;
  onChange: (patch: Partial<PlanConfig>) => void;
  owner: PlanPerson;
  people: PlanPerson[];
  dateError?: string | null;
}) {
  const others = people.filter((p) => p.id !== owner.id);

  return (
    <div className="space-y-5">
      <Section label="Plan name">
        <Input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Autumn campaign"
          maxLength={120}
          autoFocus
          required
        />
      </Section>

      <Section label="Description">
        <Textarea
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What is this plan for?"
          rows={2}
        />
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section label="Start date">
          <DatePicker value={value.startDate} onChange={(v) => onChange({ startDate: v })} placeholder="Not set" />
        </Section>
        <Section label="Target date">
          <DatePicker value={value.targetDate} onChange={(v) => onChange({ targetDate: v })} placeholder="Not set" />
        </Section>
      </div>
      {dateError ? <p className="text-sm text-destructive">{dateError}</p> : null}

      <Section label="Owner">
        <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2">
          <MemberAvatar person={owner} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{owner.name}</p>
            <p className="truncate text-xs text-muted-foreground">{owner.email}</p>
          </div>
        </div>
      </Section>

      <Section label="Members" hint="Members can create and edit tasks. You can change this later in plan settings.">
        {others.length ? (
          <div className="flex flex-wrap gap-1.5">
            {others.map((person) => {
              const selected = value.memberIds.includes(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() =>
                    onChange({
                      memberIds: selected ? value.memberIds.filter((id) => id !== person.id) : [...value.memberIds, person.id],
                    })
                  }
                  className={cn(
                    "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    selected ? "border-primary/50 bg-accent text-accent-foreground" : "border-border bg-card hover:bg-accent/40",
                  )}
                >
                  {selected ? <Check className="h-3 w-3" aria-hidden /> : <MemberAvatar person={person} className="h-4 w-4 text-[8px]" />}
                  {person.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No other dashboard users to add yet.</p>
        )}
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section label="Visibility">
          <div className="grid gap-1.5" role="radiogroup" aria-label="Visibility">
            {[
              { value: "team" as const, label: "Team", hint: "Anyone on the dashboard can find and edit it." },
              { value: "private" as const, label: "Private", hint: "Only you and the members you add." },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={value.visibility === option.value}
                onClick={() => onChange({ visibility: option.value })}
                className={cn(
                  "rounded-md border px-3 py-2 text-left transition min-h-[44px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  value.visibility === option.value ? "border-primary/50 bg-accent/60" : "border-border bg-card hover:bg-accent/30",
                )}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section label="Default view">
          <div className="grid gap-1.5" role="radiogroup" aria-label="Default view">
            {PLAN_VIEWS.map((view) => (
              <button
                key={view.value}
                type="button"
                role="radio"
                aria-checked={value.defaultView === view.value}
                onClick={() => onChange({ defaultView: view.value })}
                className={cn(
                  "rounded-md border px-3 py-2 text-left transition min-h-[44px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  value.defaultView === view.value ? "border-primary/50 bg-accent/60" : "border-border bg-card hover:bg-accent/30",
                )}
              >
                <span className="block text-sm font-medium">{view.label}</span>
                <span className="block text-xs text-muted-foreground">{view.description}</span>
              </button>
            ))}
          </div>
        </Section>
      </div>

      <Section label="Colour">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
          {PLAN_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              role="radio"
              aria-checked={value.color === color.value}
              aria-label={color.label}
              title={color.label}
              onClick={() => onChange({ color: color.value })}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                value.color === color.value ? "border-primary" : "border-transparent hover:border-border",
              )}
            >
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", color.swatch)}>
                {value.color === color.value ? <Check className="h-3.5 w-3.5 text-white drop-shadow" aria-hidden /> : null}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section label="Icon">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
          {PLAN_ICONS.map((option) => {
            const Icon = option.icon;
            const selected = value.icon === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                title={option.label}
                onClick={() => onChange({ icon: option.value })}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md border transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  selected ? "border-primary/50 bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent/40",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
