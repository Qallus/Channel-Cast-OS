// Outbound email via Resend. Sends FROM hello@channelcast.io to the team.
// No-op (skipped) when RESEND_API_KEY isn't set, so local/dev never breaks.

/** Record ids so the send lands on the right lead/opportunity timeline. */
export type CommContext = {
  opportunityId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  accountId?: string | null;
  owner?: string | null;
  actor?: string | null;
};

type SendArgs = { subject: string; html: string; replyTo?: string; to?: string[]; from?: string; context?: CommContext };

const DEFAULT_TO = "jw@channelcast.io,hello@channelcast.io,jwaters@qallus.co";

// Absolute origin for images in emails — clients can't resolve relative paths.
// SVG doesn't render in Gmail/Outlook, so email logos must be hosted PNGs.
const BRAND_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://channelcast.io").split(",")[0].trim().replace(/\/$/, "");

export async function sendNotificationEmail({ subject, html, replyTo, to, from: fromArg, context }: SendArgs): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };

  // `from` must sit on a domain verified in Resend, so callers can only override
  // it when one is configured — otherwise Resend rejects the send outright.
  const from = fromArg || process.env.EMAIL_FROM || "Channel Cast <hello@channelcast.io>";
  const recipients = (to && to.length ? to : (process.env.NOTIFY_EMAILS || DEFAULT_TO).split(",")).map((s) => s.trim()).filter(Boolean);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: recipients, subject, html, reply_to: replyTo || undefined }),
    });
    // Email was previously fire-and-forget, so nothing reached the activity
    // timeline. Log every send, linked when the caller knows the records.
    try {
      const { recordCommunicationSafe } = await import("@/lib/server/communications");
      const sent = await res.clone().json().catch(() => null);
      await recordCommunicationSafe({
        kind: "email",
        direction: "outbound",
        externalId: (sent as { id?: string } | null)?.id ?? null,
        from,
        to: recipients.join(", "),
        subject,
        body: html,
        status: res.ok ? "sent" : "failed",
        opportunityId: context?.opportunityId,
        contactId: context?.contactId,
        leadId: context?.leadId,
        accountId: context?.accountId,
        owner: context?.owner,
        actor: context?.actor,
      });
    } catch { /* capture is best-effort */ }
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

// Branded HTML for a notification / confirmation email.
export function notificationHtml(opts: { heading: string; eyebrow?: string; intro?: string; rows: [string, string | undefined][]; message?: string; footer?: string; cta?: { label: string; url: string } }): string {
  const rows = opts.rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#8a998a;font-size:13px;width:130px;vertical-align:top;">${k}</td><td style="padding:6px 0;color:#14241a;font-size:14px;font-weight:600;">${escapeHtml(String(v))}</td></tr>`)
    .join("");
  const intro = opts.intro ? `<p style="margin:0 0 14px;color:#14241a;font-size:14px;line-height:1.6;">${escapeHtml(opts.intro)}</p>` : "";
  const msg = opts.message
    ? `<div style="margin-top:14px;padding:12px 14px;background:#f7faf1;border:1px solid #dde5d3;border-radius:10px;color:#14241a;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(opts.message)}</div>`
    : "";
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 4px;"><tr><td style="border-radius:10px;background:#14241a;"><a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;padding:11px 20px;color:#c6ff00;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">${escapeHtml(opts.cta.label)} &rarr;</a></td></tr></table>`
    : "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:#f1f5ea;">
  <tr><td align="center" style="padding:28px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #dde5d3;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#14241a;padding:16px 26px;">
        <img src="${BRAND_ORIGIN}/logos/logo-email-white.png" alt="Channel Cast" width="30" height="30" style="display:inline-block;height:30px;width:30px;vertical-align:middle;border:0;" />
        <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:2px;vertical-align:middle;padding-left:10px;">CHANNEL CAST</span>
      </td></tr>
      <tr><td style="padding:26px;">
        ${opts.eyebrow ? `<p style="margin:0 0 4px;color:#3c6a1b;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">${escapeHtml(opts.eyebrow)}</p>` : ""}
        <h1 style="margin:0 0 14px;color:#14241a;font-size:20px;font-weight:800;">${escapeHtml(opts.heading)}</h1>
        ${intro}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        ${msg}
        ${cta}
        ${opts.footer ? `<p style="margin:16px 0 0;color:#8a998a;font-size:12px;">${escapeHtml(opts.footer)}</p>` : ""}
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
