import { sendNotificationEmail } from "@/lib/server/email";
import { sendSms } from "@/lib/server/twilio";
import { invoiceEmailHtml, invoiceEmailSubject, invoiceSmsText } from "@/lib/ops/invoice-html";
import { ensureShareToken, shareUrl } from "@/lib/server/invoice-share";
import type { Invoice } from "@/lib/ops/invoices";

export const runtime = "nodejs";

type Body = {
  invoice?: Invoice;
  email?: { to?: string; subject?: string; message?: string };
  sms?: { to?: string; body?: string };
};

type ChannelResult = { ok: boolean; detail: string };

/**
 * Builds the From header as "Jeremy Waters <hello@channelcast.io>".
 *
 * The address has to stay on a Resend-verified domain, but the display name is
 * free — and without one, mail clients fall back to showing the address's local
 * part, so a bare `hello@channelcast.io` lands in the inbox as "hello". The name
 * comes off the invoice, so each one sends under whoever owns it.
 */
function fromHeader(inv: Invoice): string | undefined {
  if (process.env.EMAIL_FROM_INVOICES) return process.env.EMAIL_FROM_INVOICES;

  const configured = (process.env.EMAIL_FROM || "").trim();
  const address = configured.match(/<([^>]+)>/)?.[1]?.trim() || configured;
  if (!address.includes("@")) return undefined;

  // Invoice fields are user-authored, so strip anything that could forge a header.
  const name = (inv.owner || inv.from?.name || "").replace(/[\r\n]+/g, " ").replace(/["\\]/g, "").trim();
  if (!name) return undefined;

  // A display name containing RFC 5322 specials (a comma, most often) must be quoted.
  return /[,;:<>@[\]]/.test(name) ? `"${name}" <${address}>` : `${name} <${address}>`;
}

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

  // Mint (or reuse) the public link so both channels can point at the same page.
  // A saved invoice always gets one; an unsaved draft just goes without.
  let url: string | undefined;
  if (inv.id) {
    const shared = await ensureShareToken(inv.id);
    if (shared) url = shareUrl(shared.token);
  }

  const results: { email?: ChannelResult; sms?: ChannelResult } = {};

  if (body.email) {
    const to = (body.email.to || inv.billTo?.email || "").trim();
    if (!to) {
      results.email = { ok: false, detail: "No email address on this invoice." };
    } else {
      const res = await sendNotificationEmail({
        to: [to],
        subject: body.email.subject?.trim() || invoiceEmailSubject(inv),
        html: invoiceEmailHtml(inv, { origin: origin(), message: body.email.message?.trim() || undefined, url }),
        // Sends from the verified Channel Cast domain under the invoice owner's
        // name; replies go to whoever the invoice bills as.
        from: fromHeader(inv),
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
      const sid = await sendSms(to, body.sms.body?.trim() || invoiceSmsText(inv, url), { contactId: inv.contactId ?? null, owner: inv.owner ?? null, actor: inv.owner ?? null });
      results.sms = sid
        ? { ok: true, detail: `Texted to ${to}` }
        : { ok: false, detail: "Twilio didn't accept the message — check the number and TWILIO_* env vars." };
    }
  }

  const anyOk = Boolean(results.email?.ok || results.sms?.ok);
  return Response.json({ ok: anyOk, results, url }, { status: anyOk ? 200 : 502 });
}
