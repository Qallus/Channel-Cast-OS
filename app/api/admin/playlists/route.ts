import { createPlaylist, listPlaylists } from "@/lib/server/db";

export const runtime = "nodejs";

// GET /api/admin/playlists → list
export async function GET() {
  return Response.json(await listPlaylists());
}

// POST /api/admin/playlists  { name, trackIds[] } → playlist
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const playlist = await createPlaylist(
    String(body.name || "Untitled playlist"),
    Array.isArray(body.trackIds) ? body.trackIds.map(String) : [],
  );
  return Response.json(playlist);
}
