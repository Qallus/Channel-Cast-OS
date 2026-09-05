import { recordCommunication, type CommKind } from "@/lib/server/communications";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

/**
 * Kinds a person is allowed to log by hand.
 *
 * Calls and texts that Channel Cast placed arrive on their own; this is for the
 * ones it didn't see — a call taken on a mobile, a contract signed in person,
 * a payment that landed in the bank. Invoices, payments and contracts are
 * milestones rather than messages, but they belong in the same ordered stream:
 * "what has happened on this deal" is one question, not four.
 */
const LOGGABLE = new Set<CommKind>([
  "call", "sms", "email", "note", "voice", "voicemail", "ai_voice", "meeting", "task",
  "invoice", "payment", "contract",
]);

// POST /api/comm/log
// { kind, body, subject?, occurredAt?, direction?, from?, to?, durationSeconds?,
//   amount?, opportunityId?, contactId?, leadId?, owner?, actor? }
export async function POST(request: Request) {
  const p = await request.json().catch(() => null);
  const kind = String(p?.kind || "").trim() as CommKind;
  if (!LOGGABLE.has(kind)) return jsonError(`"${kind || "(none)"}" is not a kind that can be logged by hand.`);

  const body = String(p?.body || "").trim();
  const subject = p?.subject ? String(p.subject).trim() : "";
  if (!body && !subject) return jsonError("Give the entry a subject or some detail.");

  if (!p?.opportunityId && !p?.contactId && !p?.leadId) {
    return jsonError("An entry must attach to an opportunity, contact or lead.");
  }

  // A date-only value (from a <input type="date">) means "that day", not
  // midnight UTC, which would file the entry on the previous day west of GMT.
  const when = typeof p?.occurredAt === "string" && p.occurredAt
    ? (/^\d{4}-\d{2}-\d{2}$/.test(p.occurredAt) ? new Date(`${p.occurredAt}T12:00:00`) : new Date(p.occurredAt))
    : new Date();
  if (Number.isNaN(when.getTime())) return jsonError("That date could not be read.");

  const amount = Number(p?.amount);
  const res = await recordCommunication({
    kind,
    direction: p?.direction ?? null,
    subject: subject || null,
    body: body || null,
    from: p?.from ?? null,
    to: p?.to ?? null,
    durationSeconds: Number.isFinite(Number(p?.durationSeconds)) ? Number(p.durationSeconds) : null,
    // Money lives in ai_meta rather than a new column: these rows are timeline
    // entries, and the invoice or payment record itself lives in Billing.
    aiMeta: Number.isFinite(amount) && amount !== 0 ? { amount } : null,
    status: p?.status ?? "logged",
    association: "linked",
    occurredAt: when.toISOString(),
    opportunityId: p.opportunityId ?? null,
    contactId: p.contactId ?? null,
    leadId: p.leadId ?? null,
    owner: p?.owner ?? null,
    actor: p?.actor ?? p?.owner ?? null,
  });
  if (!res.ok) return jsonError(res.error || "Could not save the entry.", 500);
  return Response.json({ ok: true, id: res.id });
}
