import { normalizeProfile, type FinEntry, type FinProfile, type FinanceCollection, type MileageTrip, type TimeLog } from "@/lib/finance/types";
import { AuthError, requireUser, type SessionUser } from "@/lib/server/require-user";
import { supabaseAdmin } from "@/lib/server/supabase";

// Financing records reuse the crm_records JSONB table (service-role only, RLS on)
// but are never listed in CRM_COLLECTIONS, so the unauthenticated /api/crm route
// can't reach them. Every row is stamped with its owner, and the primary key is
// prefixed with the owner id so two admins' "profile" rows can't collide.

type Rec = { id: string } & Record<string, unknown>;

const PAGE = 1000;
const rowId = (ownerId: string, id: string) => `${ownerId}:${id}`;

/** Admins only. Returns the user, or a ready-made error Response. */
export async function financeUser(): Promise<SessionUser | Response> {
  try {
    const user = await requireUser();
    if (!user.isAdmin) return Response.json({ error: "Accounting is limited to admins." }, { status: 403 });
    return user;
  } catch (err) {
    const e = err as AuthError;
    return Response.json({ error: e.message }, { status: e.status ?? 401 });
  }
}

export async function listFinance<T = Rec>(collection: FinanceCollection, ownerId: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin()
      .from("crm_records")
      .select("data")
      .eq("collection", collection)
      .eq("data->>ownerId", ownerId)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []).map((r) => r.data as T));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export async function upsertFinance(collection: FinanceCollection, ownerId: string, records: Rec[]): Promise<number> {
  const now = new Date().toISOString();
  const rows = records
    .filter((r) => r && typeof r.id === "string" && r.id.length <= 120)
    .map((r) => ({ collection, id: rowId(ownerId, r.id), data: { ...r, ownerId }, updated_at: now }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabaseAdmin().from("crm_records").upsert(rows.slice(i, i + 500), { onConflict: "collection,id" });
    if (error) throw error;
  }
  return rows.length;
}

export async function deleteFinance(collection: FinanceCollection, ownerId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await supabaseAdmin()
      .from("crm_records")
      .delete()
      .eq("collection", collection)
      .in("id", ids.slice(i, i + 200).map((id) => rowId(ownerId, id)));
    if (error) throw error;
  }
}

export async function getProfile(ownerId: string): Promise<FinProfile> {
  const rows = await listFinance<FinProfile>("fin_profile", ownerId);
  return normalizeProfile(rows.find((r) => r.id === "profile"));
}

/** Everything the tax engine needs, in one round trip per collection. */
export async function loadWorkbook(ownerId: string) {
  const [profile, entries, trips, time] = await Promise.all([
    getProfile(ownerId),
    listFinance<FinEntry>("fin_entries", ownerId),
    listFinance<MileageTrip>("fin_trips", ownerId),
    listFinance<TimeLog>("fin_time", ownerId),
  ]);
  return { profile, entries, trips, time };
}

// ── Private receipt storage ───────────────────────────────────────────────
export const RECEIPT_BUCKET = "finance-private";
let bucketReady = false;
export async function ensureReceiptBucket() {
  if (bucketReady) return;
  const sb = supabaseAdmin();
  const { data } = await sb.storage.getBucket(RECEIPT_BUCKET);
  if (!data) await sb.storage.createBucket(RECEIPT_BUCKET, { public: false }).catch(() => {});
  bucketReady = true;
}
