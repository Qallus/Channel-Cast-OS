import fs from "node:fs";
import path from "node:path";

import { AUDIO_DIRECTORY, genId, mutate, read, type StoredAudio } from "@/lib/server/store";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
};

// GET /api/admin/audio  → list
export async function GET() {
  return Response.json(read((db) => db.audio));
}

// POST /api/admin/audio  (multipart: file) → uploaded audio record
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }

  const id = genId();
  const ext = EXT[file.type] || path.extname(file.name).replace(".", "") || "mp3";
  const filename = `${id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(AUDIO_DIRECTORY, filename), buffer);

  const record: StoredAudio = {
    id,
    name: file.name || filename,
    filename,
    mime: file.type || "audio/mpeg",
    sizeBytes: buffer.length,
    createdAt: new Date().toISOString(),
  };
  mutate((db) => db.audio.push(record));
  return Response.json(record);
}
