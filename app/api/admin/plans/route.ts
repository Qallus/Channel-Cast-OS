import { planActor, planApiError } from "@/lib/plans/route-helpers";
import { PlanAccessError } from "@/lib/plans/access";
import { createPlan, type CreatePlanInput } from "@/lib/plans/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await planActor();
    const body = (await request.json().catch(() => ({}))) as Partial<CreatePlanInput> & { planType?: string };

    if (body.planType === "premium" && !actor.isAdmin) {
      throw new PlanAccessError("Premium is not enabled for your account.", 403);
    }

    const planId = await createPlan(actor, {
      name: String(body.name ?? ""),
      description: body.description ?? null,
      planType: body.planType === "premium" ? "premium" : "basic",
      visibility: body.visibility === "private" ? "private" : "team",
      defaultView: (["grid", "board", "list", "calendar"] as const).includes(body.defaultView as never) ? (body.defaultView as CreatePlanInput["defaultView"]) : "board",
      color: String(body.color ?? "gold"),
      icon: String(body.icon ?? "clipboard-list"),
      startDate: body.startDate ?? null,
      targetDate: body.targetDate ?? null,
      memberIds: Array.isArray(body.memberIds) ? body.memberIds.map(String) : [],
      templateId: body.templateId ?? null,
    });
    return Response.json({ planId });
  } catch (error) {
    return planApiError(error, "Plan create failed.");
  }
}
