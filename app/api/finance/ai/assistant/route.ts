// POST { messages: [{ role, content }] } → { reply, changed, tools }. The
// assistant can read and write the signed-in admin's books through tools;
// `changed` tells the page to reload.
import { financeUser } from "@/lib/server/finance-db";
import { FinanceAiError, financeAiConfigured, runAssistant, type ChatTurn } from "@/lib/server/finance-ai";
import { allowAgentAction } from "@/lib/server/agents/throttle";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const user = await financeUser();
  if (user instanceof Response) return user;
  return Response.json({ configured: financeAiConfigured() });
}

export async function POST(request: Request) {
  const user = await financeUser();
  if (user instanceof Response) return user;
  const gate = allowAgentAction(user.id);
  if (!gate.ok) return Response.json({ error: `Too many requests at once. Try again in ${gate.retryAfterSeconds}s.` }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { messages?: ChatTurn[] } | null;
  try {
    return Response.json(await runAssistant(body?.messages ?? [], user.id));
  } catch (err) {
    if (err instanceof FinanceAiError) return Response.json({ error: err.message }, { status: err.status });
    return Response.json({ error: "The assistant hit an error. Nothing further was changed." }, { status: 500 });
  }
}
