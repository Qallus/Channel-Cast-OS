export const runtime = "nodejs";

const SYSTEM =
  "You are the Channel Cast assistant — an operator's copilot for a motion-based audio advertising network. " +
  "Help with clients, advertisers, campaigns, devices, calls/SMS, billing, and navigating the dashboard. " +
  "Be concise and practical.";

type Msg = { role: "user" | "assistant"; content: string };

// POST /api/agent/chat { messages } → { reply }. Prefers Claude, falls back to OpenAI.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { messages?: Msg[] } | null;
  const messages = (body?.messages || []).filter((m) => m?.content?.trim());
  if (!messages.length) return Response.json({ error: "No message." }, { status: 400 });

  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  try {
    if (anthropic) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1024, system: SYSTEM, messages }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data?.error?.message || "Claude request failed." }, { status: 502 });
      const reply = (data.content || []).map((b: { text?: string }) => b.text || "").join("").trim();
      return Response.json({ reply, model: "claude-sonnet-5" });
    }

    if (openai) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${openai}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: SYSTEM }, ...messages] }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: data?.error?.message || "OpenAI request failed." }, { status: 502 });
      return Response.json({ reply: data.choices?.[0]?.message?.content?.trim() || "", model: "gpt-4o-mini" });
    }

    return Response.json({ error: "No AI key configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY." }, { status: 501 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Agent error." }, { status: 500 });
  }
}
