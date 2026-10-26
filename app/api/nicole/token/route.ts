// Mints a short-lived xAI ephemeral token so the browser can connect directly to
// the Nicole voice agent (wss://api.x.ai/v1/realtime) without ever seeing XAI_API_KEY.
// This replaces the self-hosted WebSocket relay — no separate service needed.

import { allowAgentAction } from "@/lib/server/agents/throttle";
import { publicOrigin } from "@/lib/server/invoice-share";

export const runtime = "nodejs";

// Public on purpose: the marketing site's Nicole voice widget calls this for
// anonymous visitors. Each token costs xAI minutes, so it is limited per client
// IP and refused for cross-site browser callers.
function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  // Behind Traefik the last hop it appends is the one it actually saw.
  const xff = (req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff[xff.length - 1] || "unknown";
}

function sameSite(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser callers; the per-IP limit still applies
  try {
    const o = new URL(origin).host;
    const allowed = new Set([new URL(publicOrigin()).host, req.headers.get("x-forwarded-host"), req.headers.get("host")].filter(Boolean));
    return allowed.has(o);
  } catch {
    return false;
  }
}

const AGENT_ID = process.env.XAI_AGENT_ID || "agent_HamskohGyCzAkXQc";

export async function POST(request: Request) {
  if (!sameSite(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const gate = allowAgentAction(`nicole:${clientIp(request)}`);
  if (!gate.ok) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } });
  }

  const key = process.env.XAI_API_KEY;
  if (!key) {
    return Response.json({ error: "voice_not_configured" }, { status: 501 });
  }

  let res: Response;
  try {
    res = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expires_after: { seconds: 300 } }),
    });
  } catch {
    return Response.json({ error: "xai_unreachable" }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return Response.json({ error: "token_mint_failed", status: res.status, detail: detail.slice(0, 500) }, { status: 502 });
  }

  const data = await res.json().catch(() => ({}));
  // Normalize the token value across possible response shapes.
  const token: string | undefined =
    data?.value || data?.client_secret?.value || (typeof data?.client_secret === "string" ? data.client_secret : undefined) || data?.secret;

  if (!token) {
    return Response.json({ error: "no_token_in_response" }, { status: 502 });
  }

  return Response.json({ token, agentId: AGENT_ID });
}
