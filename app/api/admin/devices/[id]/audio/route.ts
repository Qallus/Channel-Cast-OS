import path from "node:path";

import { createAudio, createPlaylist, getDeployment, getDeviceById, getPlaylist, upsertDeployment } from "@/lib/server/db";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav",
  "audio/ogg": "ogg", "audio/flac": "flac", "audio/mp4": "m4a", "audio/aac": "aac",
};

// POST /api/admin/devices/:id/audio  (multipart: file)
// Uploads a spot and adds it to THIS device's playlist (creating a deployment if
// needed) so it plays on the device's schedule/motion trigger.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = await getDeviceById(id);
  if (!device) return Response.json({ error: "device not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) return Response.json({ error: "file is required" }, { status: 400 });

  const ext = EXT[file.type] || path.extname(file.name).replace(".", "") || "mp3";
  const buffer = Buffer.from(await file.arrayBuffer());
  const audio = await createAudio({ name: file.name || `spot.${ext}`, ext, mime: file.type || "audio/mpeg", buffer });

  // Append to the device's current playlist (or start one) and (re)deploy it.
  const dep = await getDeployment(id);
  let trackIds: string[] = [];
  if (dep?.playlistId) {
    const pl = await getPlaylist(dep.playlistId);
    trackIds = pl?.trackIds ?? [];
  }
  trackIds = [...trackIds, audio.id];
  const playlist = await createPlaylist(`${device.name} - Spots`, trackIds);
  await upsertDeployment({ deviceId: id, playlistId: playlist.id, cooldownSec: dep?.cooldownSec ?? 8 });

  return Response.json({ audio: { id: audio.id, name: audio.name }, trackCount: trackIds.length });
}
