import { requireUser, AuthError } from "@/lib/server/require-user";
import { supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

const origin = () =>
  (process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "https://os.channelcast.io")
    .split(",")[0].trim().replace(/\/$/, "");

// GET /api/admin/displays/deployments — screens, what each is scheduled to play,
// and the URL to point that screen at.
//
// The player URL embeds the device token, which *is* the screen's credential —
// there's no session on a kiosk. Admin-only for that reason.
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
  const { data: deployments } = ids.length
    ? await sb.from("display_deployments")
        .select("id, device_id, loop_id, days, start_time, end_time, priority, version, enabled")
        .in("device_id", ids)
        .order("priority", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const byDevice = new Map<string, Record<string, unknown>[]>();
  for (const d of deployments ?? []) {
    const key = d.device_id as string;
    if (!byDevice.has(key)) byDevice.set(key, []);
    byDevice.get(key)!.push(d);
  }

  return Response.json({
    screens: (devices ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      deviceCode: d.device_code,
      location: d.location_name,
      status: d.status,
      lastHeartbeatAt: d.last_heartbeat_at,
      playerUrl: `${origin()}/display/${d.device_token}`,
      schedules: byDevice.get(d.id) ?? [],
    })),
  });
}

// POST /api/admin/displays/deployments — create or update one schedule.
export async function POST(request: Request) {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const b = await request.json().catch(() => null);
  if (!b?.device_id) return Response.json({ error: "Pick a screen." }, { status: 400 });
  if (!b?.loop_id) return Response.json({ error: "Pick a loop." }, { status: 400 });

  const days = Array.isArray(b.days) ? b.days.filter((d: unknown) => Number.isInteger(d)) : [0, 1, 2, 3, 4, 5, 6];
  if (!days.length) return Response.json({ error: "Pick at least one day." }, { status: 400 });

  const row = {
    device_id: b.device_id,
    loop_id: b.loop_id,
    days,
    start_time: String(b.start_time || "00:00"),
    end_time: String(b.end_time || "23:59"),
    priority: Number(b.priority) || 0,
    enabled: b.enabled !== false,
    updated_at: new Date().toISOString(),
  };

  const sb = supabaseAdmin();
  const { data, error } = b?.id
    ? await sb.from("display_deployments").update(row).eq("id", b.id).select("*").single()
    : await sb.from("display_deployments").insert(row).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deployment: data });
}

// DELETE /api/admin/displays/deployments?id=…
export async function DELETE(request: Request) {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required." }, { status: 400 });
  const { error } = await supabaseAdmin().from("display_deployments").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deleted: true });
}
