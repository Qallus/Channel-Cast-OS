export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ok: true, service: "channel-cast", time: new Date().toISOString() });
}
