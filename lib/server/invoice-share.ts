// Public invoice links. A client has no account, so the shared invoice is
// reachable by an unguessable token rather than by its (predictable) record id.

import { randomUUID } from "node:crypto";

import type { Invoice } from "@/lib/ops/invoices";
import { supabaseAdmin } from "@/lib/server/supabase";

/** Absolute origin the shared link is built on. */
export function publicOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "https://os.channelcast.io")
    .split(",")[0].trim().replace(/\/$/, "");
}

export const shareUrl = (token: string) => `${publicOrigin()}/i/${token}`;

/** Look up a shared invoice. Returns null for an unknown or revoked token. */
export async function findInvoiceByToken(token: string): Promise<Invoice | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const { data, error } = await supabaseAdmin()
    .from("crm_records")
    .select("data")
    .eq("collection", "invoices")
    .eq("data->>publicToken", token)
    .limit(1);
  if (error || !data?.length) return null;
  return data[0].data as Invoice;
}

/**
 * Return the invoice's share token, minting and persisting one on first use.
 * Reuses the existing token so a link already texted to a client keeps working.
 */
export async function ensureShareToken(id: string): Promise<{ invoice: Invoice; token: string } | null> {
  const { data, error } = await supabaseAdmin()
    .from("crm_records")
    .select("data")
    .eq("collection", "invoices")
    .eq("id", id)
    .limit(1);
  if (error || !data?.length) return null;

  const invoice = data[0].data as Invoice;
  if (invoice.publicToken) return { invoice, token: invoice.publicToken };

  const token = randomUUID().replace(/-/g, "");
  const next = { ...invoice, publicToken: token };
  const { error: writeError } = await supabaseAdmin()
    .from("crm_records")
    .upsert({ collection: "invoices", id, data: next, updated_at: new Date().toISOString() }, { onConflict: "collection,id" });
  if (writeError) return null;
  return { invoice: next, token };
}
