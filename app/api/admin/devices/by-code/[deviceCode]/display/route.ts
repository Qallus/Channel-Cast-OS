import { requireUser, AuthError } from "@/lib/server/require-user";
import { supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const origin = () =>
  (process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "https://os.channelcast.io")
    .split(",")[0].trim().replace(/\/$/, "");

const HHMM = (d: Date) => d.toTimeString().slice(0, 5);

/** Does this daypart cover the moment? End before start means it runs past midnight. */
function covers(row: { days: unknown; start_time: string; end_time: string }, now: Date): boolean {
  const days = Array.isArray(row.days) ? (row.days as number[]) : [0, 1, 2, 3, 4, 5, 6];
  if (!days.includes(now.getDay())) return false;
  const start = String(row.start_time).slice(0, 5);
  const end = String(row.end_time).slice(0, 5);
  const clock = HHMM(now);
  return start <= end ? clock >= start && clock <= end : clock >= start || clock <= end;
}

// GET /api/admin/devices/by-code/:deviceCode/display
// The screen half of a device page: where to point it, what it's scheduled to
// run, and what it has actually put on the glass.
//
// Admin-only — the player URL embeds the device token, which is the screen's
// only credential.
export async function GET(_req: Request, { params }: { params: Promise<{ deviceCode: string }> }) {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const { deviceCode } = await params;
  const sb = supabaseAdmin();

  const { data: device } = await sb
    .from("devices")
    .select("id, name, device_code, device_token, type")
    .eq("device_code", decodeURIComponent(deviceCode))
    .single();
  if (!device) return Response.json({ error: "not found" }, { status: 404 });

  const { data: deployments } = await sb
    .from("display_deployments")
    .select("id, loop_id, days, start_time, end_time, priority, enabled")
    .eq("device_id", device.id)
    .order("priority", { ascending: false });

  const loopIds = [...new Set((deployments ?? []).map((d) => d.loop_id).filter(Boolean))] as string[];
  const { data: loops } = loopIds.length
    ? await sb.from("display_loops").select("id, name, orientation").in("id", loopIds)
    : { data: [] as { id: string; name: string; orientation: string }[] };
  const loopName = new Map((loops ?? []).map((l) => [l.id, l.name]));

  // Same rule the player itself applies, so the dashboard never claims a screen
  // is showing something the player would have skipped.
  const now = new Date();
  const active = (deployments ?? []).find((d) => d.enabled && d.loop_id && covers(d, now)) ?? null;

  const { data: plays } = await sb
    .from("display_playback")
    .select("id, media_name, loop_id, duration_sec, played_at")
    .eq("device_id", device.id)
    .order("played_at", { ascending: false })
    .limit(40);

  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { count: playsToday } = await sb
    .from("display_playback")
    .select("id", { count: "exact", head: true })
    .eq("device_id", device.id)
    .gte("played_at", since);

  let itemsInLoop = 0;
  if (active?.loop_id) {
    const { count } = await sb
      .from("display_loop_items")
      .select("id", { count: "exact", head: true })
      .eq("loop_id", active.loop_id)
      .eq("enabled", true);
    itemsInLoop = count ?? 0;
  }

  return Response.json({
    playerUrl: `${origin()}/display/${device.device_token}`,
    active: active
      ? { id: active.id, loopId: active.loop_id, loopName: loopName.get(active.loop_id as string) ?? null,
          startTime: String(active.start_time).slice(0, 5), endTime: String(active.end_time).slice(0, 5),
          days: active.days }
      : null,
    schedules: (deployments ?? []).map((d) => ({
      id: d.id, loopId: d.loop_id, loopName: d.loop_id ? loopName.get(d.loop_id) ?? null : null,
      days: d.days, startTime: String(d.start_time).slice(0, 5), endTime: String(d.end_time).slice(0, 5),
      priority: d.priority, enabled: d.enabled,
    })),
    plays: (plays ?? []).map((p) => ({
      id: p.id, name: p.media_name, durationSec: p.duration_sec, playedAt: p.played_at,
    })),
    stats: { recent: (plays ?? []).length, today: playsToday ?? 0, itemsInLoop },
  });
}
