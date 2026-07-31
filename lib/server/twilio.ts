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

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
