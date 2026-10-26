import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { supabaseAdmin } from "@/lib/server/supabase";

// OAuth 2.1 for the Channel Cast MCP connector (authorization code + PKCE,
// dynamic client registration, rotating refresh tokens).
//
// Rows live in the service-role-only crm_records table under collections that
// are NOT in CRM_COLLECTIONS, so /api/crm can never reach them. Codes and
// tokens are stored by their SHA-256 hash; the raw values only ever exist in
// the HTTP response that hands them to the client.

const C_CLIENTS = "mcp_oauth_clients";
const C_CODES = "mcp_oauth_codes";
const C_TOKENS = "mcp_oauth_tokens";

export const ACCESS_TTL_S = 60 * 60; // 1 hour
export const REFRESH_TTL_S = 60 * 60 * 24 * 30; // 30 days
const CODE_TTL_S = 10 * 60;

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const b64url = (buf: Buffer) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const randomToken = (prefix: string) => `${prefix}_${b64url(randomBytes(32))}`;

/** The public origin Claude reached us on (Traefik forwards the host). */
export function originOf(req: Request): string {
  const env = process.env.MCP_PUBLIC_ORIGIN;
  if (env) return env.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host") || new URL(req.url).host;
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto.split(",")[0]}://${host.split(",")[0]}`;
}
export const resourceUrl = (origin: string) => `${origin}/api/mcp`;

/* ── storage ─────────────────────────────────────────────────────────── */

async function put(collection: string, id: string, data: Record<string, unknown>) {
  const { error } = await supabaseAdmin().from("crm_records")
    .upsert({ collection, id, data: { id, ...data }, updated_at: new Date().toISOString() }, { onConflict: "collection,id" });
  if (error) throw error;
}
async function get<T>(collection: string, id: string): Promise<T | null> {
  const { data, error } = await supabaseAdmin().from("crm_records").select("data").eq("collection", collection).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data?.data as T) ?? null;
}
async function del(collection: string, id: string) {
  await supabaseAdmin().from("crm_records").delete().eq("collection", collection).eq("id", id);
}

/* ── clients (RFC 7591 dynamic registration) ─────────────────────────── */

export type OAuthClient = { id: string; clientName: string; redirectUris: string[]; secretHash?: string; createdAt: string };

function validRedirect(u: string): boolean {
  try {
    const url = new URL(u);
    if (url.protocol === "https:") return true;
    // Native / CLI clients (Claude Code) use a loopback redirect.
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch { return false; }
}

export async function registerClient(input: { client_name?: string; redirect_uris?: unknown; token_endpoint_auth_method?: string }) {
  const redirectUris = Array.isArray(input.redirect_uris) ? input.redirect_uris.map(String) : [];
  if (!redirectUris.length || !redirectUris.every(validRedirect)) {
    throw new OAuthError("invalid_redirect_uri", "redirect_uris must be https URLs (or http loopback).");
  }
  const id = randomToken("ccmcp");
  const confidential = input.token_endpoint_auth_method === "client_secret_post" || input.token_endpoint_auth_method === "client_secret_basic";
  const secret = confidential ? randomToken("ccsec") : undefined;
  const client: OAuthClient = {
    id,
    clientName: String(input.client_name || "MCP client").slice(0, 120),
    redirectUris,
    secretHash: secret ? sha256(secret) : undefined,
    createdAt: new Date().toISOString(),
  };
  await put(C_CLIENTS, id, client);
  return { client, secret };
}

export const getClient = (id: string) => get<OAuthClient>(C_CLIENTS, id);

/* ── authorization codes ─────────────────────────────────────────────── */

type CodeRow = {
  id: string; clientId: string; redirectUri: string; codeChallenge: string;
  userId: string; email: string; resource: string; scope: string; expiresAt: number;
};

export async function issueCode(input: Omit<CodeRow, "id" | "expiresAt">): Promise<string> {
  const code = randomToken("cccode");
  await put(C_CODES, sha256(code), { ...input, expiresAt: Date.now() + CODE_TTL_S * 1000 });
  return code;
}

/** Single use: the code row is deleted whether or not it checks out. */
export async function consumeCode(code: string): Promise<CodeRow | null> {
  const id = sha256(code);
  const row = await get<CodeRow>(C_CODES, id);
  if (row) await del(C_CODES, id);
  if (!row || row.expiresAt < Date.now()) return null;
  return row;
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  const computed = b64url(createHash("sha256").update(verifier).digest());
  const a = Buffer.from(computed), b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ── access + refresh tokens ─────────────────────────────────────────── */

export type TokenRow = {
  id: string; kind: "access" | "refresh"; clientId: string; userId: string; email: string;
  resource: string; scope: string; expiresAt: number; createdAt: string;
};

export async function issueTokens(input: { clientId: string; userId: string; email: string; resource: string; scope: string }) {
  const access = randomToken("ccat");
  const refresh = randomToken("ccrt");
  const now = Date.now();
  await put(C_TOKENS, sha256(access), { ...input, kind: "access", expiresAt: now + ACCESS_TTL_S * 1000, createdAt: new Date(now).toISOString() });
  await put(C_TOKENS, sha256(refresh), { ...input, kind: "refresh", expiresAt: now + REFRESH_TTL_S * 1000, createdAt: new Date(now).toISOString() });
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_S, refresh_token: refresh, scope: input.scope };
}

export async function lookupToken(raw: string, kind: TokenRow["kind"]): Promise<TokenRow | null> {
  const row = await get<TokenRow>(C_TOKENS, sha256(raw));
  if (!row || row.kind !== kind || row.expiresAt < Date.now()) return null;
  return row;
}

/** Refresh tokens rotate: the old one is revoked as the new pair is issued. */
export async function revokeToken(raw: string) {
  await del(C_TOKENS, sha256(raw));
}

export class OAuthError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
export const oauthErrorResponse = (e: unknown) => {
  if (e instanceof OAuthError) return Response.json({ error: e.code, error_description: e.message }, { status: e.status, headers: { "Cache-Control": "no-store" } });
  return Response.json({ error: "server_error", error_description: (e as Error)?.message || "Unexpected error." }, { status: 500 });
};
