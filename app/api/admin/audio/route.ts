import path from "node:path";

import { createAudio, listAudio } from "@/lib/server/db";

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

// GET /api/admin/audio → list
export async function GET() {
  return Response.json(await listAudio());
}

// POST /api/admin/audio  (multipart: file) → uploaded audio record
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }
  const ext = EXT[file.type] || path.extname(file.name).replace(".", "") || "mp3";
  const buffer = Buffer.from(await file.arrayBuffer());
  const record = await createAudio({ name: file.name || `audio.${ext}`, ext, mime: file.type || "audio/mpeg", buffer });
  return Response.json(record);
}
