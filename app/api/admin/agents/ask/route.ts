// Ask Hermes one question. Conversation and short drafts live here; anything
// multi-step should become a Paperclip task instead.
import { requireUser, AuthError } from "@/lib/server/require-user";
import { AgentError } from "@/lib/server/agents/config";
import { hermesAsk } from "@/lib/server/agents/hermes";
import { allowAgentAction } from "@/lib/server/agents/throttle";

export const runtime = "nodejs";

const SYSTEM =
  "You are the Channel Cast assistant for the operators of the network. Channel Cast is a motion-based audio " +
  "advertising network: devices in physical spaces play targeted audio when their AI vision or motion sensor " +
  "detects someone nearby. Answer about clients, advertisers, campaigns, devices, bookings, leads and billing. " +
  "Be concise and practical. You have no access to the dashboard database in this conversation, so if a question " +
  "needs live records, say so plainly rather than guessing.";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
    if (!user.isAdmin) return Response.json({ error: "Admins only." }, { status: 403 });
  } catch (err) {
    const e = err as AuthError;
    return Response.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const gate = allowAgentAction(user.id);
  if (!gate.ok) {
    return Response.json(
      { error: `Too many requests at once. Try again in ${gate.retryAfterSeconds}s.` },
      { status: 429, headers: { "retry-after": String(gate.retryAfterSeconds) } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { prompt?: string };
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) return Response.json({ error: "Ask a question first." }, { status: 400 });
  if (prompt.length > 4000) return Response.json({ error: "That question is too long." }, { status: 400 });

  try {
    const reply = await hermesAsk({ system: SYSTEM, prompt });
    return Response.json({ reply });
  } catch (err) {
    if (err instanceof AgentError) return Response.json({ error: err.message }, { status: err.status });
    return Response.json({ error: "Hermes did not answer. Nothing was sent." }, { status: 502 });
  }
}
