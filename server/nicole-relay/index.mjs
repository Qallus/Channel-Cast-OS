// Nicole voice relay — bridges browser WebSocket clients to the xAI realtime
// agent, keeping XAI_API_KEY server-side. Deploy as its own small service.
//
// Env:
//   XAI_API_KEY       (required)  your xAI API key
//   XAI_AGENT_ID      (optional)  defaults to Nicole's agent
//   ALLOWED_ORIGINS   (optional)  comma-separated; defaults to channelcast.io hosts
//   PORT              (optional)  defaults to 8787
//
// Run: XAI_API_KEY=xai-... node index.mjs   (npm i first)

import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.PORT) || 8787;
const KEY = process.env.XAI_API_KEY;
const AGENT = process.env.XAI_AGENT_ID || "agent_HamskohGyCzAkXQc";
const ALLOWED = (process.env.ALLOWED_ORIGINS || "https://channelcast.io,https://www.channelcast.io,https://os.channelcast.io,http://localhost:3000,http://localhost:3100")
  .split(",").map((s) => s.trim()).filter(Boolean);

if (!KEY) { console.error("Missing XAI_API_KEY"); process.exit(1); }

const wss = new WebSocketServer({ port: PORT });
console.log(`Nicole relay listening on :${PORT} → agent ${AGENT}`);

wss.on("connection", (client, req) => {
  const origin = req.headers.origin || "";
  if (ALLOWED.length && !ALLOWED.includes(origin)) {
    console.warn("Rejected origin:", origin);
    client.close(1008, "origin not allowed");
    return;
  }

  const upstream = new WebSocket(`wss://api.x.ai/v1/realtime?agent_id=${AGENT}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });

  const queue = [];
  upstream.on("open", () => { queue.forEach((m) => upstream.send(m)); queue.length = 0; });
  client.on("message", (m) => { if (upstream.readyState === WebSocket.OPEN) upstream.send(m); else queue.push(m); });
  upstream.on("message", (m) => { if (client.readyState === WebSocket.OPEN) client.send(typeof m === "string" ? m : m.toString()); });

  const shutdown = () => { try { client.close(); } catch {} try { upstream.close(); } catch {} };
  client.on("close", shutdown);
  upstream.on("close", shutdown);
  client.on("error", shutdown);
  upstream.on("error", (e) => { console.error("upstream error:", e.message); shutdown(); });
});
