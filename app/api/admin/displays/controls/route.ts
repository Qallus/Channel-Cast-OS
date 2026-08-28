import { requireUser, AuthError } from "@/lib/server/require-user";
import { supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const origin = () =>
  (process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "https://os.channelcast.io")
    .split(",")[0].trim().replace(/\/$/, "");

const DEFAULT_CONTROLS = {
  power: "playing" as const,
  muted: true,
  volume: 0,
  subtitles: false,
  pinned_item: null as string | null,
  open_days: [0, 1, 2, 3, 4, 5, 6],
  open_start: "08:00",
  open_end: "20:00",
  revision: 1,
};

// GET /api/admin/displays/controls — every screen, with its current control
// state and what it is playing. This is what the remote drives from, so it has
// to be answerable from a phone on cellular: one round trip, no fan-out.
export async function GET() {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const sb = supabaseAdmin();
  const { data: devices, error } = await sb
    .from("devices")
    .select("id, name, device_code, location_name, status, last_heartbeat_at, device_token")
    .eq("type", "digital_display")
    .order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = (devices ?? []).map((d) => d.id);
  if (!ids.length) return Response.json({ screens: [] });

  const [{ data: controls }, { data: deployments }, { data: loops }] = await Promise.all([
    sb.from("display_controls").select("*").in("device_id", ids),
    sb.from("display_deployments")
      .select("id, device_id, loop_id, days, start_time, end_time, priority, enabled")
      .in("device_id", ids)
      .order("priority", { ascending: false }),
    sb.from("display_loops").select("id, name, orientation"),
  ]);

  const byDevice = new Map<string, Record<string, unknown>>();
  for (const c of controls ?? []) byDevice.set(c.device_id as string, c as Record<string, unknown>);
  const loopName = new Map((loops ?? []).map((l) => [l.id, l.name]));

  const schedulesFor = (deviceId: string) =>
    (deployments ?? []).filter((d) => d.device_id === deviceId).map((d) => ({
      id: d.id,
      loopId: d.loop_id,
      loopName: d.loop_id ? loopName.get(d.loop_id) ?? null : null,
      days: d.days,
      startTime: String(d.start_time).slice(0, 5),
      endTime: String(d.end_time).slice(0, 5),
      priority: d.priority,
      enabled: d.enabled,
    }));

  return Response.json({
    screens: (devices ?? []).map((d) => {
      const c = (byDevice.get(d.id) ?? {}) as Record<string, unknown>;
      return {
        id: d.id,
        name: d.name,
        deviceCode: d.device_code,
        location: d.location_name,
        status: d.status,
        lastHeartbeatAt: d.last_heartbeat_at,
        playerUrl: `${origin()}/display/${d.device_token}`,
        controls: {
          power: (c.power as string) ?? DEFAULT_CONTROLS.power,
          muted: c.muted === undefined ? DEFAULT_CONTROLS.muted : Boolean(c.muted),
          volume: Number(c.volume ?? DEFAULT_CONTROLS.volume),
          subtitles: Boolean(c.subtitles ?? DEFAULT_CONTROLS.subtitles),
          pinnedItem: (c.pinned_item as string) ?? null,
          openDays: (c.open_days as number[]) ?? DEFAULT_CONTROLS.open_days,
          openStart: String(c.open_start ?? DEFAULT_CONTROLS.open_start).slice(0, 5),
          openEnd: String(c.open_end ?? DEFAULT_CONTROLS.open_end).slice(0, 5),
          revision: Number(c.revision ?? DEFAULT_CONTROLS.revision),
        },
        schedules: schedulesFor(d.id),
      };
    }),
  });
}

const NUM = (v: unknown, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)));

// PATCH /api/admin/displays/controls — change one screen's state.
//
// Every write bumps `revision`, which is the whole synchronisation story: the
// player compares revisions and only disturbs playback when something actually
// changed. Partial bodies are fine — send just the field you're changing.
export async function PATCH(request: Request) {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const body = await request.json().catch(() => null);
  const deviceId = String(body?.deviceId || "");
  if (!deviceId) return Response.json({ error: "deviceId is required." }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: device } = await sb
    .from("devices").select("id, type").eq("id", deviceId).single();
  if (!device) return Response.json({ error: "Screen not found." }, { status: 404 });
  if (device.type !== "digital_display") {
    return Response.json({ error: "That device is not a digital display." }, { status: 400 });
  }

  const { data: existing } = await sb
    .from("display_controls").select("*").eq("device_id", deviceId).single();

  const patch: Record<string, unknown> = {
    device_id: deviceId,
    revision: Number(existing?.revision ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };

  if (body.power !== undefined) {
    if (body.power !== "playing" && body.power !== "stopped") {
      return Response.json({ error: "power must be 'playing' or 'stopped'." }, { status: 400 });
    }
    patch.power = body.power;
  }
  if (body.muted !== undefined) patch.muted = Boolean(body.muted);
  if (body.subtitles !== undefined) patch.subtitles = Boolean(body.subtitles);
  if (body.volume !== undefined) {
    patch.volume = NUM(body.volume, 0, 100);
    // Any volume above zero implies sound on; the two would otherwise disagree.
    if (body.muted === undefined) patch.muted = Number(patch.volume) === 0;
  }
  if (body.pinnedItem !== undefined) patch.pinned_item = body.pinnedItem || null;
  if (body.openDays !== undefined) {
    const days = Array.isArray(body.openDays)
      ? [...new Set(body.openDays.map((d: unknown) => NUM(d, 0, 6)))]
      : [];
    if (!days.length) return Response.json({ error: "Pick at least one day." }, { status: 400 });
    patch.open_days = days;
  }
  if (body.openStart !== undefined) patch.open_start = String(body.openStart).slice(0, 5);
  if (body.openEnd !== undefined) patch.open_end = String(body.openEnd).slice(0, 5);

  const { data, error } = await sb
    .from("display_controls")
    .upsert(patch, { onConflict: "device_id" })
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ controls: data });
}
