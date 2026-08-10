import { planActor, planApiError } from "@/lib/plans/route-helpers";
import { moveTask, requirePlanEdit } from "@/lib/plans/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ planId: string; taskId: string }> }) {
  try {
    const { planId, taskId } = await params;
    const actor = await planActor();
    await requirePlanEdit(planId, actor);
    const body = (await request.json().catch(() => ({}))) as { groupId?: string | null; index?: number };
    const task = await moveTask(planId, taskId, body.groupId ? String(body.groupId) : null, Number(body.index ?? 0));
    return Response.json({ task });
  } catch (error) {
    return planApiError(error, "Task move failed.");
  }
}
