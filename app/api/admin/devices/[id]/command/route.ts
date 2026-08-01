import { enqueueCommand, getDeviceById } from "@/lib/server/db";

export const runtime = "nodejs";

const ALLOWED = new Set(["set_volume", "test_play", "stop", "next", "set_motion"]);

// POST /api/admin/devices/:id/command
//   { type: "set_volume" | "test_play" | "stop" | "next" | "set_motion", payload }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const type = body?.type;
  if (!ALLOWED.has(type)) {
    return Response.json({ error: `type must be one of ${[...ALLOWED].join(", ")}` }, { status: 400 });
  }

  const device = await getDeviceById(id);
  if (!device) return Response.json({ error: "device not found" }, { status: 404 });

  const command = await enqueueCommand(id, type, body.payload ?? {});
  return Response.json({ ok: true, command });
}
