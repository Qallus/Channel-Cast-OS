// Mints a short-lived xAI ephemeral token so the browser can connect directly to
// the Nicole voice agent (wss://api.x.ai/v1/realtime) without ever seeing XAI_API_KEY.
// This replaces the self-hosted WebSocket relay — no separate service needed.

export const runtime = "nodejs";

const AGENT_ID = process.env.XAI_AGENT_ID || "agent_HamskohGyCzAkXQc";

export async function POST() {
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
