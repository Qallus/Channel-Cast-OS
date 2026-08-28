import { supabaseAdmin } from "@/lib/server/supabase";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

const COLUMNS = "id, name, trigger_key, template_id, enabled, conditions, delay_minutes, recipient, custom_email, runs, last_run_at, owner, updated_at";

// GET /api/email/automations — rules plus their recent firings.
export async function GET() {
  const db = supabaseAdmin();
  const [rules, runs] = await Promise.all([
    db.from("email_automations").select(COLUMNS).order("updated_at", { ascending: false }),
    db.from("email_automation_runs").select("id, automation_id, trigger_key, to_addr, status, detail, created_at")
      .order("created_at", { ascending: false }).limit(100),
  ]);
  if (rules.error) return jsonError(rules.error.message, 500);
  return Response.json({ automations: rules.data ?? [], runs: runs.data ?? [] });
}

// POST /api/email/automations — create or update (send an id to update).
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const name = String(b?.name || "").trim();
  const triggerKey = String(b?.trigger_key || "").trim();
  if (!name) return jsonError("A rule name is required.");
  if (!triggerKey) return jsonError("Pick a trigger.");
  if (b?.recipient === "custom" && !String(b?.custom_email || "").includes("@")) {
    return jsonError("A fixed-address rule needs a valid email.");
  }

  const row = {
    name,
    trigger_key: triggerKey,
    template_id: b?.template_id || null,
    enabled: Boolean(b?.enabled),
    conditions: b?.conditions ?? {},
    delay_minutes: Number(b?.delay_minutes ?? 0) || 0,
    recipient: ["contact", "owner", "custom"].includes(b?.recipient) ? b.recipient : "contact",
    custom_email: b?.custom_email || null,
    owner: b?.owner ?? null,
    updated_at: new Date().toISOString(),
  };

  const db = supabaseAdmin();
  const { data, error } = b?.id
    ? await db.from("email_automations").update(row).eq("id", b.id).select(COLUMNS).single()
    : await db.from("email_automations").insert(row).select(COLUMNS).single();
  if (error) return jsonError(error.message, 500);
  return Response.json({ automation: data });
}

// DELETE /api/email/automations?id=…
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id is required.");
  const { error } = await supabaseAdmin().from("email_automations").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return Response.json({ deleted: true });
}
