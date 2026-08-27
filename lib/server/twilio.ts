import twilio from "twilio";

// Twilio server helpers. Communications activates when these env vars are set
// (reuse the CTRL+P account). No app auth yet — routes are single-admin.

export function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

export function twilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID as string, process.env.TWILIO_AUTH_TOKEN as string);
}

const split = (v: string | undefined) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);

/** All caller-ID numbers available for the "Dial out from" tabs. */
export function ownedNumbers(): string[] {
  const multi = split(process.env.TWILIO_PHONE_NUMBERS);
  if (multi.length) return multi;
  const single = process.env.TWILIO_PHONE_NUMBER || "";
  return single ? [single] : [];
}

/** Numbers allowed to send SMS. */
export function smsNumbers(): string[] {
  const multi = split(process.env.TWILIO_SMS_NUMBERS);
  if (multi.length) return multi;
  return ownedNumbers().slice(0, 1);
}

export const defaultNumber = () => process.env.TWILIO_PHONE_NUMBER || ownedNumbers()[0] || null;

// Best-effort outbound SMS from the default SMS number. Returns the SID or null.
// Logs to sms_messages when possible. Never throws (booking flow is unaffected).
export type SmsContext = {
  opportunityId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  accountId?: string | null;
  owner?: string | null;
  actor?: string | null;
};

export async function sendSms(to: string, body: string, ctx?: SmsContext): Promise<string | null> {
  if (!twilioConfigured()) return null;
  const from = smsNumbers()[0] || defaultNumber();
  const dest = (to || "").replace(/[^\d+]/g, "");
  if (!from || !dest) return null;
  try {
    const msg = await twilioClient().messages.create({ from, to: dest, body });
    try {
      const { supabaseAdmin } = await import("@/lib/server/supabase");
      await supabaseAdmin().from("sms_messages").insert({ sid: msg.sid, direction: "outbound", from_number: from, to_number: dest, body, status: msg.status });
    } catch { /* logging best-effort */ }
    // Mirror into the unified communications log so the message lands on the
    // related lead/opportunity timeline without anyone logging it by hand.
    try {
      const { recordCommunicationSafe } = await import("@/lib/server/communications");
      await recordCommunicationSafe({
        kind: "sms", direction: "outbound", externalId: msg.sid,
        from, to: dest, body, status: msg.status,
        opportunityId: ctx?.opportunityId, contactId: ctx?.contactId, leadId: ctx?.leadId,
        accountId: ctx?.accountId, owner: ctx?.owner, actor: ctx?.actor,
      });
    } catch { /* capture is best-effort */ }
    return msg.sid;
  } catch {
    return null;
  }
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
