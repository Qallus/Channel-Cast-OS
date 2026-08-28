import { randomUUID } from "node:crypto";

import { listRecords, upsertRecords } from "@/lib/server/crm-db";
import { notificationHtml, sendNotificationEmail } from "@/lib/server/email";
import { sendSms } from "@/lib/server/twilio";
import { confirmationSms, manageUrl } from "@/lib/bookings/messages";
import { APPOINTMENT_TYPES, DEFAULT_AVAILABILITY, fmtTime, slotsForDate, type AvailabilityRule, type Booking } from "@/lib/bookings/types";

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://channelcast.io").split(",")[0].trim().replace(/\/$/, "");

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
    reminded: false,
    // Records the booking came in with when it was raised from a CRM record, so
    // it lands on that opportunity's timeline rather than floating unattached.
    contactId: body.contactId ? s(body.contactId, 64) : null,
    opportunityId: body.opportunityId ? s(body.opportunityId, 64) : null,
    projectId: body.projectId ? s(body.projectId, 64) : null,
    assignedStaff: body.assignedStaff ? s(body.assignedStaff, 120) : null,
    source: body.source === "dashboard" ? "dashboard" : "website",
    createdAt: new Date().toISOString(),
  };
  if (!rec.date || !rec.time || !rec.email) {
    return Response.json({ error: "Date, time, and email are required." }, { status: 400 });
  }

  try { await upsertRecords("bookings", [rec as unknown as { id: string }]); }
  catch { /* best-effort — the visitor is still confirmed */ }

  // Mirror onto the unified activity timeline when it belongs to a record.
  if (rec.contactId || rec.opportunityId) {
    try {
      const { recordCommunicationSafe } = await import("@/lib/server/communications");
      await recordCommunicationSafe({
        kind: "meeting",
        direction: "outbound",
        externalId: rec.id,
        association: "linked",
        subject: rec.typeName,
        body: [rec.notes, `${rec.minutes} minutes · ${rec.location}`].filter(Boolean).join("\n\n"),
        status: rec.status,
        durationSeconds: rec.minutes * 60,
        to: rec.email || rec.phone || null,
        occurredAt: new Date(`${rec.date}T${rec.time || "00:00"}:00`),
        contactId: rec.contactId,
        opportunityId: rec.opportunityId,
        owner: rec.assignedStaff,
        actor: rec.assignedStaff,
      });
    } catch { /* capture is best-effort */ }
  }

  const detailRows: [string, string | undefined][] = [
    ["Appointment", rec.typeName],
    ["Date", new Date(`${rec.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })],
    ["Time", `${fmtTime(rec.time)} (Arizona time)`],
    ["Duration", `${rec.minutes} minutes`],
  ];

  // 1) Team notification → jw@ / hello@channelcast.io (+ NOTIFY_EMAILS).
  try {
    await sendNotificationEmail({
      subject: `New appointment request: ${rec.typeName} — ${rec.firstName} ${rec.lastName}`.trim(),
      replyTo: rec.email || undefined,
      html: notificationHtml({
        eyebrow: "New appointment request",
        heading: rec.typeName,
        rows: [
          ["Name", `${rec.firstName} ${rec.lastName}`.trim()],
          ["Email", rec.email], ["Phone", rec.phone], ["Company", rec.company], ["Project", rec.projectName],
          ...detailRows.slice(1),
        ],
        message: rec.notes || undefined,
        cta: { label: "Open in Bookings", url: `${APP_ORIGIN}/app/admin/bookings` },
        footer: "Confirm it in Bookings → Appointments.",
      }),
    });
  } catch { /* best-effort */ }

  // 2) Confirmation to the person who booked.
  if (rec.email) {
    try {
      await sendNotificationEmail({
        to: [rec.email],
        subject: `Your Channel Cast appointment request — ${rec.typeName}`,
        html: notificationHtml({
          eyebrow: "Appointment request received",
          heading: `Thanks, ${rec.firstName || "there"}!`,
          intro: `We've received your ${rec.typeName.toLowerCase()} request and our team will confirm it shortly. Here are the details:`,
          rows: detailRows,
          cta: { label: "Manage your appointment", url: manageUrl(rec.id) },
          footer: "Need to change something? Use the button above, or reply to this email.",
        }),
      });
    } catch { /* best-effort */ }
  }

  // 3) Confirmation SMS to the booker (only with consent + a number).
  if (rec.smsConsent && rec.phone) {
    await sendSms(rec.phone, confirmationSms(rec));
  }

  return Response.json({ ok: true, id: rec.id });
}
