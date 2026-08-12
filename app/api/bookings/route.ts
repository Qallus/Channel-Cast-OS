import { randomUUID } from "node:crypto";

import { listRecords, upsertRecords } from "@/lib/server/crm-db";
import { notificationHtml, sendNotificationEmail } from "@/lib/server/email";
import { APPOINTMENT_TYPES, DEFAULT_AVAILABILITY, fmtTime, slotsForDate, type AvailabilityRule, type Booking } from "@/lib/bookings/types";

export const runtime = "nodejs";

// The saved weekly availability rules (Bookings → Availability), or defaults.
async function loadAvailability(): Promise<AvailabilityRule[]> {
  try {
    const rows = (await listRecords("settings")) as unknown as { id: string; rules?: AvailabilityRule[] }[];
    const rec = rows.find((r) => r.id === "booking_availability");
    if (rec?.rules?.length) return rec.rules;
  } catch { /* fall through */ }
  return DEFAULT_AVAILABILITY;
}

// GET /api/bookings?date=YYYY-MM-DD&type=<id> → open time slots for the public wizard.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || "";
  const typeId = url.searchParams.get("type") || "";
  const type = APPOINTMENT_TYPES.find((t) => t.id === typeId) || APPOINTMENT_TYPES[0];
  let taken: string[] = [];
  try {
    const rows = (await listRecords("bookings")) as unknown as Booking[];
    taken = rows.filter((b) => b.date === date && b.status !== "canceled").map((b) => b.time);
  } catch { /* store unavailable — offer all slots */ }
  const rules = await loadAvailability();
  const slots = slotsForDate(date, type.minutes, taken, rules).map((t) => ({ value: t, label: fmtTime(t) }));
  return Response.json({ slots });
}

// POST /api/bookings — create an appointment request from the public site.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const type = APPOINTMENT_TYPES.find((t) => t.id === body.typeId) || APPOINTMENT_TYPES[0];
  const s = (v: unknown, n = 200) => String(v || "").slice(0, n);

  const rec: Booking = {
    id: randomUUID(),
    typeId: type.id,
    typeName: type.name,
    minutes: type.minutes,
    date: s(body.date, 10),
    time: s(body.time, 5),
    status: "pending",
    firstName: s(body.firstName, 100),
    lastName: s(body.lastName, 100),
    email: s(body.email),
    phone: s(body.phone, 60),
    company: s(body.company),
    projectName: s(body.projectName),
    notes: s(body.notes, 4000),
    smsConsent: Boolean(body.smsConsent),
    location: s(body.location, 40) || "remote",
    clientVisible: true,
    showOnTimeline: false,
    source: "website",
    createdAt: new Date().toISOString(),
  };
  if (!rec.date || !rec.time || !rec.email) {
    return Response.json({ error: "Date, time, and email are required." }, { status: 400 });
  }

  try { await upsertRecords("bookings", [rec as unknown as { id: string }]); }
  catch { /* best-effort — the visitor is still confirmed */ }

  try {
    await sendNotificationEmail({
      subject: `New appointment request: ${rec.typeName} — ${rec.firstName} ${rec.lastName}`.trim(),
      replyTo: rec.email || undefined,
      html: notificationHtml({
        eyebrow: "New appointment request",
        heading: rec.typeName,
        rows: [
          ["Name", `${rec.firstName} ${rec.lastName}`.trim()],
          ["Email", rec.email],
          ["Phone", rec.phone],
          ["Company", rec.company],
          ["Project", rec.projectName],
          ["Date", rec.date],
          ["Time", fmtTime(rec.time)],
          ["Duration", `${rec.minutes} minutes`],
        ],
        message: rec.notes || undefined,
        footer: "Confirm it in Bookings → Appointments.",
      }),
    });
  } catch { /* email is best-effort */ }

  return Response.json({ ok: true, id: rec.id });
}
