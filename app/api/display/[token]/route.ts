import { supabaseAdmin } from "@/lib/server/supabase";
import { DEFAULT_IMAGE_SECONDS, itemIsLive, type PlayerManifest } from "@/lib/displays/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HHMM = (d: Date) => d.toTimeString().slice(0, 5);

// GET /api/display/:token — what this screen should be playing right now.
//
// Authenticated by the device's own token, the same credential the audio agent
// uses, so a screen needs no session. Returns a flat, self-contained manifest:
// the player caches it and keeps running if the network drops.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return Response.json({ error: "Missing device token." }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: device } = await sb
    .from("devices").select("id, name, status").eq("device_token", token).single();
  if (!device) return Response.json({ error: "Unknown device." }, { status: 404 });

  const { data: deployments } = await sb
    .from("display_deployments")
    .select("id, loop_id, days, start_time, end_time, priority, version")
    .eq("device_id", device.id)
    .eq("enabled", true)
    .order("priority", { ascending: false });

  // Pick the highest-priority schedule whose daypart covers now. Falls through
  // to nothing rather than guessing, so an off-hours screen goes dark on purpose.
  const now = new Date();
  const weekday = now.getDay();
  const clock = HHMM(now);
  const active = (deployments ?? []).find((d) => {
    const days = Array.isArray(d.days) ? (d.days as number[]) : [0, 1, 2, 3, 4, 5, 6];
    if (!days.includes(weekday)) return false;
    const start = String(d.start_time).slice(0, 5);
    const end = String(d.end_time).slice(0, 5);
    // An end before the start means the window runs past midnight.
    return start <= end ? clock >= start && clock <= end : clock >= start || clock <= end;
  });

  const empty: PlayerManifest = {
    device: { id: device.id, name: device.name, orientation: "landscape" },
    loop: null,
    items: [],
    pollSeconds: 60,
  };
  if (!active?.loop_id) return Response.json(empty);

  const { data: loop } = await sb
    .from("display_loops").select("id, name, version, orientation").eq("id", active.loop_id).single();
  if (!loop) return Response.json(empty);

  const { data: items } = await sb
    .from("display_loop_items")
    .select("id, position, duration_sec, transition, starts_on, ends_on, enabled, media:display_media(*)")
    .eq("loop_id", loop.id)
    .order("position");

  type Row = {
    id: string; duration_sec: number; transition: string;
    starts_on: string | null; ends_on: string | null; enabled: boolean;
    media: {
      id: string; name: string; kind: string; url: string | null; duration_sec: number | null;
      source?: string | null; provider?: string | null; embed_url?: string | null;
    } | null;
  };

  const playable = ((items ?? []) as unknown as Row[])
    .filter((i) => i.media?.url && itemIsLive(i, now))
    .map((i) => ({
      id: i.id,
      kind: (i.media!.kind === "video" ? "video" : "image") as "video" | "image",
      url: i.media!.url as string,
      name: i.media!.name,
      // Video runs its own length unless the loop overrides it.
      durationSec: Number(i.duration_sec) || Number(i.media!.duration_sec) || DEFAULT_IMAGE_SECONDS,
      transition: (i.transition === "none" ? "none" : "fade") as "fade" | "none",
      // YouTube and Vimeo have to render in an iframe; everything else is native.
      embed: i.media!.source === "link" && i.media!.provider !== "direct" ? i.media!.embed_url : null,
    }));

  return Response.json({
    device: { id: device.id, name: device.name, orientation: loop.orientation === "portrait" ? "portrait" : "landscape" },
    loop: { id: loop.id, name: loop.name, version: loop.version },
    items: playable,
    pollSeconds: 60,
  } satisfies PlayerManifest);
}

// POST /api/display/:token — proof of play.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  if (!token || !body) return Response.json({ error: "Bad request." }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: device } = await sb.from("devices").select("id").eq("device_token", token).single();
  if (!device) return Response.json({ error: "Unknown device." }, { status: 404 });

  const plays = Array.isArray(body.plays) ? body.plays : [body];
  const rows = plays.slice(0, 200).map((p: Record<string, unknown>) => ({
    device_id: device.id,
    media_id: (p.mediaId as string) || null,
    loop_id: (p.loopId as string) || null,
    media_name: (p.name as string) || null,
    duration_sec: Number(p.durationSec) || null,
    played_at: p.playedAt ? new Date(String(p.playedAt)).toISOString() : new Date().toISOString(),
  }));

  await sb.from("display_playback").insert(rows).then(() => {}, () => {});
  await sb.from("devices").update({ last_heartbeat_at: new Date().toISOString() }).eq("id", device.id).then(() => {}, () => {});
  return Response.json({ ok: true, recorded: rows.length });
}
