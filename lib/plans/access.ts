import type { PlanAccess, PlanMemberRole } from "./types";

// Authorization for Plan Builder, adapted for Channel Cast. Admins (the operators)
// see and manage everything; other signed-in dashboard users see their own plans,
// plans they're a member of, and team-visible plans.
export class PlanAccessError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PlanAccessError";
    this.status = status;
  }
}

export type PlanActor = { id: string; isAdmin: boolean; name: string | null; email: string | null };

type PlanRow = { owner_id: string; visibility: "private" | "team"; archived_at: string | null };

export function computeAccess(plan: PlanRow, memberRole: PlanMemberRole | null, actor: PlanActor): PlanAccess {
  const isOwner = plan.owner_id === actor.id;
  const isTeamPlan = plan.visibility === "team";

  const canView = actor.isAdmin || isOwner || memberRole !== null || isTeamPlan;
  const canManage = actor.isAdmin || isOwner || memberRole === "owner";
  const canEdit =
    memberRole === "viewer"
      ? false
      : actor.isAdmin
        ? true
        : !plan.archived_at && (isOwner || memberRole !== null || isTeamPlan);

  return { canView, canEdit, canManage };
}
