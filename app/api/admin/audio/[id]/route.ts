import fs from "node:fs";
import path from "node:path";

import { AUDIO_DIRECTORY, mutate, read } from "@/lib/server/store";

export const runtime = "nodejs";

// PATCH /api/admin/audio/:id  { name?, archived? } — rename / archive.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const rec = mutate((db) => {
    const a = db.audio.find((x) => x.id === id);
    if (!a) return null;
    if (typeof body.name === "string" && body.name.trim()) a.name = body.name.trim();
    if (typeof body.archived === "boolean") a.archived = body.archived;
    return a;
  });

  if (!rec) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(rec);
}

// DELETE /api/admin/audio/:id — remove the record and its file.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = read((db) => db.audio.find((x) => x.id === id) ?? null);
  if (!rec) return Response.json({ error: "not found" }, { status: 404 });

  try {
    fs.unlinkSync(path.join(AUDIO_DIRECTORY, rec.filename));
  } catch {
    /* file already gone — ignore */
  }
  mutate((db) => {
    db.audio = db.audio.filter((x) => x.id !== id);
  });
  return Response.json({ ok: true });
}
