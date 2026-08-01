import path from "node:path";

import { createAudio, createPlaylist, getDeployment, getDeviceById, getPlaylist, listAudio, upsertDeployment } from "@/lib/server/db";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav",
  "audio/vnd.wave": "wav", "audio/ogg": "ogg", "audio/flac": "flac", "audio/x-flac": "flac",
  "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/webm": "webm",
};

// Append an audio id to the device's playlist and (re)deploy it.
async function attachToDevice(deviceId: string, deviceName: string, audioId: string) {
  const dep = await getDeployment(deviceId);
  let trackIds: string[] = [];
  if (dep?.playlistId) {
    const pl = await getPlaylist(dep.playlistId);
    trackIds = pl?.trackIds ?? [];
  }
  if (!trackIds.includes(audioId)) trackIds = [...trackIds, audioId];
  const playlist = await createPlaylist(`${deviceName} - Spots`, trackIds);
  await upsertDeployment({ deviceId, playlistId: playlist.id, cooldownSec: dep?.cooldownSec ?? 8 });
  return trackIds.length;
}

// POST /api/admin/devices/:id/audio
//  - JSON  { audioId }         → assign an existing library spot to this device
//  - multipart { file }        → upload a new spot and assign it
// Either way it's added to the device's playlist so it plays on schedule/motion.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = await getDeviceById(id);
  if (!device) return Response.json({ error: "device not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") || "";

  // Assign an existing library spot.
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    if (!body?.audioId) return Response.json({ error: "audioId is required" }, { status: 400 });
    const found = (await listAudio()).find((a) => a.id === body.audioId);
    if (!found) return Response.json({ error: "audio not found" }, { status: 404 });
    const trackCount = await attachToDevice(id, device.name, found.id);
    return Response.json({ audio: { id: found.id, name: found.name }, trackCount });
  }

  // Upload a new spot. Be lenient on format — fall back to the file extension.
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) return Response.json({ error: "file is required" }, { status: 400 });
  const ext = EXT[file.type] || path.extname(file.name).replace(".", "").toLowerCase() || "mp3";
  const buffer = Buffer.from(await file.arrayBuffer());
  const audio = await createAudio({ name: file.name || `spot.${ext}`, ext, mime: file.type || `audio/${ext}`, buffer });
  const trackCount = await attachToDevice(id, device.name, audio.id);
  return Response.json({ audio: { id: audio.id, name: audio.name }, trackCount });
}

// DELETE /api/admin/devices/:id/audio  { audioId }
// Removes a spot from THIS device's playlist (keeps it in the library).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = await getDeviceById(id);
  if (!device) return Response.json({ error: "device not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!body?.audioId) return Response.json({ error: "audioId is required" }, { status: 400 });

  const dep = await getDeployment(id);
  if (!dep?.playlistId) return Response.json({ trackCount: 0 });
  const pl = await getPlaylist(dep.playlistId);
  const trackIds = (pl?.trackIds ?? []).filter((t) => t !== body.audioId);
  const playlist = await createPlaylist(`${device.name} - Spots`, trackIds);
  await upsertDeployment({ deviceId: id, playlistId: playlist.id, cooldownSec: dep.cooldownSec });
  return Response.json({ trackCount: trackIds.length });
}
