import { sendNotificationEmail } from "@/lib/server/email";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// POST /api/comm/email { to, subject, body, html?, opportunityId?, contactId?, leadId?, owner? }
//
// Outbound email from a record view. sendNotificationEmail writes the row into
// the communications log, so the message lands on the right timeline without
// anyone logging it by hand.
export async function POST(request: Request) {
  const p = await request.json().catch(() => null);
  const to = String(p?.to || "").trim();
  const subject = String(p?.subject || "").trim();
  const body = String(p?.body || "").trim();
  if (!to.includes("@")) return jsonError("A valid recipient email is required.");
  if (!subject) return jsonError("A subject is required.");
  if (!body) return jsonError("The message is empty.");

  // Templates may already carry HTML; plain typing is wrapped so line breaks survive.
  const html = p?.html
    ? String(p.html)
    : `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#14241a;white-space:pre-wrap">${escapeHtml(body)}</div>`;

  const res = await sendNotificationEmail({
    to: [to],
    subject,
    html,
    replyTo: p?.replyTo || undefined,
    context: {
      opportunityId: p?.opportunityId ?? null,
      contactId: p?.contactId ?? null,
      leadId: p?.leadId ?? null,
      owner: p?.owner ?? null,
      actor: p?.actor ?? p?.owner ?? null,
    },
  });

  if (!res.ok) {
    return jsonError(res.skipped ? "Email isn't configured (RESEND_API_KEY missing)." : "The provider rejected the message.", 502);
  }
  return Response.json({ ok: true });
}
