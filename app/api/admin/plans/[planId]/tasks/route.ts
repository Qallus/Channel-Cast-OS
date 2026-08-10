import { planActor, planApiError } from "@/lib/plans/route-helpers";
import { createTask, requirePlanEdit } from "@/lib/plans/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const actor = await planActor();
    await requirePlanEdit(planId, actor);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const task = await createTask(actor, planId, body);
    return Response.json({ task });
  } catch (error) {
    return planApiError(error, "Task create failed.");
  }
}
