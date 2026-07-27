import { createAudio } from "@/lib/server/db";
import { TTS_PROVIDERS, listVoices, providerConfigured, synthesize, type TtsProvider } from "@/lib/server/tts";

export const runtime = "nodejs";

const LABEL: Record<TtsProvider, string> = { openai: "OpenAI", xai: "xAI", gemini: "Gemini" };

// GET /api/admin/ai-voice → providers with their real voice lists.
export async function GET() {
  const providers = await Promise.all(
    TTS_PROVIDERS.map(async (p) => ({
      id: p.id,
      label: p.label,
      configured: providerConfigured(p.id),
      voices: await listVoices(p.id),
    })),
  );
  return Response.json({ providers });
}

// POST /api/admin/ai-voice  { script, voice (actual voice id), speed, provider }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const script = String(body?.script || "").trim();
  if (!script) return Response.json({ error: "script is required" }, { status: 400 });

  const provider = (body?.provider as TtsProvider) || "openai";
  if (!TTS_PROVIDERS.some((p) => p.id === provider)) {
    return Response.json({ error: "unknown provider" }, { status: 400 });
  }
  if (!providerConfigured(provider)) {
    const envVar = TTS_PROVIDERS.find((p) => p.id === provider)!.envVar;
    return Response.json(
      { configured: false, error: `${LABEL[provider]} voice not configured`, hint: `Add ${envVar} to .env and restart the server.` },
      { status: 501 },
    );
  }

  const result = await synthesize(provider, {
    script,
    voice: String(body.voice || ""),
    speed: Math.max(0.25, Math.min(4, Number(body.speed) || 1)),
  });

  if ("error" in result) return Response.json(result, { status: 502 });

  const words = script.split(/\s+/);
  const label = words.slice(0, 6).join(" ") + (words.length > 6 ? "…" : "");
  const record = await createAudio({ name: `AI · ${label}`, ext: result.ext, mime: result.mime, buffer: result.buffer });

  return Response.json({ configured: true, provider, audio: record });
}
