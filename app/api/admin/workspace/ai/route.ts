import { wsActor, wsError } from "@/lib/workspace/route-helpers";

export const runtime = "nodejs";

const PROMPTS: Record<string, string> = {
  summarize: "Summarize the document below in a few clear sentences.",
  action_items: "Extract the action items and tasks from the document below as a concise bullet list (one per line). If there are none, reply 'No action items found.'",
  improve: "Improve the clarity, grammar, and flow of the text below without changing its meaning. Return only the revised text.",
  shorten: "Make the text below more concise while keeping the key points. Return only the shortened text.",
  expand: "Expand the text below with additional relevant detail and clear structure. Return only the expanded text.",
};

// Prefer OpenAI when configured; otherwise use xAI (Grok), which is OpenAI-compatible.
function provider(): { url: string; key: string; model: string } | null {
  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    const m = process.env.OPENAI_MODEL?.trim();
    return { url: "https://api.openai.com/v1/chat/completions", key: openai, model: m && !m.includes("your_") ? m : "gpt-4o" };
  }
  const xai = process.env.XAI_API_KEY;
  if (xai) return { url: "https://api.x.ai/v1/chat/completions", key: xai, model: process.env.XAI_MODEL?.trim() || "grok-2-latest" };
  return null;
}

export async function POST(request: Request) {
  try {
    await wsActor();
    const body = (await request.json().catch(() => ({}))) as { action?: string; prompt?: string; text?: string };
    const action = String(body.action ?? "summarize");
    const custom = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const text = String(body.text ?? "").slice(0, 14000);
    if (!custom && !text.trim()) return Response.json({ error: "There's no text to work with yet." }, { status: 400 });

    const p = provider();
    if (!p) return Response.json({ error: "AI isn't configured (set OPENAI_API_KEY or XAI_API_KEY)." }, { status: 503 });

    const instruction = custom || PROMPTS[action] || PROMPTS.summarize;
    const userContent = text.trim() ? `${instruction}\n\n--- Document ---\n${text}` : instruction;

    const res = await fetch(p.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: p.model,
        messages: [
          { role: "system", content: "You are a helpful AI assistant inside the Channel Cast Workspace document editor. Use the document below (when provided) as context and follow the user's instruction. Reply with clean, well-formatted content ready to drop into the document — no meta commentary unless asked." },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return Response.json({ error: `AI request failed (${res.status}). ${detail}`.slice(0, 300) }, { status: 502 });
    }
    const data = await res.json();
    const result = data?.choices?.[0]?.message?.content ?? "";
    return Response.json({ ok: true, result });
  } catch (error) {
    return wsError(error, "AI action failed.");
  }
}
