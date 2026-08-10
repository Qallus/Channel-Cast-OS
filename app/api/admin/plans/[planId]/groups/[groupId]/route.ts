import { planActor, planApiError } from "@/lib/plans/route-helpers";
import { deleteGroup, requirePlanEdit, updateGroup } from "@/lib/plans/store";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ planId: string; groupId: string }> }) {
  try {
    const { planId, groupId } = await params;
    const actor = await planActor();
    const plan = await requirePlanEdit(planId, actor);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const next = await updateGroup(plan, groupId, body);
    return Response.json({ groups: next.groups });
  } catch (error) {
    return planApiError(error, "Group update failed.");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ planId: string; groupId: string }> }) {
  try {
    const { planId, groupId } = await params;
    const actor = await planActor();
    const plan = await requirePlanEdit(planId, actor);
    const next = await deleteGroup(plan, groupId);
    return Response.json({ groups: next.groups });
  } catch (error) {
    return planApiError(error, "Group delete failed.");
  }
}
