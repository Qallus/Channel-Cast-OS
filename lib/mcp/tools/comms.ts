import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getRecord, listRecords, upsertRecords } from "@/lib/server/crm-db";
import { phoneKey, recordCommunication, recordCommunicationSafe } from "@/lib/server/communications";
import { sendNotificationEmail } from "@/lib/server/email";
import { supabaseAdmin } from "@/lib/server/supabase";
import { defaultNumber, ownedNumbers, sendSms, smsNumbers, twilioClient, twilioConfigured } from "@/lib/server/twilio";
import { defineTool, ToolError, z, type ToolCtx } from "@/lib/mcp/define";

const E164 = /^\+[1-9]\d{7,14}$/;
const rid = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://channelcast.io").split(",")[0].trim().replace(/\/$/, "");

/** US-friendly: 10 digits become +1…; anything else must already be E.164. */
function toE164(v: string): string {
  const d = v.replace(/[^\d+]/g, "");
  const out = /^\d{10}$/.test(d) ? `+1${d}` : /^1\d{10}$/.test(d) ? `+${d}` : d;
  if (!E164.test(out)) throw new ToolError(`"${v}" isn't a valid phone number. Use E.164, e.g. +16025551234.`);
  return out;
}

const links = {
  contactId: z.string().optional().describe("CRM contact id to file this under."),
  dealId: z.string().optional().describe("CRM deal (opportunity) id."),
  leadId: z.string().optional().describe("CRM lead id."),
};

/** Mirror onto the contact's CRM activity timeline (what the Contacts page shows). */
async function addActivity(contactId: string | undefined, dealId: string | undefined, kind: string, body: string, actor: string) {
  if (!contactId && !dealId) return null;
  const id = `act_${rid()}`;
  await upsertRecords("activities", [{ id, contactId: contactId ?? null, dealId: dealId ?? null, kind, body, actor, createdAt: new Date().toISOString() }]);
  return id;
}

