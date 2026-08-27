import { listRecords } from "@/lib/server/crm-db";
import { recordCommunication, resolveByEndpoint, phoneKey } from "@/lib/server/communications";
import { jsonError, ownedNumbers, twilioClient, twilioConfigured } from "@/lib/server/twilio";
import { supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

// Pulls call history from Twilio into the local communications log.
//
// There is no status callback on the dial TwiML, so calls only ever existed in
// Twilio's API — which pages and ages out. This is the catch-up: it backfills
// what Twilio still holds and enriches each row with the recording and
// transcript already stored locally. Upserts on (kind, external_id), so running
// it repeatedly refreshes rows rather than duplicating them.
//
//   GET|POST /api/comm/calls/sync?token=CRON_SECRET[&limit=200]
//
// Schedule it from Coolify alongside the booking-reminders job.

type CallRow = { sid: string; direction?: string; to?: string; from?: string; status?: string; duration?: string | null; startTime?: Date | null; endTime?: Date | null; dateCreated?: Date | null };

async function run(request: Request) {
  if (!twilioConfigured()) return jsonError("Twilio not configured.", 501);

  // Fail closed: without a configured secret this endpoint would be open to
  // anyone, and it drives real Twilio API usage.
  const secret = process.env.CRON_SECRET;
  if (!secret) return jsonError("CRON_SECRET is not set.", 500);
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (token !== secret) return jsonError("unauthorized", 401);

  const limit = Math.min(Number(url.searchParams.get("limit") || "200"), 500);
  const client = twilioClient();
  const numbers = ownedNumbers();
  if (!numbers.length) return jsonError("No Twilio numbers configured.", 501);

  // Inbound (to an owned number) plus outbound (from one).
  const lists = await Promise.all([
    ...numbers.map((n) => client.calls.list({ to: n, limit })),
    ...numbers.map((n) => client.calls.list({ from: n, limit })),
  ]);

  const seen = new Set<string>();
  const calls: CallRow[] = lists.flat().filter((c) => (seen.has(c.sid) ? false : (seen.add(c.sid), true)));
  if (!calls.length) return Response.json({ ok: true, synced: 0, matched: 0, ambiguous: 0 });

  // Recordings and transcripts already captured locally, keyed by call.
  const sids = calls.map((c) => c.sid);
  const [{ data: transcripts }, existingLinks] = await Promise.all([
    supabaseAdmin().from("call_transcripts").select("call_sid, transcript").in("call_sid", sids),
    supabaseAdmin().from("call_links").select("call_sid, contact_id").in("call_sid", sids),
  ]);
  const transcriptBySid = new Map((transcripts ?? []).map((t) => [t.call_sid as string, t.transcript as string]));
  const linkBySid = new Map((existingLinks.data ?? []).map((l) => [l.call_sid as string, l.contact_id as string]));

  // One pass over the CRM so each call resolves without re-reading collections.
  const [contacts, deals] = await Promise.all([listRecords("contacts"), listRecords("deals")]);
  const dealByContact = new Map<string, { id: string; owner?: string }>();
  for (const d of deals) {
    const cid = d.contactId as string | undefined;
    if (!cid) continue;
    const stage = d.stage as string;
    if (stage === "closed_won" || stage === "closed_lost") continue;
    if (!dealByContact.has(cid)) dealByContact.set(cid, { id: d.id, owner: d.owner as string });
  }
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const ownedKeys = new Set(numbers.map(phoneKey));

  let synced = 0, matched = 0, ambiguous = 0, failed = 0;
  let firstError: string | null = null;

  for (const call of calls) {
    const outbound = (call.direction || "").includes("outbound");
    const direction = outbound ? ("outbound" as const) : ("inbound" as const);
    // The party that isn't us is the one to resolve against the CRM.
    const counterparty = outbound ? call.to : call.from;

    // An existing manual link wins — someone already said who this call was with.
    const manualContactId = linkBySid.get(call.sid) || null;
    let contactId = manualContactId;
    let association: "linked" | "matched" | "ambiguous" | "unmatched" = manualContactId ? "linked" : "unmatched";

    if (!contactId && counterparty && !ownedKeys.has(phoneKey(counterparty))) {
      const res = await resolveByEndpoint(counterparty);
      contactId = res.contactId;
      association = res.association;
      if (res.association === "ambiguous") ambiguous++;
    }
    if (contactId) matched++;

    const deal = contactId ? dealByContact.get(contactId) : undefined;
    const contact = contactId ? contactById.get(contactId) : undefined;
    const duration = Number(call.duration || 0) || 0;
    // Twilio reports a completed inbound call with no talk time as voicemail-ish;
    // keep the disposition honest rather than calling everything "completed".
    const disposition =
      call.status === "completed" ? (duration > 0 ? "connected" : "no answer")
      : call.status === "no-answer" ? "no answer"
      : call.status === "busy" ? "busy"
      : call.status === "failed" ? "failed"
      : call.status ?? null;

    const res = await recordCommunication({
      kind: "call",
      direction,
      externalId: call.sid,
      from: call.from ?? null,
      to: call.to ?? null,
      status: call.status ?? null,
      disposition,
      durationSeconds: duration,
      transcript: transcriptBySid.get(call.sid) ?? null,
      recordingUrl: `/api/comm/recordings?callSid=${encodeURIComponent(call.sid)}`,
      contactId,
      opportunityId: deal?.id ?? null,
      owner: deal?.owner ?? (contact?.owner as string) ?? null,
      association,
      occurredAt: call.startTime ?? call.dateCreated ?? null,
      endedAt: call.endTime ?? null,
    });
    if (res.ok) synced++;
    else { failed++; if (!firstError) firstError = res.error ?? "unknown"; }
  }

  return Response.json({ ok: true, scanned: calls.length, synced, matched, ambiguous, failed, firstError });
}

export const GET = run;
export const POST = run;
