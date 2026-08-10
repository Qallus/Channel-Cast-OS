import { cn } from "@/lib/utils";
import type { PlanPerson } from "@/lib/plans/types";

// There is no avatar primitive in components/ui, so this is a hand-rolled initials
// stack in the house ink/secondary tokens.

function initials(person: PlanPerson) {
  const parts = person.name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function MemberAvatar({ person, className }: { person: PlanPerson; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-semibold text-secondary-foreground",
        className,
      )}
      title={person.name}
    >
      {initials(person)}
    </span>
  );
}

export function MemberAvatarStack({
  people,
  max = 3,
  className,
}: {
  people: PlanPerson[];
  max?: number;
  className?: string;
}) {
  if (!people.length) return <span className="text-xs text-muted-foreground">Unassigned</span>;

  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* The names are announced once for the whole stack; the circles are decorative. */}
      <span className="sr-only">{people.map((p) => p.name).join(", ")}</span>
      <span className="flex -space-x-1.5" aria-hidden>
        {shown.map((person) => (
          <MemberAvatar key={person.id} person={person} className="ring-2 ring-card" />
        ))}
        {overflow > 0 ? (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
            +{overflow}
          </span>
        ) : null}
      </span>
    </span>
  );
}