export function registerCommTools(server: McpServer, ctx: ToolCtx) {
  const actor = () => `Claude (${ctx.caller.email})`;

  defineTool(server, ctx, "comm_history", {
    title: "Search communications",
    description: "Calls, SMS, emails, AI voice calls, meetings and notes from the unified communications log, newest first. Filter by CRM record, phone number, email address or kind. `review: true` returns inbound events that couldn't be matched to a contact.",
    kind: "read",
    input: {
      ...links,
      phone: z.string().optional(),
      email: z.string().optional(),
      kinds: z.array(z.enum(["call", "sms", "email", "ai_voice", "voicemail", "meeting", "note", "task", "voice", "invoice", "payment", "contract"])).optional(),
      since: z.string().optional().describe("ISO date; only items on or after it."),
      review: z.boolean().optional(),
      includeTranscripts: z.boolean().optional().describe("Default false — transcripts can be long."),
      limit: z.number().int().min(1).max(200).optional(),
    },
  }, async ({ contactId, dealId, leadId, phone, email, kinds, since, review, includeTranscripts, limit = 30 }) => {
    let q = supabaseAdmin().from("communications")
      .select("id, kind, direction, external_id, opportunity_id, contact_id, lead_id, actor, association, from_addr, to_addr, subject, body, status, duration_seconds, recording_url, transcript, ai_summary, occurred_at")
      .order("occurred_at", { ascending: false }).limit(limit);
    const ors: string[] = [];
    if (contactId) ors.push(`contact_id.eq.${contactId}`);
    if (dealId) ors.push(`opportunity_id.eq.${dealId}`);
    if (leadId) ors.push(`lead_id.eq.${leadId}`);
    if (phone) {
      const k = phoneKey(phone).slice(-10);
      if (!k) throw new ToolError("That phone number has no digits.");
      ors.push(`from_addr.ilike.%${k}%`, `to_addr.ilike.%${k}%`);
    }
    if (email) {
      const e = email.trim().toLowerCase().replace(/[,()]/g, "");
      ors.push(`from_addr.ilike.%${e}%`, `to_addr.ilike.%${e}%`);
    }
    if (ors.length) q = q.or(ors.join(","));
    if (review) q = q.in("association", ["ambiguous", "unmatched"]);
    if (kinds?.length) q = q.in("kind", kinds);
    if (since) q = q.gte("occurred_at", since);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id, kind: r.kind, direction: r.direction, at: r.occurred_at, from: r.from_addr, to: r.to_addr,
      subject: r.subject, body: r.body, status: r.status, durationSeconds: r.duration_seconds,
      contactId: r.contact_id, dealId: r.opportunity_id, leadId: r.lead_id, association: r.association, actor: r.actor,
      summary: r.ai_summary, hasRecording: Boolean(r.recording_url),
      transcript: includeTranscripts ? r.transcript : r.transcript ? `(${String(r.transcript).length} chars — pass includeTranscripts)` : null,
    }));
  });

  defineTool(server, ctx, "phone_numbers", {
    title: "List Channel Cast phone numbers",
    description: "The business's Twilio numbers: which can send SMS, the default caller ID, and the AI voice agent (Nicole) number.",
    kind: "read",
    input: {},
  }, async () => ({
    configured: twilioConfigured(),
    voice: ownedNumbers(),
    sms: smsNumbers(),
    defaultCallerId: defaultNumber(),
    aiVoiceAgent: process.env.NICOLE_PHONE_NUMBER || null,
  }));

  defineTool(server, ctx, "sms_send", {
    title: "Send an SMS",
    description: "Text a phone number from the Channel Cast SMS number. It's logged to the communications timeline, linked to the CRM record you pass.",
    kind: "outbound",
    input: { to: z.string().describe("Phone number, E.164 preferred."), body: z.string().min(1).max(1600), ...links },
  }, async ({ to, body, contactId, dealId, leadId }) => {
    if (!twilioConfigured()) throw new ToolError("Twilio isn't configured on the server.");
    const dest = toE164(to);
    const sid = await sendSms(dest, body, { contactId, leadId, opportunityId: dealId, actor: actor() });
    if (!sid) throw new ToolError("Twilio didn't accept the message (check the number and the SMS sender).");
    await addActivity(contactId, dealId, "sms", `SMS to ${dest}: ${body}`, actor());
    return { sent: true, sid, to: dest };
  });

  defineTool(server, ctx, "email_send", {
    title: "Send an email",
    description: "Send an email through Resend from the Channel Cast address. Plain `body` is wrapped in the house style; pass `html` to send your own markup. Logged to the communications timeline.",
    kind: "outbound",
    input: {
      to: z.array(z.string().email()).min(1).max(20),
      subject: z.string().min(1),
      body: z.string().min(1).describe("Plain text; line breaks are kept."),
      html: z.string().optional(),
      replyTo: z.string().email().optional(),
      ...links,
    },
  }, async ({ to, subject, body, html, replyTo, contactId, dealId, leadId }) => {
    const res = await sendNotificationEmail({
      to, subject, replyTo,
      html: html || `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#14241a;white-space:pre-wrap">${escapeHtml(body)}</div>`,
      context: { contactId: contactId ?? null, opportunityId: dealId ?? null, leadId: leadId ?? null, actor: actor() },
    });
    if (!res.ok) throw new ToolError(res.skipped ? "Email isn't configured (RESEND_API_KEY missing)." : "Resend rejected the message.");
    await addActivity(contactId, dealId, "email", `Email to ${to.join(", ")}: ${subject}`, actor());
    return { sent: true, to, subject };
  });

  defineTool(server, ctx, "ai_call_place", {
    title: "Place an AI voice call",
    description: "Have the Channel Cast AI voice agent (Nicole, xAI) phone someone. The call is recorded and logged; the transcript arrives later via call sync.",
    kind: "outbound",
    input: { to: z.string(), ...links },
  }, async ({ to, contactId, dealId, leadId }) => {
    if (!twilioConfigured()) throw new ToolError("Twilio isn't configured on the server.");
    const dest = toE164(to);
    type VoiceCfg = { id: string; outboundEnabled?: boolean; fromNumber?: string };
    const cfg: Partial<VoiceCfg> = ((await listRecords("settings").catch(() => [])) as VoiceCfg[]).find((r) => r.id === "ai_voice_config") ?? {};
    if (cfg.outboundEnabled === false) throw new ToolError("Outbound AI calling is turned off in AI Voice settings.");
    const from = String(cfg.fromNumber || process.env.NICOLE_PHONE_NUMBER || defaultNumber() || "").replace(/[^\d+]/g, "");
    if (!from) throw new ToolError("No AI voice caller-ID number is configured.");
    const call = await twilioClient().calls.create({ to: dest, from, url: `${APP_ORIGIN}/api/webhooks/twilio/ai-voice`, record: true });
    await recordCommunicationSafe({
      kind: "ai_voice", direction: "outbound", externalId: call.sid, from, to: dest, status: call.status,
      recordingUrl: `/api/comm/recordings?callSid=${encodeURIComponent(call.sid)}`,
      contactId: contactId ?? null, opportunityId: dealId ?? null, leadId: leadId ?? null, actor: "xAI Voice Agent",
    });
    await addActivity(contactId, dealId, "call", `AI voice call placed to ${dest}`, actor());
    return { placed: true, sid: call.sid, status: call.status, to: dest, from };
  });

  defineTool(server, ctx, "comm_log", {
    title: "Log a note, call or task",
    description: "Record something that happened outside the system (a note, an in-person meeting, a call from a personal phone, a task) on the communications timeline and the contact's activity feed.",
    kind: "write",
    input: {
      kind: z.enum(["note", "call", "meeting", "task"]),
      body: z.string().min(1),
      subject: z.string().optional(),
      occurredAt: z.string().optional().describe("ISO datetime; default now."),
      ...links,
    },
  }, async ({ kind, body, subject, occurredAt, contactId, dealId, leadId }) => {
    const res = await recordCommunication({
      kind, body, subject: subject ?? null, actor: actor(), association: contactId || dealId || leadId ? "linked" : "unmatched",
      contactId: contactId ?? null, opportunityId: dealId ?? null, leadId: leadId ?? null, occurredAt: occurredAt ?? new Date().toISOString(),
    });
    if (!res.ok) throw new ToolError(res.error || "Couldn't save the entry.");
    const activityId = await addActivity(contactId, dealId, kind, subject ? `${subject}\n${body}` : body, actor());
    return { saved: true, communicationId: res.id, activityId };
  });

  defineTool(server, ctx, "meeting_notes_save", {
    title: "Save meeting / call notes (e.g. from Plaud)",
    description: "File a recorded meeting or call — typically one read from the Plaud connector — against a contact or deal: summary and transcript go on the communications timeline, a line goes on the contact's activity feed, and each action item becomes an open follow-up (when a contact is given). Read the recording from Plaud first, then call this.",
    kind: "write",
    input: {
      title: z.string().min(1),
      summary: z.string().min(1),
      transcript: z.string().optional(),
      recordedAt: z.string().optional().describe("ISO datetime the meeting happened."),
      durationMinutes: z.number().optional(),
      attendees: z.array(z.string()).optional(),
      actionItems: z.array(z.object({
        task: z.string(),
        dueAt: z.string().optional().describe("ISO datetime; default two business days out."),
        method: z.enum(["call", "sms", "email", "meeting", "other"]).optional(),
      })).optional(),
      source: z.string().optional().describe("Default \"plaud\"."),
      sourceId: z.string().optional().describe("The recording's id in the source app, to avoid filing it twice."),
      ...links,
    },
  }, async (a) => {
    if (a.contactId && !(await getRecord("contacts", a.contactId))) throw new ToolError(`No contact with id "${a.contactId}".`);
    const source = a.source || "plaud";
    if (a.sourceId) {
      const { data } = await supabaseAdmin().from("communications").select("id").eq("external_id", `${source}:${a.sourceId}`).limit(1);
      if (data?.length) throw new ToolError(`That recording is already filed (communication ${data[0].id}).`);
    }
    const at = a.recordedAt || new Date().toISOString();
    const res = await recordCommunication({
      kind: "meeting", direction: "outbound", subject: a.title, body: a.summary, transcript: a.transcript ?? null, aiSummary: a.summary,
      aiMeta: { source, attendees: a.attendees ?? [], actionItems: a.actionItems ?? [] },
      externalId: a.sourceId ? `${source}:${a.sourceId}` : null,
      durationSeconds: a.durationMinutes ? Math.round(a.durationMinutes * 60) : null,
      actor: actor(), association: a.contactId || a.dealId || a.leadId ? "linked" : "unmatched",
      contactId: a.contactId ?? null, opportunityId: a.dealId ?? null, leadId: a.leadId ?? null, occurredAt: at,
    });
    if (!res.ok) throw new ToolError(res.error || "Couldn't save the meeting.");
    const activityId = await addActivity(a.contactId, a.dealId, "meeting", `${a.title}\n${a.summary}`, actor());

    const followups: string[] = [];
    if (a.contactId && a.actionItems?.length) {
      const twoDays = new Date(Date.now() + 2 * 86400_000).toISOString();
      const now = new Date().toISOString();
      const recs = a.actionItems.map((it) => ({
        id: `fu_${rid()}`, contactId: a.contactId as string, dueAt: it.dueAt || twoDays, method: it.method || "other",
        subject: it.task, notes: `From meeting: ${a.title}`, remindChannel: "none", remindBeforeMinutes: 0, repeat: "none",
        status: "open" as const, completedAt: null, createdAt: now,
      }));
      await upsertRecords("followups", recs);
      followups.push(...recs.map((r) => r.id));
    }
    return { saved: true, communicationId: res.id, activityId, followups, note: a.contactId ? undefined : "No contact given, so action items weren't turned into follow-ups." };
  });
}
