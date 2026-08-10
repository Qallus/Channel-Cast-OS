import { planActor, planApiError } from "@/lib/plans/route-helpers";
import { deleteTask, requirePlanEdit, updateTask } from "@/lib/plans/store";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ planId: string; taskId: string }> }) {
  try {
    const { planId, taskId } = await params;
    const actor = await planActor();
    await requirePlanEdit(planId, actor);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const task = await updateTask(actor, planId, taskId, body);
    return Response.json({ task });
  } catch (error) {
    return planApiError(error, "Task update failed.");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ planId: string; taskId: string }> }) {
  try {
    const { planId, taskId } = await params;
    const actor = await planActor();
    await requirePlanEdit(planId, actor);
    await deleteTask(planId, taskId);
    return Response.json({ ok: true });
  } catch (error) {
    return planApiError(error, "Task delete failed.");
  }
}
