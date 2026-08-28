// Server-side automation dispatcher.
//
// Pipeline and CRM code calls fireEmailTrigger(); everything else — matching
// rules, resolving the recipient, merging fields, sending and logging — happens
// here, so no caller has to know how automations work.

import { applyMergeFields } from "@/lib/email/blocks";
import { DEDUPE_WINDOW_MINUTES } from "@/lib/email/automations";
import { sendNotificationEmail } from "@/lib/server/email";
import { supabaseAdmin } from "@/lib/server/supabase";

export type TriggerPayload = {
  opportunityId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  owner?: string | null;
  /** Where the mail goes when the rule targets the contact. */
  contactEmail?: string | null;
  ownerEmail?: string | null;
  /** Values available to {{tokens}} in the subject and body. */
  fields?: Record<string, string | null | undefined>;
  /** Compared against a rule's `conditions`. */
  attributes?: Record<string, string | null | undefined>;
};

type Row = Record<string, unknown>;

const matches = (conditions: Row, attributes: Record<string, string | null | undefined>) =>
  Object.entries(conditions ?? {}).every(([k, v]) => !v || String(attributes?.[k] ?? "") === String(v));

/**
 * Fire every enabled rule for an event. Never throws: an automation failing
 * must not take down the stage change or send that triggered it.
 */
export async function fireEmailTrigger(triggerKey: string, payload: TriggerPayload): Promise<{ fired: number }> {
  try {
    const db = supabaseAdmin();
    const { data: rules, error } = await db
      .from("email_automations")
      .select("id, name, trigger_key, template_id, enabled, conditions, delay_minutes, recipient, custom_email, runs")
      .eq("trigger_key", triggerKey)
      .eq("enabled", true);
    if (error || !rules?.length) return { fired: 0 };

    let fired = 0;
    for (const rule of rules) {
      if (!matches(rule.conditions as Row, payload.attributes ?? {})) continue;

      // Resolve the recipient before anything else — a rule with nowhere to
      // send is logged as skipped rather than silently doing nothing.
      const to =
        rule.recipient === "custom" ? rule.custom_email
        : rule.recipient === "owner" ? payload.ownerEmail
        : payload.contactEmail;

      const log = async (status: string, detail: string, toAddr: string | null) => {
        await db.from("email_automation_runs").insert({
          automation_id: rule.id, trigger_key: triggerKey,
          opportunity_id: payload.opportunityId ?? null, contact_id: payload.contactId ?? null,
          lead_id: payload.leadId ?? null, to_addr: toAddr, status, detail,
        }).then(() => {}, () => {});
      };

      if (!to) { await log("skipped", "No recipient address on the record.", null); continue; }
      if (!rule.template_id) { await log("skipped", "No template selected.", to); continue; }

      // De-dupe: the same rule shouldn't re-send because a record crossed the
      // same stage twice in quick succession.
      const since = new Date(Date.now() - DEDUPE_WINDOW_MINUTES * 60_000).toISOString();
      const { data: recent } = await db
        .from("email_automation_runs")
        .select("id")
        .eq("automation_id", rule.id)
        .eq("status", "sent")
        .gte("created_at", since)
        .or(`opportunity_id.eq.${payload.opportunityId ?? "-"},contact_id.eq.${payload.contactId ?? "-"}`)
        .limit(1);
      if (recent?.length) { await log("skipped", `Already sent within ${DEDUPE_WINDOW_MINUTES} minutes.`, to); continue; }

      const { data: tpl } = await db
        .from("email_templates").select("subject, html_body, text_body").eq("id", rule.template_id).single();
      if (!tpl) { await log("skipped", "Template no longer exists.", to); continue; }

      const fields = payload.fields ?? {};
      const res = await sendNotificationEmail({
        to: [to],
        subject: applyMergeFields(tpl.subject ?? "", fields),
        html: applyMergeFields(tpl.html_body ?? "", fields),
        context: {
          opportunityId: payload.opportunityId ?? null,
          contactId: payload.contactId ?? null,
          leadId: payload.leadId ?? null,
          owner: payload.owner ?? null,
          actor: `Automation · ${rule.name}`,
        },
      });

      await log(res.ok ? "sent" : "failed", res.ok ? rule.name : "The provider rejected the message.", to);
      if (res.ok) {
        fired++;
        await db.from("email_automations")
          .update({ runs: (rule.runs as number ?? 0) + 1, last_run_at: new Date().toISOString() })
          .eq("id", rule.id).then(() => {}, () => {});
      }
    }
    return { fired };
  } catch {
    return { fired: 0 };
  }
}
