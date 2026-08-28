import { sendNotificationEmail } from "@/lib/server/email";
import { supabaseAdmin } from "@/lib/server/supabase";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const addresses = (v: unknown) =>
  String(v ?? "").split(/[,;]/).map((s) => s.trim()).filter((s) => s.includes("@"));

// POST /api/email/send — Email Studio composer.
//
// Sends through the same Resend path as the rest of the app, so every message
// also lands in the communications log. Logged separately in email_send_logs
// with the template id, which is what the History view and per-template send
// counts read.
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const to = addresses(b?.to);
  const cc = addresses(b?.cc);
  const bcc = addresses(b?.bcc);
  const subject = String(b?.subject || "").trim();
  const body = String(b?.body || "");

  if (!to.length) return jsonError("At least one valid recipient is required.");
  if (!subject) return jsonError("A subject is required.");
  if (!b?.html && !body.trim()) return jsonError("The message is empty.");

  const html = b?.html
    ? String(b.html)
    : `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#14241a;white-space:pre-wrap">${escapeHtml(body)}</div>`;

  const db = supabaseAdmin();
  let sent = 0;
  let firstError: string | null = null;

  // One send per recipient so a single bad address can't take down the batch,
  // and so each row in the log maps to exactly one person.
  for (const recipient of to) {
    const res = await sendNotificationEmail({
      to: [recipient, ...cc, ...bcc],
      subject,
      html,
      context: {
        opportunityId: b?.opportunityId ?? null,
        contactId: b?.contactId ?? null,
        leadId: b?.leadId ?? null,
        owner: b?.owner ?? null,
        actor: b?.owner ?? null,
      },
    });
    if (res.ok) sent++;
    else if (!firstError) firstError = res.skipped ? "Email isn't configured (RESEND_API_KEY missing)." : "The provider rejected the message.";

    await db.from("email_send_logs").insert({
      template_id: b?.templateId ?? null,
      to_addr: recipient,
      cc_addr: cc.join(", ") || null,
      bcc_addr: bcc.join(", ") || null,
      subject,
      status: res.ok ? "sent" : "failed",
      error: res.ok ? null : firstError,
      opportunity_id: b?.opportunityId ?? null,
      contact_id: b?.contactId ?? null,
      lead_id: b?.leadId ?? null,
      owner: b?.owner ?? null,
    }).then(() => {}, () => {});
  }

  if (b?.templateId && sent > 0) {
    // Keep the library's send count and last-sent honest.
    const { data } = await db.from("email_templates").select("sends").eq("id", b.templateId).single();
    await db.from("email_templates")
      .update({ sends: (data?.sends ?? 0) + sent, last_sent_at: new Date().toISOString() })
      .eq("id", b.templateId)
      .then(() => {}, () => {});
  }

  if (!sent) return jsonError(firstError || "Nothing was sent.", 502);
  return Response.json({ ok: true, sent, failed: to.length - sent });
}
