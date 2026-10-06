/**
 * Hermes Agent client — the persistent assistant with memory and a persona.
 *
 * Hermes speaks the OpenAI chat shape, with one trap worth remembering: it
 * advertises PROFILE names as model names, so the request sends the profile
 * (HERMES_MODEL), not "hermes-agent". Sending the latter returns "model not found".
 */
import { AgentError, hermesConfig, notConfigured, providerFailed } from "./config";

/** Budgets from AI_AGENT_STACK.md §6: a chat is allowed longer than a probe. */
const CHAT_TIMEOUT_MS = 20_000;
const HEALTH_TIMEOUT_MS = 8_000;

export type HermesHealth = {
  configured: boolean;
  ok: boolean;
  /** Liveness only — says nothing about whether our key works. */
  reachable: boolean;
  /** True once the key was accepted AND our profile appears in /v1/models. */
  authorized: boolean;
  model?: string;
  models?: string[];
  detail?: string;
  missing?: string[];
};

/**
 * Proves authorization, not just reachability: /health answers without a key,
 * so a green light there tells us nothing about whether we can actually talk to
 * the agent. We also confirm our profile is one of the advertised models.
 */
export async function hermesHealth(): Promise<HermesHealth> {
  const cfg = hermesConfig();
  if (!cfg.configured) return { configured: false, ok: false, reachable: false, authorized: false, missing: cfg.missing };

  let reachable = false;
  try {
    const res = await fetch(`${cfg.url}/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    reachable = res.ok;
  } catch {
    return { configured: true, ok: false, reachable: false, authorized: false, model: cfg.model, detail: "Hermes did not answer at that address." };
  }

  try {
    const res = await fetch(`${cfg.url}/v1/models`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      return { configured: true, ok: false, reachable, authorized: false, model: cfg.model, detail: "Hermes rejected the API key." };
    }
    if (!res.ok) {
      return { configured: true, ok: false, reachable, authorized: false, model: cfg.model, detail: `Hermes returned HTTP ${res.status} listing models.` };
    }
    const body = (await res.json().catch(() => ({}))) as { data?: { id?: string }[] };
    const models = (body.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
    const hasProfile = models.includes(cfg.model!);
    return {
      configured: true,
      ok: hasProfile,
      reachable,
      authorized: true,
      model: cfg.model,
      models,
      detail: hasProfile
        ? undefined
        : `The key works, but profile "${cfg.model}" isn't one of the models Hermes offers (${models.join(", ") || "none"}). Check HERMES_MODEL.`,
    };
  } catch {
    return { configured: true, ok: false, reachable, authorized: false, model: cfg.model, detail: "Hermes did not answer the models request in time." };
  }
}

/** One non-streaming turn. Returns the reply text. */
export async function hermesAsk({ system, prompt }: { system?: string; prompt: string }): Promise<string> {
  const cfg = hermesConfig();
  if (!cfg.configured) throw notConfigured("Hermes", cfg.missing);

  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  let res: Response;
  try {
    res = await fetch(`${cfg.url}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model, stream: false, messages }),
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    });
  } catch {
    throw new AgentError("Hermes did not answer in time. Nothing was sent.", 502);
  }

  if (!res.ok) {
    // Deliberately not forwarding the body — it can contain the request back.
    if (res.status === 401 || res.status === 403) throw new AgentError("Hermes rejected the API key.", 502);
    if (res.status === 404) throw new AgentError(`Hermes has no profile named "${cfg.model}". Check HERMES_MODEL.`, 502);
    throw providerFailed("Hermes", res.status);
  }

  const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new AgentError("Hermes replied with nothing.", 502);
  return reply;
}
