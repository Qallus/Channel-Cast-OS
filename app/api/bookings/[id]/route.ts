import { listRecords, upsertRecords } from "@/lib/server/crm-db";
import { notificationHtml, sendNotificationEmail } from "@/lib/server/email";
import { sendSms } from "@/lib/server/twilio";
import { canceledSms } from "@/lib/bookings/messages";
import { fmtTime, type Booking } from "@/lib/bookings/types";

export const runtime = "nodejs";

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://channelcast.io").split(",")[0].trim().replace(/\/$/, "");

async function findBooking(id: string): Promise<Booking | null> {
  try {
    const rows = (await listRecords("bookings")) as unknown as Booking[];
    return rows.find((b) => b.id === id) ?? null;
  } catch { return null; }
}

// GET /api/bookings/:id — safe view of a single booking for the manage page.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await findBooking(id);
  if (!b) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({
    id: b.id, typeName: b.typeName, minutes: b.minutes, date: b.date, time: b.time, status: b.status,
    firstName: b.firstName, lastName: b.lastName,
  });
}

// PATCH /api/bookings/:id  { action: "cancel" } — booker-initiated cancel.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const b = await findBooking(id);
  if (!b) return Response.json({ error: "not found" }, { status: 404 });

  if (body.action === "cancel") {
    if (b.status === "canceled") return Response.json({ ok: true, status: "canceled" });
    const updated: Booking = { ...b, status: "canceled" };
    try { await upsertRecords("bookings", [updated as unknown as { id: string }]); } catch { /* best-effort */ }
    if (b.smsConsent && b.phone) await sendSms(b.phone, canceledSms(b));
    try {
      await sendNotificationEmail({
        subject: `Appointment canceled: ${b.typeName} — ${b.firstName} ${b.lastName}`.trim(),
        html: notificationHtml({
          eyebrow: "Appointment canceled",
          heading: b.typeName,
          rows: [["Name", `${b.firstName} ${b.lastName}`.trim()], ["Email", b.email], ["Date", b.date], ["Time", fmtTime(b.time)]],
          cta: { label: "Open in Bookings", url: `${APP_ORIGIN}/app/admin/bookings` },
        }),
      });
    } catch { /* best-effort */ }
    return Response.json({ ok: true, status: "canceled" });
  }
  return Response.json({ error: "unknown action" }, { status: 400 });
}
