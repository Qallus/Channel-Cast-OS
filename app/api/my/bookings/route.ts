import { createClient } from "@/lib/supabase/server";
import { listRecords } from "@/lib/server/crm-db";
import type { Booking, EventPage } from "@/lib/bookings/types";

export const runtime = "nodejs";

// GET /api/my/bookings — the signed-in user's own appointments and event RSVPs,
// scoped by their authenticated email (never exposes anyone else's records).
export async function GET() {
  let email = "";
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    email = (data.user?.email || "").toLowerCase();
  } catch { /* not configured */ }

  if (!email) return Response.json({ appointments: [], events: [] });

  let appointments: Booking[] = [];
  let events: Pick<EventPage, "id" | "title" | "slug" | "date" | "startTime" | "endTime" | "status">[] = [];
  try {
    const rows = (await listRecords("bookings")) as unknown as Booking[];
    appointments = rows
      .filter((b) => (b.email || "").toLowerCase() === email)
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  } catch { /* store unavailable */ }
  try {
    const rows = (await listRecords("event_pages")) as unknown as EventPage[];
    events = rows
      .filter((e) => (e.rsvps || []).some((r) => r.toLowerCase() === email))
      .map((e) => ({ id: e.id, title: e.title, slug: e.slug, date: e.date, startTime: e.startTime, endTime: e.endTime, status: e.status }));
  } catch { /* store unavailable */ }

  return Response.json({ appointments, events });
}
