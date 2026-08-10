import { planActor, planApiError } from "@/lib/plans/route-helpers";
import { createGroup, requirePlanEdit } from "@/lib/plans/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const actor = await planActor();
    const plan = await requirePlanEdit(planId, actor);
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const next = await createGroup(plan, String(body.name ?? ""));
    return Response.json({ groups: next.groups });
  } catch (error) {
    return planApiError(error, "Group create failed.");
  }
}
