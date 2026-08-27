import { supabaseAdmin } from "@/lib/server/supabase";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

// GET /api/comm/timeline?opportunityId=…|contactId=…|leadId=…[&kind=call,sms][&limit=100]
//
// The unified activity feed for a Lead or Opportunity. Communications are stored
// once by the Communications module; this is the contextual view of them for one
// record, so Pipeline never becomes a second messaging system.
//
// An opportunity query also returns communications attached only to its contact,
// since a call placed before the deal existed is still part of its history.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const opportunityId = url.searchParams.get("opportunityId");
  const contactId = url.searchParams.get("contactId");
  const leadId = url.searchParams.get("leadId");
  const kinds = (url.searchParams.get("kind") || "").split(",").map((k) => k.trim()).filter(Boolean);
  const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 500);
  const review = url.searchParams.get("review") === "true";

  if (!opportunityId && !contactId && !leadId && !review) {
    return jsonError("One of opportunityId, contactId, leadId or review=true is required.");
  }

  let q = supabaseAdmin()
    .from("communications")
    .select(
      "id, kind, direction, external_id, opportunity_id, contact_id, lead_id, owner, actor, association, from_addr, to_addr, subject, body, media, status, disposition, duration_seconds, recording_url, transcript, ai_summary, ai_meta, occurred_at, ended_at",
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (review) {
    // The queue of inbound events that matched more than one record, or none.
    q = q.in("association", ["ambiguous", "unmatched"]);
  } else {
    const ors: string[] = [];
    if (opportunityId) ors.push(`opportunity_id.eq.${opportunityId}`);
    if (contactId) ors.push(`contact_id.eq.${contactId}`);
    if (leadId) ors.push(`lead_id.eq.${leadId}`);
    q = q.or(ors.join(","));
  }
  if (kinds.length) q = q.in("kind", kinds);

  const { data, error } = await q;
  if (error) return jsonError(error.message, 500);

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    direction: r.direction,
    externalId: r.external_id,
    opportunityId: r.opportunity_id,
    contactId: r.contact_id,
    leadId: r.lead_id,
    owner: r.owner,
    actor: r.actor,
    association: r.association,
    from: r.from_addr,
    to: r.to_addr,
    subject: r.subject,
    body: r.body,
    media: r.media,
    status: r.status,
    disposition: r.disposition,
    durationSeconds: r.duration_seconds,
    recordingUrl: r.recording_url,
    hasTranscript: Boolean(r.transcript),
    transcript: r.transcript,
    aiSummary: r.ai_summary,
    aiMeta: r.ai_meta,
    occurredAt: r.occurred_at,
    endedAt: r.ended_at,
  }));

  // Counts drive the timeline's channel filters and the activity KPIs.
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.kind as string] = (acc[r.kind as string] ?? 0) + 1;
    return acc;
  }, {});

  return Response.json({ activities: rows, counts, total: rows.length });
}
