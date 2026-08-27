import { recordCommunication } from "@/lib/server/communications";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

// POST /api/comm/note { body, opportunityId?, contactId?, leadId?, owner?, actor? }
//
// Notes live in the same communications log as calls and texts so the activity
// timeline stays a single ordered stream rather than merging two sources.
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const body = String(payload?.body || "").trim();
  if (!body) return jsonError("A note body is required.");
  if (!payload?.opportunityId && !payload?.contactId && !payload?.leadId) {
    return jsonError("A note must attach to an opportunity, contact or lead.");
  }

  const res = await recordCommunication({
    kind: "note",
    body,
    association: "linked",
    opportunityId: payload.opportunityId ?? null,
    contactId: payload.contactId ?? null,
    leadId: payload.leadId ?? null,
    owner: payload.owner ?? null,
    actor: payload.actor ?? payload.owner ?? null,
  });
  if (!res.ok) return jsonError(res.error || "Could not save the note.", 500);
  return Response.json({ ok: true, id: res.id });
}
