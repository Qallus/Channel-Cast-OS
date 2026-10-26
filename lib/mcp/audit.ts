import { supabaseAdmin } from "@/lib/server/supabase";
import type { McpCaller } from "@/lib/mcp/auth";

// Every MCP tool call is written here, so there is always a record of what
// Claude did on the business's behalf. Stored in crm_records under a collection
// /api/crm can't reach.

export const AUDIT_COLLECTION = "mcp_audit";

export type AuditEntry = {
  id: string;
  at: string;
  tool: string;
  caller: string;
  via: McpCaller["via"];
  clientId: string;
  args: unknown;
  ok: boolean;
  error?: string;
  ms: number;
};

// Message bodies and transcripts can be long; the log keeps enough to identify the call.
function trimArgs(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.length > 500 ? `${v.slice(0, 500)}… (${v.length} chars)` : v;
  if (Array.isArray(v)) return depth > 3 ? `[${v.length} items]` : v.slice(0, 25).map((x) => trimArgs(x, depth + 1));
  if (v && typeof v === "object") {
    if (depth > 3) return "{…}";
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).slice(0, 40).map(([k, x]) => [k, trimArgs(x, depth + 1)]));
  }
  return v;
}

export async function writeAudit(e: Omit<AuditEntry, "id" | "at">): Promise<void> {
  const at = new Date().toISOString();
  const id = `${at}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: AuditEntry = { id, at, ...e, args: trimArgs(e.args) };
  try {
    await supabaseAdmin().from("crm_records").insert({ collection: AUDIT_COLLECTION, id, data: entry, updated_at: at });
  } catch (err) {
    console.warn("[mcp] audit write failed", err);
  }
}

export async function listAudit(limit = 50, tool?: string): Promise<AuditEntry[]> {
  let q = supabaseAdmin().from("crm_records").select("data").eq("collection", AUDIT_COLLECTION).order("id", { ascending: false }).limit(Math.min(limit, 500));
  if (tool) q = q.eq("data->>tool", tool);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => r.data as AuditEntry);
}
