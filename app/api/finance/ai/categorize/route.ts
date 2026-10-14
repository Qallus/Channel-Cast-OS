// POST { items: [{ id, description, amount, direction, vendor? }] } → suggested
// categories. The caller decides what to apply; nothing is saved here.
import { financeUser, getProfile } from "@/lib/server/finance-db";
import { FinanceAiError, categorize, type CategorizeItem } from "@/lib/server/finance-ai";
import { allowAgentAction } from "@/lib/server/agents/throttle";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const user = await financeUser();
  if (user instanceof Response) return user;
  const gate = allowAgentAction(user.id);
  if (!gate.ok) return Response.json({ error: `Too many requests at once. Try again in ${gate.retryAfterSeconds}s.` }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { items?: CategorizeItem[] } | null;
  const items = (body?.items ?? [])
    .filter((i) => i && typeof i.id === "string" && typeof i.description === "string")
    .slice(0, 250)
    .map((i) => ({ id: i.id, description: i.description.slice(0, 200), amount: Number(i.amount) || 0, direction: i.direction === "in" ? "in" as const : "out" as const, vendor: i.vendor?.slice(0, 80) }));
  if (!items.length) return Response.json({ error: "Nothing to categorize." }, { status: 400 });
  try {
    const profile = await getProfile(user.id);
    return Response.json({ results: await categorize(items, profile) });
  } catch (err) {
    if (err instanceof FinanceAiError) return Response.json({ error: err.message }, { status: err.status });
    return Response.json({ error: "Categorizing failed." }, { status: 500 });
  }
}
