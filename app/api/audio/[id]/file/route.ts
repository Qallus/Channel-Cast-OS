import fs from "node:fs";
import path from "node:path";

import { AUDIO_DIRECTORY, read } from "@/lib/server/store";

export const runtime = "nodejs";

// GET /api/audio/:id/file — streams the cached audio with HTTP Range support so
// browsers can play, seek, and read duration (and devices can download it).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audio = read((db) => db.audio.find((a) => a.id === id) ?? null);
  if (!audio) return new Response("not found", { status: 404 });

  const filePath = path.join(AUDIO_DIRECTORY, audio.filename);
  if (!fs.existsSync(filePath)) return new Response("file missing", { status: 404 });

  const data = fs.readFileSync(filePath);
  const total = data.length;
  const mime = audio.mime || "application/octet-stream";
  const range = req.headers.get("range");

  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    const start = match ? parseInt(match[1], 10) : 0;
    const end = match && match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
    if (start >= total || start > end) {
      return new Response("range not satisfiable", { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    }
    const chunk = data.subarray(start, end + 1);
    return new Response(chunk, {
      status: 206,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(data, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}
