import { genId, mutate, read, type StoredPlaylist } from "@/lib/server/store";

export const runtime = "nodejs";

// GET /api/admin/playlists → list
export async function GET() {
  return Response.json(read((db) => db.playlists));
}

// POST /api/admin/playlists  { name, trackIds[] } → playlist
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const playlist: StoredPlaylist = {
    id: genId(),
    name: String(body.name || "Untitled playlist"),
    trackIds: Array.isArray(body.trackIds) ? body.trackIds.map(String) : [],
    createdAt: new Date().toISOString(),
  };
  mutate((db) => db.playlists.push(playlist));
  return Response.json(playlist);
}
