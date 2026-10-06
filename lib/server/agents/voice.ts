/**
 * xAI Voice health.
 *
 * The key is already in use by Nicole voice (/api/nicole/token) and the Twilio
 * AI-call webhooks; this only reports whether it still works, so the agents
 * console can show all three services side by side. Read-only on purpose:
 * minting a client secret would also prove the key, but it would create a
 * credential just to draw a status dot.
 */
import { voiceConfig } from "./config";

const HEALTH_TIMEOUT_MS = 8_000;

export type VoiceHealth = {
  configured: boolean;
  ok: boolean;
  authorized: boolean;
  model: string;
  voice?: string;
  detail?: string;
  missing?: string[];
};

export async function voiceHealth(): Promise<VoiceHealth> {
  const cfg = voiceConfig();
  if (!cfg.configured) return { configured: false, ok: false, authorized: false, model: cfg.model, missing: cfg.missing };

  try {
    const res = await fetch("https://api.x.ai/v1/models", {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      return { configured: true, ok: false, authorized: false, model: cfg.model, voice: cfg.voice, detail: "xAI rejected the API key." };
    }
    if (!res.ok) {
      return { configured: true, ok: false, authorized: false, model: cfg.model, voice: cfg.voice, detail: `xAI returned HTTP ${res.status}.` };
    }
    return { configured: true, ok: true, authorized: true, model: cfg.model, voice: cfg.voice };
  } catch {
    return { configured: true, ok: false, authorized: false, model: cfg.model, voice: cfg.voice, detail: "xAI did not answer in time." };
  }
}
