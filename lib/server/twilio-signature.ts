import twilio from "twilio";

import { publicOrigin } from "@/lib/server/invoice-share";

// Twilio signs every webhook with X-Twilio-Signature (HMAC of the exact public
// URL + POST params, keyed by the auth token). The app runs behind Traefik, so
// request.url carries the internal host — rebuild the public URL instead. The
// signature can't be forged without the token, so trying each configured origin
// (and the forwarded host) is safe and tolerates the TwiML App pointing at
// either channelcast.io or os.channelcast.io.
function candidateOrigins(request: Request): string[] {
  const out = new Set<string>([publicOrigin()]);
  for (const env of [process.env.PUBLIC_APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    for (const part of (env || "").split(",")) {
      const o = part.trim().replace(/\/$/, "");
      if (o) out.add(o);
    }
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) out.add(`${request.headers.get("x-forwarded-proto") || "https"}://${host.split(",")[0].trim()}`);
  return [...out];
}

/**
 * Validates a Twilio webhook. Returns the parsed form params when valid (or when
 * TWILIO_AUTH_TOKEN is unset, for local dev), or a 403 Response.
 */
export async function verifyTwilioRequest(request: Request): Promise<{ params: Record<string, string> } | Response> {
  const params: Record<string, string> = {};
  if (request.method === "POST") {
    const form = await request.formData().catch(() => null);
    form?.forEach((v, k) => { if (typeof v === "string") params[k] = v; });
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return { params };

  const signature = request.headers.get("x-twilio-signature") || "";
  const u = new URL(request.url);
  const path = u.pathname + u.search;
  const ok = !!signature && candidateOrigins(request).some((o) => twilio.validateRequest(authToken, signature, o + path, params));
  if (!ok) {
    console.warn(`[twilio] rejected webhook with ${signature ? "an invalid" : "no"} signature: ${u.pathname}`);
    return new Response("Invalid Twilio signature.", { status: 403 });
  }
  return { params };
}
