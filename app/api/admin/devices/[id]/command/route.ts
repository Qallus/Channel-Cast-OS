import { genId, mutate } from "@/lib/server/store";

export const runtime = "nodejs";

// POST /api/admin/devices/:id/command
// { type: "set_volume" | "test_play", payload }
// Enqueues a command the device picks up on its next heartbeat.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const type = body?.type;
  if (type !== "set_volume" && type !== "test_play") {
    return Response.json({ error: "type must be set_volume or test_play" }, { status: 400 });
  }

  const result = mutate((db) => {
    const device = db.devices.find((d) => d.id === id);
    if (!device) return { error: "device not found" as const };

    // For set_volume, also persist the intended volume on the device record.
    if (type === "set_volume" && typeof body.payload?.volume === "number") {
      device.volume = Math.max(0, Math.min(100, Math.round(body.payload.volume)));
    }
    // Collapse duplicate pending set_volume commands so we don't queue a flood.
    if (type === "set_volume") {
      db.commands = db.commands.filter((c) => !(c.deviceId === id && c.type === "set_volume"));
    }

    const command = { id: genId(), deviceId: id, type, payload: body.payload ?? {}, createdAt: new Date().toISOString() };
    db.commands.push(command);
    return { ok: true, command };
  });

  if ("error" in result) return Response.json(result, { status: 404 });
  return Response.json(result);
}
