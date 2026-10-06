/**
 * Reads the agent-stack environment once and reports what is actually usable.
 *
 * Nothing here throws and nothing here calls out to a provider: an unconfigured
 * service must be a quiet "not set up yet" in the UI, never a crash or a failed
 * request. Callers check `configured` before doing any work.
 *
 * Names match the keys already present in .env (HERMES_API_URL, HERMES_API_KEY,
 * PAPERCLIP_API_KEY); the shorter aliases from AI_AGENT_STACK.md are accepted
 * too so either spelling works.
 */

const clean = (v: string | undefined) => {
  const s = (v ?? "").trim();
  return s ? s : undefined;
};
/** Trailing slashes turn `${base}/v1/...` into a double slash, which 404s. */
const base = (v: string | undefined) => clean(v)?.replace(/\/+$/, "");

export type HermesConfig = {
  configured: boolean;
  url?: string;
  apiKey?: string;
  /** Hermes advertises PROFILE names as model names — not "hermes-agent". */
  model?: string;
  missing: string[];
};

export type PaperclipConfig = {
  configured: boolean;
  url?: string;
  apiKey?: string;
  companyId?: string;
  agentId?: string;
  missing: string[];
};

export type VoiceConfig = {
  configured: boolean;
  apiKey?: string;
  model: string;
  voice?: string;
  agentId?: string;
  missing: string[];
};

export function hermesConfig(): HermesConfig {
  const url = base(process.env.HERMES_API_URL || process.env.HERMES_URL);
  const apiKey = clean(process.env.HERMES_API_KEY);
  const model = clean(process.env.HERMES_MODEL);
  const missing: string[] = [];
  if (!url) missing.push("HERMES_API_URL");
  if (!apiKey) missing.push("HERMES_API_KEY");
  // Without the profile name Hermes answers "model not found", so treat it as
  // required rather than guessing a default.
  if (!model) missing.push("HERMES_MODEL");
  return { configured: missing.length === 0, url, apiKey, model, missing };
}

export function paperclipConfig(): PaperclipConfig {
  const url = base(process.env.PAPERCLIP_API_URL || process.env.PAPERCLIP_URL);
  const apiKey = clean(process.env.PAPERCLIP_API_KEY);
  const companyId = clean(process.env.PAPERCLIP_COMPANY_ID);
  const agentId = clean(process.env.PAPERCLIP_AGENT_ID);
  const missing: string[] = [];
  if (!url) missing.push("PAPERCLIP_API_URL");
  if (!apiKey) missing.push("PAPERCLIP_API_KEY");
  if (!companyId) missing.push("PAPERCLIP_COMPANY_ID");
  // The agent id only matters for assigning work, so it is not required here.
  return { configured: missing.length === 0, url, apiKey, companyId, agentId, missing };
}

export function voiceConfig(): VoiceConfig {
  const apiKey = clean(process.env.XAI_API_KEY);
  return {
    configured: Boolean(apiKey),
    apiKey,
    model: clean(process.env.XAI_VOICE_MODEL) || clean(process.env.XAI_MODEL) || "grok-voice-latest",
    voice: clean(process.env.XAI_VOICE),
    agentId: clean(process.env.XAI_AGENT_ID),
    missing: apiKey ? [] : ["XAI_API_KEY"],
  };
}

/** Thrown when a service is reachable but refused the work, or isn't set up. */
export class AgentError extends Error {
  /** 503 = we are not configured; 502 = the provider failed us. */
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

/**
 * Provider error bodies can echo the request back, so they never reach our
 * client. We keep the status for the server log and return our own sentence.
 */
export function providerFailed(service: string, status?: number): AgentError {
  return new AgentError(
    `${service} did not confirm the request${status ? ` (HTTP ${status})` : ""}. Check ${service} before sending it again.`,
    502,
  );
}

export function notConfigured(service: string, missing: string[]): AgentError {
  return new AgentError(`${service} is not set up yet. Missing: ${missing.join(", ")}.`, 503);
}
