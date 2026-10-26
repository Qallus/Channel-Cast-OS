// One-click transcription via OpenAI Whisper. Accepts either a multipart audio
// file (field "file") or JSON { url } pointing at an uploaded recording.

import { adminGuard } from "@/lib/server/api-guard";


export const runtime = "nodejs";

const MODEL = "whisper-1";

// The JSON { url } form fetches server-side, so only allow the two places our
// recordings actually live (no SSRF into the internal network or metadata IPs).
function allowedAudioUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
  const hosts = new Set(["api.twilio.com"]);
  for (const sb of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL]) {
    try { if (sb) hosts.add(new URL(sb).hostname.toLowerCase()); } catch { /* ignore a malformed env value */ }
  }
  return hosts.has(u.hostname.toLowerCase());
}

async function transcribe(bytes: ArrayBuffer, filename: string, type: string): Promise<Response> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "transcription_not_configured" }, { status: 501 });

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: type || "audio/webm" }), filename);
  form.append("model", MODEL);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return Response.json({ error: "transcription_failed", detail: detail.slice(0, 300) }, { status: 502 });
  }
  const data = await res.json();
  return Response.json({ transcript: String(data.text || "").trim() });
}

export async function POST(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const ct = req.headers.get("content-type") || "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return Response.json({ error: "no file" }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return Response.json({ error: "file too large (max 25MB)" }, { status: 400 });
    return transcribe(await file.arrayBuffer(), file.name || "audio.webm", file.type);
  }

  const body = await req.json().catch(() => ({}));
  const url = String(body?.url || "");
  if (!url) return Response.json({ error: "url or file required" }, { status: 400 });
  if (!allowedAudioUrl(url)) return Response.json({ error: "url must point at Twilio or this app's Supabase storage" }, { status: 400 });
  const audio = await fetch(url, { redirect: "error" }).catch(() => null);
  if (!audio || !audio.ok) return Response.json({ error: "could not fetch audio" }, { status: 400 });
  const type = audio.headers.get("content-type") || "audio/webm";
  return transcribe(await audio.arrayBuffer(), "audio.webm", type);
}
