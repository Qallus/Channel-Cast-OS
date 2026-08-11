import { randomUUID } from "node:crypto";

import { listRecords, upsertRecords } from "@/lib/server/crm-db";
import { notificationHtml, sendNotificationEmail } from "@/lib/server/email";
import type { EventPage } from "@/lib/bookings/types";

export const runtime = "nodejs";

// POST /api/events/rsvp { slug, name, email, phone } — register for a public event.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "");
  const email = String(body.email || "").slice(0, 200);
  const name = String(body.name || "").slice(0, 200);
  const phone = String(body.phone || "").slice(0, 60);
  if (!slug || !email) return Response.json({ error: "Email is required." }, { status: 400 });

  let event: EventPage | undefined;
  try {
    const rows = (await listRecords("event_pages")) as unknown as EventPage[];
    event = rows.find((e) => e.slug === slug && e.status === "published");
  } catch { /* store unavailable */ }
  if (!event) return Response.json({ error: "Event not found." }, { status: 404 });

  if (!event.rsvps.includes(email)) {
    event.rsvps = [...event.rsvps, email];
    try { await upsertRecords("event_pages", [event as unknown as { id: string }]); } catch { /* best-effort */ }
  }

  // Capture as a lead so the team can follow up / provision access.
  try {
    await upsertRecords("leads", [{
      id: randomUUID(), source: "website", kind: "booking", name, email, phone, company: "",
      subject: `RSVP: ${event.title}`, message: `Registered for ${event.title} on ${event.date}.`,
      status: "new", createdAt: new Date().toISOString(),
    }]);
  } catch { /* best-effort */ }

  try {
    await sendNotificationEmail({
      subject: `New RSVP: ${event.title} — ${name || email}`,
      replyTo: email || undefined,
      html: notificationHtml({
        eyebrow: "New event RSVP",
        heading: event.title,
        rows: [["Name", name], ["Email", email], ["Phone", phone], ["Event", event.title], ["Date", event.date]],
        footer: "Manage RSVPs in Bookings → Events.",
      }),
    });
  } catch { /* best-effort */ }

  return Response.json({ ok: true });
}
