// Nicole voice relay — bridges browser WebSocket clients to the xAI realtime
// voice API, keeping XAI_API_KEY server-side. Deploy as its own small service.
//
// xAI's realtime endpoint is OpenAI-Realtime-compatible: connect to
//   wss://api.x.ai/v1/realtime?model=<voice model>
// and configure the persona/voice with a `session.update` event. (There is no
// `agent_id` query param — the earlier build used one, which is why Nicole
// connected but never came through.)
//
// Env:
//   XAI_API_KEY         (required)  your xAI API key
//   XAI_VOICE_MODEL     (optional)  realtime model, defaults to grok-voice-latest
//   XAI_VOICE           (optional)  voice name, defaults to "ara"
//   NICOLE_INSTRUCTIONS (optional)  system persona for Nicole
//   ALLOWED_ORIGINS     (optional)  comma-separated; defaults to channelcast.io hosts
//   PORT                (optional)  defaults to 8787
//
// Run: XAI_API_KEY=xai-... node index.mjs   (npm i first)

import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.PORT) || 8787;
const KEY = process.env.XAI_API_KEY;
const MODEL = process.env.XAI_VOICE_MODEL || "grok-voice-latest";
const VOICE = process.env.XAI_VOICE || "ara";
const INSTRUCTIONS = process.env.NICOLE_INSTRUCTIONS ||
  "You are Nicole, the friendly voice of Channel Cast — a motion-based audio advertising network. " +
  "You're speaking live over audio, so keep replies warm, concise, and conversational. " +
  "Explain Channel Cast clearly: advertisers reach a present, real-world audience through audio ads triggered by actual foot traffic; " +
  "businesses and property owners can host devices and earn; partners and radio stations can build on the network. " +
  "If someone wants to move forward or asks for a human, invite them to share their name, email, and what they're interested in, " +
  "and let them know the team follows up quickly. Don't invent pricing or specifics you don't know.";

const ALLOWED = (process.env.ALLOWED_ORIGINS || "https://channelcast.io,https://www.channelcast.io,https://os.channelcast.io,http://localhost:3000,http://localhost:3100")
  .split(",").map((s) => s.trim()).filter(Boolean);

if (!KEY) { console.error("Missing XAI_API_KEY"); process.exit(1); }

const wss = new WebSocketServer({ port: PORT });
console.log(`Nicole relay listening on :${PORT} → model ${MODEL}, voice ${VOICE}`);

wss.on("connection", (client, req) => {
  const origin = req.headers.origin || "";
  if (ALLOWED.length && !ALLOWED.includes(origin)) {
    console.warn("Rejected origin:", origin);
    client.close(1008, "origin not allowed");
    return;
  }

  const upstream = new WebSocket(`wss://api.x.ai/v1/realtime?model=${encodeURIComponent(MODEL)}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });

  const queue = [];
  upstream.on("open", () => {
    // Set Nicole's persona + voice before any client audio or response flows.
    upstream.send(JSON.stringify({
      type: "session.update",
      session: { instructions: INSTRUCTIONS, voice: VOICE, modalities: ["audio", "text"] },
    }));
    queue.forEach((m) => upstream.send(m));
    queue.length = 0;
  });
  client.on("message", (m) => { if (upstream.readyState === WebSocket.OPEN) upstream.send(m); else queue.push(m); });
  upstream.on("message", (m) => { if (client.readyState === WebSocket.OPEN) client.send(typeof m === "string" ? m : m.toString()); });

  const shutdown = () => { try { client.close(); } catch {} try { upstream.close(); } catch {} };
  client.on("close", shutdown);
  upstream.on("close", (code, reason) => { if (code && code !== 1000) console.warn("upstream closed:", code, reason?.toString?.() || ""); shutdown(); });
  client.on("error", shutdown);
  upstream.on("error", (e) => { console.error("upstream error:", e.message); shutdown(); });
});
