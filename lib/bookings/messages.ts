// A2P 10DLC-friendly SMS templates for appointment booking. Every message
// identifies the business (Channel Cast) and includes opt-out language, per
// carrier/CTIA requirements. (Brand + campaign must still be registered in the
// Twilio console — see the Bookings setup notes.)
import { Booking, fmtTime } from "./types";

const BRAND_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://channelcast.io").split(",")[0].trim().replace(/\/$/, "");

export const manageUrl = (id: string) => `${BRAND_ORIGIN}/appointments/${id}`;

const dateLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// First message → carries the full opt-out + help disclosure.
export function confirmationSms(b: Booking): string {
  const who = b.firstName || "there";
  return `Channel Cast: Hi ${who}, your ${b.typeName} is requested for ${dateLabel(b.date)} at ${fmtTime(b.time)} AZ time. We'll confirm shortly. Manage your appointment: ${manageUrl(b.id)}\nMsg&data rates may apply. Reply STOP to opt out, HELP for help.`;
}

// 24-hour reminder.
export function reminderSms(b: Booking): string {
  return `Channel Cast reminder: your ${b.typeName} is tomorrow, ${dateLabel(b.date)} at ${fmtTime(b.time)} AZ time. Manage or reschedule: ${manageUrl(b.id)}\nReply STOP to opt out.`;
}

// Sent when an appointment is canceled.
export function canceledSms(b: Booking): string {
  return `Channel Cast: your ${b.typeName} on ${dateLabel(b.date)} at ${fmtTime(b.time)} has been canceled. Rebook anytime at ${BRAND_ORIGIN}/book\nReply STOP to opt out.`;
}
