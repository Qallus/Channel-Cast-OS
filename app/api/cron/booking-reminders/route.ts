import { listRecords, upsertRecords } from "@/lib/server/crm-db";
import { sendSms } from "@/lib/server/twilio";
import { reminderSms } from "@/lib/bookings/messages";
import type { Booking } from "@/lib/bookings/types";

export const runtime = "nodejs";

// Tomorrow's date (YYYY-MM-DD) in Arizona time.
function tomorrowAZ(): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const t = new Date(`${today}T12:00:00`);
  t.setDate(t.getDate() + 1);
  return t.toISOString().slice(0, 10);
}

// GET|POST /api/cron/booking-reminders?token=CRON_SECRET
// Sends the 24-hour SMS reminder for tomorrow's appointments. Schedule this to
// run once a day (e.g. 9:00 AM AZ) from Coolify Scheduled Tasks or any cron.
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not set" }, { status: 500 });
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (token !== secret) return Response.json({ error: "unauthorized" }, { status: 401 });

  const target = tomorrowAZ();
  let rows: Booking[] = [];
  try { rows = (await listRecords("bookings")) as unknown as Booking[]; }
  catch { return Response.json({ error: "store unavailable" }, { status: 500 }); }

  const due = rows.filter((b) => b.date === target && (b.status === "pending" || b.status === "confirmed") && !b.reminded && b.smsConsent && b.phone);

  let sent = 0;
  for (const b of due) {
    const sid = await sendSms(b.phone, reminderSms(b));
    if (sid) {
      try { await upsertRecords("bookings", [{ ...b, reminded: true } as unknown as { id: string }]); sent++; } catch { /* keep going */ }
    }
  }
  return Response.json({ ok: true, date: target, matched: due.length, sent });
}

export const GET = run;
export const POST = run;
