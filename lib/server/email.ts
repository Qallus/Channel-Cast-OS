// Outbound email via Resend. Sends FROM hello@channelcast.io to the team.
// No-op (skipped) when RESEND_API_KEY isn't set, so local/dev never breaks.

type SendArgs = { subject: string; html: string; replyTo?: string; to?: string[] };

const DEFAULT_TO = "jw@channelcast.io,hello@channelcast.io,jwaters@qallus.co";

export async function sendNotificationEmail({ subject, html, replyTo, to }: SendArgs): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };

  const from = process.env.EMAIL_FROM || "Channel Cast <hello@channelcast.io>";
  const recipients = (to && to.length ? to : (process.env.NOTIFY_EMAILS || DEFAULT_TO).split(",")).map((s) => s.trim()).filter(Boolean);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: recipients, subject, html, reply_to: replyTo || undefined }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

// Branded HTML for an internal notification (new form/booking submission).
export function notificationHtml(opts: { heading: string; eyebrow?: string; rows: [string, string | undefined][]; message?: string; footer?: string }): string {
  const rows = opts.rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#8a998a;font-size:13px;width:130px;vertical-align:top;">${k}</td><td style="padding:6px 0;color:#14241a;font-size:14px;font-weight:600;">${escapeHtml(String(v))}</td></tr>`)
    .join("");
  const msg = opts.message
    ? `<div style="margin-top:14px;padding:12px 14px;background:#f7faf1;border:1px solid #dde5d3;border-radius:10px;color:#14241a;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(opts.message)}</div>`
    : "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:#f1f5ea;">
  <tr><td align="center" style="padding:28px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #dde5d3;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#14241a;padding:18px 26px;">
        <span style="display:inline-block;height:20px;width:20px;background:#c6ff00;border-radius:6px;vertical-align:middle;"></span>
        <span style="color:#ffffff;font-size:14px;font-weight:700;letter-spacing:2px;vertical-align:middle;padding-left:10px;">CHANNEL CAST</span>
      </td></tr>
      <tr><td style="padding:26px;">
        ${opts.eyebrow ? `<p style="margin:0 0 4px;color:#3c6a1b;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">${escapeHtml(opts.eyebrow)}</p>` : ""}
        <h1 style="margin:0 0 14px;color:#14241a;font-size:20px;font-weight:800;">${escapeHtml(opts.heading)}</h1>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        ${msg}
        ${opts.footer ? `<p style="margin:16px 0 0;color:#8a998a;font-size:12px;">${escapeHtml(opts.footer)}</p>` : ""}
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
