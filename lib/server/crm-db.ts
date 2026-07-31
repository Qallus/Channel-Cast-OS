import { supabaseAdmin } from "@/lib/server/supabase";

// Generic JSONB-backed store for CRM entities (clients/contacts/leads/deals).
// The whole record lives in `data`; `id` is the record's own id.

export const CRM_COLLECTIONS = ["clients", "contacts", "leads", "deals"] as const;
export type CrmCollection = (typeof CRM_COLLECTIONS)[number];

export function isCrmCollection(v: string): v is CrmCollection {
  return (CRM_COLLECTIONS as readonly string[]).includes(v);
}

type Rec = { id: string } & Record<string, unknown>;

export async function listRecords(collection: CrmCollection): Promise<Rec[]> {
  const { data, error } = await supabaseAdmin()
    .from("crm_records")
    .select("data")
    .eq("collection", collection)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.data as Rec);
}

export async function upsertRecords(collection: CrmCollection, records: Rec[]): Promise<void> {
  if (!records.length) return;
  const rows = records
    .filter((r) => r && typeof r.id === "string")
    .map((r) => ({ collection, id: r.id, data: r, updated_at: new Date().toISOString() }));
  const { error } = await supabaseAdmin().from("crm_records").upsert(rows, { onConflict: "collection,id" });
  if (error) throw error;
}

export async function deleteRecord(collection: CrmCollection, id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("crm_records").delete().eq("collection", collection).eq("id", id);
  if (error) throw error;
}
