import { redirect } from "next/navigation";

import { PlansIndexClient } from "@/components/plans/plans-index-client";
import { requireUser, AuthError } from "@/lib/server/require-user";
import { listPeople, listPlansForActor } from "@/lib/plans/store";
import { APP_TEMPLATES } from "@/lib/plans/templates";
import type { PlanActor } from "@/lib/plans/access";

export const metadata = { title: "Plans · Channel Cast" };
export const dynamic = "force-dynamic";

export default async function PlansPage() {
  let user;
  try { user = await requireUser(); }
  catch (err) { if (err instanceof AuthError && err.status === 401) redirect("/login?next=/app/admin/plans"); throw err; }

  const actor: PlanActor = { id: user.id, isAdmin: user.isAdmin, name: user.name, email: user.email };
  const [plans, people] = await Promise.all([listPlansForActor(actor), listPeople(actor)]);
  const owner = { id: user.id, name: user.name || user.email || "You", email: user.email || "" };

  return <PlansIndexClient plans={plans} templates={APP_TEMPLATES} people={people} owner={owner} premiumAllowed={actor.isAdmin} />;
}
