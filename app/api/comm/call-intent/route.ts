import { recordCommunication } from "@/lib/server/communications";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

// POST /api/comm/call-intent { to, from, opportunityId?, contactId?, leadId?, owner? }
//
// A browser-dialpad call is placed by the Twilio Voice SDK, so the server never
// sees its CallSid — the details arrive later through /api/comm/calls/sync.
// This records the association at dial time so the call shows on the timeline
// immediately, and the sync enriches the same row once Twilio has the duration,
// recording and status.
//
// No external_id yet, so this inserts rather than upserts; the sync's row is
// keyed by CallSid and will sit alongside it until they are reconciled by
// matching endpoint and time window.
export async function POST(request: Request) {
  const p = await request.json().catch(() => null);
  const to = String(p?.to || "").trim();
  if (!to) return jsonError("A destination number is required.");
  if (!p?.opportunityId && !p?.contactId && !p?.leadId) {
    return jsonError("A call must attach to an opportunity, contact or lead.");
  }

  const res = await recordCommunication({
    kind: "call",
    direction: "outbound",
    from: p?.from ?? null,
    to,
    status: "initiated",
    disposition: "dialled from record",
    association: "linked",
    opportunityId: p.opportunityId ?? null,
    contactId: p.contactId ?? null,
    leadId: p.leadId ?? null,
    owner: p.owner ?? null,
    actor: p.owner ?? null,
  });
  if (!res.ok) return jsonError(res.error || "Could not record the call.", 500);
  return Response.json({ ok: true, id: res.id });
}
