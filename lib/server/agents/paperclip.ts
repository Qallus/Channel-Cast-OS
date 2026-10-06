/**
 * Paperclip client — teams of agents working tasks ("issues") inside a company.
 *
 * The important quirk (AI_AGENT_STACK.md §4, upstream issue #3310): creating an
 * issue can return HTTP 500 *after* it saved. Retrying therefore duplicates real
 * work. `createTask` never re-POSTs — it tags the description with a marker and
 * looks the task up to find out what actually happened.
 */
import { AgentError, notConfigured, paperclipConfig, providerFailed } from "./config";

const CREATE_TIMEOUT_MS = 15_000;
const HEALTH_TIMEOUT_MS = 8_000;
const LIST_TIMEOUT_MS = 12_000;

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "blocked" | "cancelled";
export type TaskPriority = "critical" | "high" | "medium" | "low";

export type PaperclipTask = {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PaperclipHealth = {
  configured: boolean;
  ok: boolean;
  /** Proven by reading this company's agents with our key. */
  authorized: boolean;
  companyId?: string;
  agents?: { id: string; name?: string }[];
  detail?: string;
  missing?: string[];
};

/**
 * Reads the company's agents. That proves three things at once: the host is up,
 * the key is valid, and the key belongs to THIS company — the usual cause of a
 * 401/404 here is a key issued by a different company.
 */
export async function paperclipHealth(): Promise<PaperclipHealth> {
  const cfg = paperclipConfig();
  if (!cfg.configured) return { configured: false, ok: false, authorized: false, missing: cfg.missing };

  try {
    const res = await fetch(`${cfg.url}/api/companies/${cfg.companyId}/agents`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      return { configured: true, ok: false, authorized: false, companyId: cfg.companyId, detail: "Paperclip rejected the API key for this company." };
    }
    if (res.status === 404) {
      return { configured: true, ok: false, authorized: false, companyId: cfg.companyId, detail: "Paperclip has no such company, or the key belongs to a different one." };
    }
    if (!res.ok) {
      return { configured: true, ok: false, authorized: false, companyId: cfg.companyId, detail: `Paperclip returned HTTP ${res.status}.` };
    }
    const body = await res.json().catch(() => ({}));
    const list = (Array.isArray(body) ? body : (body as { agents?: unknown[]; data?: unknown[] }).agents ?? (body as { data?: unknown[] }).data ?? []) as { id?: string; name?: string }[];
    const agents = list.filter((a) => a?.id).map((a) => ({ id: a.id as string, name: a.name }));
    return { configured: true, ok: true, authorized: true, companyId: cfg.companyId, agents };
  } catch {
    return { configured: true, ok: false, authorized: false, companyId: cfg.companyId, detail: "Paperclip did not answer in time." };
  }
}

function normalizeTask(raw: unknown): PaperclipTask | null {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const id = t.id ?? t.issueId;
  if (!id) return null;
  return {
    id: String(id),
    title: String(t.title ?? "Untitled"),
    description: typeof t.description === "string" ? t.description : undefined,
    status: typeof t.status === "string" ? t.status : undefined,
    priority: typeof t.priority === "string" ? t.priority : undefined,
    createdAt: typeof t.createdAt === "string" ? t.createdAt : undefined,
    updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : undefined,
  };
}

function unwrapList(body: unknown): PaperclipTask[] {
  const arr = Array.isArray(body)
    ? body
    : ((body as { issues?: unknown[]; data?: unknown[] })?.issues ?? (body as { data?: unknown[] })?.data ?? []);
  return (arr as unknown[]).map(normalizeTask).filter((t): t is PaperclipTask => Boolean(t));
}

export async function listTasks(limit = 25): Promise<PaperclipTask[]> {
  const cfg = paperclipConfig();
  if (!cfg.configured) throw notConfigured("Paperclip", cfg.missing);

  let res: Response;
  try {
    res = await fetch(`${cfg.url}/api/companies/${cfg.companyId}/issues?limit=${limit}`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
    });
  } catch {
    throw new AgentError("Paperclip did not answer in time.", 502);
  }
  if (!res.ok) throw providerFailed("Paperclip", res.status);
  return unwrapList(await res.json().catch(() => ({})));
}

/** A marker we can find the task by if the create call lies to us. */
export function taskMarker(source: string, recordId: string): string {
  return `cc-ref:${source}:${recordId}:${Date.now().toString(36)}`;
}

export type CreateTaskResult =
  | { state: "created"; task: PaperclipTask }
  /** Saved despite an error response — shown as needing a human to confirm. */
  | { state: "unconfirmed"; task: PaperclipTask };

/**
 * Creates one task. Never retries the POST.
 *
 * On any failure we search recent issues for our marker: if it is there the task
 * saved and we report it as unconfirmed; if it is not, we raise. A second POST
 * here is how duplicate work gets created.
 */
export async function createTask(input: {
  title: string;
  description: string;
  /** e.g. "lead" / "opportunity" — combined with recordId into the marker. */
  source: string;
  recordId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}): Promise<CreateTaskResult> {
  const cfg = paperclipConfig();
  if (!cfg.configured) throw notConfigured("Paperclip", cfg.missing);

  const marker = taskMarker(input.source, input.recordId);
  const description = `${input.description}\n\n${marker}`;
  const payload: Record<string, unknown> = {
    title: input.title,
    description,
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
  };
  if (cfg.agentId) payload.assigneeAgentId = cfg.agentId;

  let res: Response | null = null;
  try {
    res = await fetch(`${cfg.url}/api/companies/${cfg.companyId}/issues`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CREATE_TIMEOUT_MS),
    });
  } catch {
    res = null; // network or timeout — it may still have saved
  }

  if (res?.ok) {
    const task = normalizeTask(await res.json().catch(() => ({})));
    if (task) return { state: "created", task };
    // A 2xx we couldn't parse still means it saved; fall through and find it.
  } else if (res && (res.status === 401 || res.status === 403)) {
    // Rejected outright, so nothing was written — safe to fail loudly.
    throw new AgentError("Paperclip rejected the API key for this company.", 502);
  }

  const found = await findByMarker(marker).catch(() => null);
  if (found) return { state: "unconfirmed", task: found };

  throw new AgentError(
    "Paperclip did not confirm the task and no matching task was found, so nothing was created. Check Paperclip before sending it again.",
    502,
  );
}

async function findByMarker(marker: string): Promise<PaperclipTask | null> {
  const recent = await listTasks(50);
  return recent.find((t) => t.title.includes(marker) || (t.description ?? "").includes(marker)) ?? null;
}
