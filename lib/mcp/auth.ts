import { timingSafeEqual } from "node:crypto";

import { isSuperAdmin } from "@/lib/server/roles";
import { supabaseAdmin } from "@/lib/server/supabase";
import { lookupToken, originOf, resourceUrl } from "@/lib/mcp/oauth";

// Who is calling the MCP endpoint. Two ways in:
//  - an OAuth access token issued to a Super Admin (Claude connectors), or
//  - a static machine key from MCP_API_TOKENS ("label:secret,label:secret"),
//    for server-side callers such as Hermes or Paperclip.

export type McpCaller = {
  /** Supabase user id, or "machine:<label>". */
  userId: string;
  email: string;
  via: "oauth" | "api_key";
  clientId: string;
};

function machineKeys(): { label: string; secret: string }[] {
  return (process.env.MCP_API_TOKENS || "").split(",").map((s) => s.trim()).filter(Boolean).map((pair) => {
    const i = pair.indexOf(":");
    return i > 0 ? { label: pair.slice(0, i), secret: pair.slice(i + 1) } : { label: "machine", secret: pair };
  }).filter((k) => k.secret.length >= 32); // refuse short keys outright
}

const sameString = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function authenticate(req: Request): Promise<McpCaller | null> {
  const header = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return null;
  const raw = m[1].trim();

  for (const k of machineKeys()) {
    if (sameString(raw, k.secret)) return { userId: `machine:${k.label}`, email: `${k.label}@machine`, via: "api_key", clientId: k.label };
  }

  const row = await lookupToken(raw, "access").catch(() => null);
  if (!row) return null;
  if (row.resource && row.resource !== resourceUrl(originOf(req))) return null;

  // Re-check the account on every call, so blocking or demoting someone in
  // User Management cuts off their connector immediately.
  const { data } = await supabaseAdmin().auth.admin.getUserById(row.userId);
  const user = data?.user;
  const banned = user && (user as { banned_until?: string }).banned_until && new Date((user as { banned_until?: string }).banned_until as string).getTime() > Date.now();
  if (!user || banned || !isSuperAdmin(user)) return null;
  return { userId: user.id, email: user.email || row.email, via: "oauth", clientId: row.clientId };
}

/** 401 that tells the client where to start OAuth (RFC 9728). */
export function unauthorized(req: Request): Response {
  const origin = originOf(req);
  return Response.json(
    { error: "invalid_token", error_description: "Sign in to Channel Cast to use this connector." },
    { status: 401, headers: { "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"` } },
  );
}
