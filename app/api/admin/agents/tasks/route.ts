// Paperclip tasks: list recent work, or hand a job to the agent team.
import { requireUser, AuthError } from "@/lib/server/require-user";
import { AgentError } from "@/lib/server/agents/config";
import { createTask, listTasks, type TaskPriority } from "@/lib/server/agents/paperclip";
import { allowAgentAction } from "@/lib/server/agents/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIORITIES: TaskPriority[] = ["critical", "high", "medium", "low"];

async function guard() {
  const user = await requireUser();
  if (!user.isAdmin) throw new AuthError("Admins only.", 403);
  return user;
}

export async function GET() {
  try {
    await guard();
  } catch (err) {
    const e = err as AuthError;
    return Response.json({ error: e.message }, { status: e.status ?? 401 });
  }

  try {
    return Response.json({ tasks: await listTasks(25) });
  } catch (err) {
    if (err instanceof AgentError) return Response.json({ error: err.message, tasks: [] }, { status: err.status });
    return Response.json({ error: "Could not read tasks from Paperclip.", tasks: [] }, { status: 502 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await guard();
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

  const body = (await request.json().catch(() => ({}))) as {
    title?: string; description?: string; priority?: string; source?: string; recordId?: string;
  };
  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  if (!title) return Response.json({ error: "Give the task a title." }, { status: 400 });
  if (title.length > 200) return Response.json({ error: "That title is too long." }, { status: 400 });
  if (description.length > 8000) return Response.json({ error: "That description is too long." }, { status: 400 });

  const priority = PRIORITIES.includes(body.priority as TaskPriority) ? (body.priority as TaskPriority) : "medium";

  try {
    const result = await createTask({
      title,
      description: description || title,
      source: (body.source ?? "console").replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "console",
      // Ties the task back to whatever raised it, and is what makes a failed
      // create recoverable without a second POST.
      recordId: (body.recordId ?? user.id).replace(/[^a-z0-9_-]/gi, "").slice(0, 64),
      priority,
    });
    return Response.json(result);
  } catch (err) {
    if (err instanceof AgentError) return Response.json({ error: err.message }, { status: err.status });
    return Response.json({ error: "Paperclip did not confirm the task." }, { status: 502 });
  }
}
