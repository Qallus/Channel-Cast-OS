import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

// GET /agent.py — serves the device agent so installers can fetch it.
export async function GET() {
  const file = path.join(process.cwd(), "agent", "channelcast_agent.py");
  if (!fs.existsSync(file)) return new Response("agent not found", { status: 404 });
  return new Response(fs.readFileSync(file, "utf8"), {
    headers: { "Content-Type": "text/x-python; charset=utf-8", "Cache-Control": "no-store" },
  });
}
