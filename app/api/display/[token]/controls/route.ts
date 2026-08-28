import { supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/display/:token/controls — the screen's live control state.
//
// Deliberately separate from the manifest and deliberately tiny: the manifest
// is heavy and only changes when someone edits a loop, but the remote needs to
// land in seconds. The player polls this every few seconds and re-fetches the
// manifest only when the revision moves.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return Response.json({ error: "Missing device token." }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: device } = await sb
    .from("devices").select("id").eq("device_token", token).single();
  if (!device) return Response.json({ error: "Unknown device." }, { status: 404 });

  const { data } = await sb
    .from("display_controls")
    .select("power, muted, volume, subtitles, pinned_item, revision")
    .eq("device_id", device.id)
    .single();

  // No row yet means nobody has touched the remote — play normally, muted,
  // which is what a screen does out of the box.
  return Response.json({
    power: data?.power ?? "playing",
    muted: data?.muted ?? true,
    volume: Number(data?.volume ?? 0),
    subtitles: Boolean(data?.subtitles ?? false),
    pinnedItem: data?.pinned_item ?? null,
    revision: Number(data?.revision ?? 0),
  });
}
