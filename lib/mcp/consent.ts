import { createHmac, timingSafeEqual } from "node:crypto";

import { getClient, type OAuthClient } from "@/lib/mcp/oauth";

// Shared by the consent page and the form handler that receives its decision.

export type AuthorizeRequest = {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state: string;
  scope: string;
  resource: string;
};

export const AUTHZ_FIELDS: (keyof AuthorizeRequest)[] = ["response_type", "client_id", "redirect_uri", "code_challenge", "code_challenge_method", "state", "scope", "resource"];

export function readAuthorize(get: (k: string) => string | null | undefined): AuthorizeRequest {
  return Object.fromEntries(AUTHZ_FIELDS.map((k) => [k, String(get(k) ?? "")])) as AuthorizeRequest;
}

/** Validates everything that must hold before we may redirect back to the client. */
export async function checkAuthorize(r: AuthorizeRequest): Promise<{ ok: true; client: OAuthClient } | { ok: false; error: string }> {
  if (r.response_type !== "code") return { ok: false, error: "Only response_type=code is supported." };
  const client = r.client_id ? await getClient(r.client_id) : null;
  if (!client) return { ok: false, error: "This app isn't registered with Channel Cast. Remove the connector in Claude and add it again." };
  if (!client.redirectUris.includes(r.redirect_uri)) return { ok: false, error: "The redirect address doesn't match what this app registered." };
  if (!r.code_challenge || r.code_challenge_method !== "S256") return { ok: false, error: "PKCE (S256) is required." };
  return { ok: true, client };
}

// Binds a consent form to the signed-in user and this exact request, so a
// decision can't be replayed for another client or forged by another site.
const secret = () => process.env.MCP_OAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "dev-only";

export function consentToken(userId: string, r: AuthorizeRequest, issuedAt = Date.now()): string {
  const mac = createHmac("sha256", secret()).update([userId, r.client_id, r.redirect_uri, r.code_challenge, r.state, issuedAt].join("|")).digest("hex");
  return `${issuedAt}.${mac}`;
}

export function verifyConsentToken(token: string, userId: string, r: AuthorizeRequest): boolean {
  const [ts, mac] = token.split(".");
  const issuedAt = Number(ts);
  if (!issuedAt || Date.now() - issuedAt > 15 * 60_000) return false;
  const expected = consentToken(userId, r, issuedAt).split(".")[1];
  const a = Buffer.from(mac || ""), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
