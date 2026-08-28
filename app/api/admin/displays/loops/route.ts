import { requireUser, AuthError } from "@/lib/server/require-user";
import { supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

const ITEM_SELECT = "id, loop_id, media_id, position, duration_sec, transition, starts_on, ends_on, enabled, media:display_media(*)";

// GET /api/admin/displays/loops — loops with their items and joined creative.
export async function GET() {
  const sb = supabaseAdmin();
  const { data: loops, error } = await sb
    .from("display_loops").select("*").eq("archived", false).order("updated_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = (loops ?? []).map((l) => l.id);
  const { data: items } = ids.length
    ? await sb.from("display_loop_items").select(ITEM_SELECT).in("loop_id", ids).order("position")
    : { data: [] as Record<string, unknown>[] };

  const byLoop = new Map<string, Record<string, unknown>[]>();
  for (const it of items ?? []) {
    const key = it.loop_id as string;
    if (!byLoop.has(key)) byLoop.set(key, []);
    byLoop.get(key)!.push(it);
  }
  return Response.json({ loops: (loops ?? []).map((l) => ({ ...l, items: byLoop.get(l.id) ?? [] })) });
}

// POST /api/admin/displays/loops — create or update a loop and replace its items.
//
// Items are replaced wholesale rather than diffed: a loop is a short ordered
// list, and a full replace can't leave the order half-applied.
export async function POST(request: Request) {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const b = await request.json().catch(() => null);
  const name = String(b?.name || "").trim();
  if (!name) return Response.json({ error: "A loop name is required." }, { status: 400 });

  const sb = supabaseAdmin();
  const row = {
    name,
    description: b?.description ?? null,
    orientation: b?.orientation === "portrait" ? "portrait" : "landscape",
    updated_at: new Date().toISOString(),
  };

  let loopId: string = b?.id;
  if (loopId) {
    // Bump the version so players know to re-fetch.
    const { data: current } = await sb.from("display_loops").select("version").eq("id", loopId).single();
    const { error } = await sb.from("display_loops")
      .update({ ...row, version: (current?.version ?? 1) + 1 }).eq("id", loopId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await sb.from("display_loop_items").delete().eq("loop_id", loopId);
  } else {
    const { data, error } = await sb.from("display_loops").insert(row).select("id").single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    loopId = data.id;
  }

  const items = Array.isArray(b?.items) ? b.items : [];
  if (items.length) {
    const rows = items.map((it: Record<string, unknown>, i: number) => ({
      loop_id: loopId,
      media_id: it.media_id,
      position: i,
      duration_sec: Number(it.duration_sec) || 10,
      transition: it.transition === "none" ? "none" : "fade",
      starts_on: it.starts_on || null,
      ends_on: it.ends_on || null,
      enabled: it.enabled !== false,
    }));
    const { error } = await sb.from("display_loop_items").insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  const { data: saved } = await sb.from("display_loops").select("*").eq("id", loopId).single();
  const { data: savedItems } = await sb.from("display_loop_items").select(ITEM_SELECT).eq("loop_id", loopId).order("position");
  return Response.json({ loop: { ...saved, items: savedItems ?? [] } });
}

// DELETE /api/admin/displays/loops?id=…
export async function DELETE(request: Request) {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required." }, { status: 400 });
  const { error } = await supabaseAdmin().from("display_loops").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deleted: true });
}
