// Communication capture + automatic association.
//
// Spec 18B: the user should never hand-log a routine communication. When
// Channel Cast initiates one we already know the record ids, so they are passed
// straight through. For inbound events we fall back to phone/email matching —
// and when that is ambiguous we flag the row for review rather than guessing,
// because silently attaching a call to the wrong opportunity is worse than
// leaving it unattached.

import { listRecords } from "@/lib/server/crm-db";
import { supabaseAdmin } from "@/lib/server/supabase";

export type CommKind = "call" | "sms" | "email" | "ai_voice" | "voicemail" | "meeting" | "note" | "task";
export type Association = "linked" | "matched" | "ambiguous" | "unmatched";

export type CommRecord = {
  kind: CommKind;
  direction?: "inbound" | "outbound";
  externalId?: string | null;
  opportunityId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  leadId?: string | null;
  owner?: string | null;
  actor?: string | null;
  association?: Association;
  from?: string | null;
  to?: string | null;
  subject?: string | null;
  body?: string | null;
  media?: unknown;
  status?: string | null;
  disposition?: string | null;
  durationSeconds?: number | null;
  recordingUrl?: string | null;
  transcript?: string | null;
  aiSummary?: string | null;
  aiMeta?: unknown;
  occurredAt?: string | Date | null;
  answeredAt?: string | Date | null;
  endedAt?: string | Date | null;
};

/** Digits-only phone key, US country code stripped, for cross-format matching. */
export const phoneKey = (v: string | null | undefined) =>
  (v || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

const emailKey = (v: string | null | undefined) => (v || "").trim().toLowerCase();

type Rec = { id: string } & Record<string, unknown>;

export type Resolved = {
  contactId: string | null;
  accountId: string | null;
  leadId: string | null;
  opportunityId: string | null;
  owner: string | null;
  association: Association;
};

/**
 * Resolve an inbound endpoint to CRM records. Returns `ambiguous` when more than
 * one distinct contact matches, so the row surfaces for review instead of being
 * attached to a guess.
 */
export async function resolveByEndpoint(endpoint: string): Promise<Resolved> {
  const empty: Resolved = { contactId: null, accountId: null, leadId: null, opportunityId: null, owner: null, association: "unmatched" };
  const isEmail = endpoint.includes("@");
  const key = isEmail ? emailKey(endpoint) : phoneKey(endpoint);
  if (!key) return empty;

  let contacts: Rec[] = [];
  let leads: Rec[] = [];
  let deals: Rec[] = [];
  try {
    [contacts, leads, deals] = await Promise.all([listRecords("contacts"), listRecords("leads"), listRecords("deals")]);
  } catch {
    return empty;
  }

  const matches = contacts.filter((c) =>
    isEmail
      ? emailKey(c.email as string) === key
      : [c.phone, c.sms].some((p) => phoneKey(p as string) === key),
  );

  // More than one person behind the same number/address — a human must decide.
  if (matches.length > 1) return { ...empty, association: "ambiguous" };

  if (matches.length === 1) {
    const contact = matches[0];
    const lead = leads.find((l) => l.contactId === contact.id) ?? null;
    // Attach to an open opportunity only when exactly one is open for that contact.
    const open = deals.filter((d) => d.contactId === contact.id && d.stage !== "closed_won" && d.stage !== "closed_lost");
    const deal = open.length === 1 ? open[0] : null;
    return {
      contactId: contact.id,
      accountId: (contact.accountId as string) ?? null,
      leadId: (lead?.id as string) ?? null,
      opportunityId: (deal?.id as string) ?? null,
      owner: (deal?.owner as string) ?? (contact.owner as string) ?? null,
      association: "matched",
    };
  }

  // Nobody matched a contact — the lead inbox may still hold the inquiry.
  const leadMatch = leads.filter((l) =>
    isEmail ? emailKey((l.capturedEmail ?? l.email) as string) === key : phoneKey((l.capturedPhone ?? l.phone) as string) === key,
  );
  if (leadMatch.length === 1) {
    return { ...empty, leadId: leadMatch[0].id, contactId: (leadMatch[0].contactId as string) ?? null, owner: (leadMatch[0].owner as string) ?? null, association: "matched" };
  }
  if (leadMatch.length > 1) return { ...empty, association: "ambiguous" };

  return empty;
}

const iso = (v: string | Date | null | undefined) => (v ? new Date(v).toISOString() : null);

/**
 * Write a communication. Upserts on (kind, external_id) so re-syncing Twilio
 * enriches the existing row — adding a recording or transcript that arrived
 * later — instead of creating a second copy of the same call.
 */
export async function recordCommunication(rec: CommRecord): Promise<{ ok: boolean; id?: string; error?: string }> {
  // Fill in relationships for inbound events that arrived without ids.
  let resolved: Resolved | null = null;
  const hasLink = rec.opportunityId || rec.contactId || rec.leadId;
  if (!hasLink && rec.direction === "inbound" && rec.from) {
    resolved = await resolveByEndpoint(rec.from);
  }

  const row = {
    kind: rec.kind,
    direction: rec.direction ?? null,
    external_id: rec.externalId ?? null,
    opportunity_id: rec.opportunityId ?? resolved?.opportunityId ?? null,
    contact_id: rec.contactId ?? resolved?.contactId ?? null,
    account_id: rec.accountId ?? resolved?.accountId ?? null,
    lead_id: rec.leadId ?? resolved?.leadId ?? null,
    owner: rec.owner ?? resolved?.owner ?? null,
    actor: rec.actor ?? null,
    association: rec.association ?? resolved?.association ?? (hasLink ? "linked" : "unmatched"),
    from_addr: rec.from ?? null,
    to_addr: rec.to ?? null,
    subject: rec.subject ?? null,
    body: rec.body ?? null,
    media: rec.media ?? null,
    status: rec.status ?? null,
    disposition: rec.disposition ?? null,
    duration_seconds: rec.durationSeconds ?? null,
    recording_url: rec.recordingUrl ?? null,
    transcript: rec.transcript ?? null,
    ai_summary: rec.aiSummary ?? null,
    ai_meta: rec.aiMeta ?? null,
    occurred_at: iso(rec.occurredAt) ?? new Date().toISOString(),
    answered_at: iso(rec.answeredAt),
    ended_at: iso(rec.endedAt),
    updated_at: new Date().toISOString(),
  };

  try {
    const db = supabaseAdmin();
    // Null external ids can't participate in the unique index, so only those
    // rows go through the upsert path.
    const query = rec.externalId
      ? db.from("communications").upsert(row, { onConflict: "kind,external_id" })
      : db.from("communications").insert(row);
    const { data, error } = await query.select("id").single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id as string };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Never let comms capture break the thing that triggered it. */
export async function recordCommunicationSafe(rec: CommRecord): Promise<void> {
  try {
    await recordCommunication(rec);
  } catch {
    /* capture is best-effort */
  }
}
