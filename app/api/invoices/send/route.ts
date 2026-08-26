import { sendNotificationEmail } from "@/lib/server/email";
import { sendSms } from "@/lib/server/twilio";
import { invoiceEmailHtml, invoiceEmailSubject, invoiceSmsText } from "@/lib/ops/invoice-html";
import type { Invoice } from "@/lib/ops/invoices";

export const runtime = "nodejs";

type Body = {
  invoice?: Invoice;
  email?: { to?: string; subject?: string; message?: string };
  sms?: { to?: string; body?: string };
};

type ChannelResult = { ok: boolean; detail: string };

const origin = () =>
  (process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "https://os.channelcast.io")
    .split(",")[0].trim().replace(/\/$/, "");

// POST /api/invoices/send — email and/or text an invoice to the client.
// Each channel reports back independently: one failing never blocks the other,
// and the UI shows exactly which landed.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const inv = body?.invoice;
  if (!inv?.number) return Response.json({ error: "No invoice supplied." }, { status: 400 });
  if (!body?.email && !body?.sms) return Response.json({ error: "Pick email, SMS, or both." }, { status: 400 });

  const results: { email?: ChannelResult; sms?: ChannelResult } = {};

  if (body.email) {
    const to = (body.email.to || inv.billTo?.email || "").trim();
    if (!to) {
      results.email = { ok: false, detail: "No email address on this invoice." };
    } else {
      const res = await sendNotificationEmail({
        to: [to],
        subject: body.email.subject?.trim() || invoiceEmailSubject(inv),
        html: invoiceEmailHtml(inv, { origin: origin(), message: body.email.message?.trim() || undefined }),
        // Sends from the verified Channel Cast domain; replies go to whoever the
        // invoice bills as. Set EMAIL_FROM_INVOICES once that domain is verified.
        from: process.env.EMAIL_FROM_INVOICES || undefined,
        replyTo: inv.from?.email || undefined,
      });
      results.email = res.ok
        ? { ok: true, detail: `Emailed to ${to}` }
        : { ok: false, detail: res.skipped ? "Email is not configured (RESEND_API_KEY missing)." : `Resend rejected the message to ${to}.` };
    }
  }

  if (body.sms) {
    const to = (body.sms.to || inv.billTo?.phone || "").trim();
    if (!to) {
      results.sms = { ok: false, detail: "No mobile number on this invoice." };
    } else {
      const sid = await sendSms(to, body.sms.body?.trim() || invoiceSmsText(inv));
      results.sms = sid
        ? { ok: true, detail: `Texted to ${to}` }
        : { ok: false, detail: "Twilio didn't accept the message — check the number and TWILIO_* env vars." };
    }
  }

  const anyOk = Boolean(results.email?.ok || results.sms?.ok);
  return Response.json({ ok: anyOk, results }, { status: anyOk ? 200 : 502 });
}
