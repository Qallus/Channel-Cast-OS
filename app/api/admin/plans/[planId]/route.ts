import { planActor, planApiError } from "@/lib/plans/route-helpers";
import { deletePlan, requirePlanManage, updatePlan } from "@/lib/plans/store";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const actor = await planActor();
    const plan = await requirePlanManage(planId, actor);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const next = await updatePlan(plan, body);
    return Response.json({ plan: next });
  } catch (error) {
    return planApiError(error, "Plan update failed.");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const actor = await planActor();
    await requirePlanManage(planId, actor);
    await deletePlan(planId);
    return Response.json({ ok: true });
  } catch (error) {
    return planApiError(error, "Plan delete failed.");
  }
}
