import { listRecords } from "@/lib/server/crm-db";
import { fireEmailTrigger } from "@/lib/server/email-automations";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// POST /api/email/trigger { trigger, opportunityId?, contactId?, leadId?, attributes? }
//
// Called from the Pipeline when a lifecycle event happens. Merge-field values
// are resolved here from the records themselves, so a caller only has to say
// what happened and to which record.
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const trigger = String(b?.trigger || "").trim();
  if (!trigger) return jsonError("A trigger key is required.");

  let contact: Record<string, unknown> | undefined;
  let deal: Record<string, unknown> | undefined;
  try {
    if (b?.contactId) contact = (await listRecords("contacts")).find((c) => c.id === b.contactId);
    if (b?.opportunityId) deal = (await listRecords("deals")).find((d) => d.id === b.opportunityId);
  } catch { /* fire with whatever we have */ }

  const name = String(contact?.name ?? "").trim();
  const result = await fireEmailTrigger(trigger, {
    opportunityId: b?.opportunityId ?? null,
    contactId: b?.contactId ?? null,
    leadId: b?.leadId ?? null,
    owner: (deal?.owner as string) ?? (contact?.owner as string) ?? null,
    contactEmail: (contact?.email as string) ?? null,
    ownerEmail: b?.ownerEmail ?? null,
    attributes: b?.attributes ?? {},
    fields: {
      first_name: name.split(" ")[0] || null,
      last_name: name.split(" ").slice(1).join(" ") || null,
      full_name: name || null,
      email: (contact?.email as string) ?? null,
      phone: (contact?.phone as string) ?? null,
      title: (contact?.title as string) ?? null,
      company: (contact?.company as string) ?? (deal?.client as string) ?? null,
      owner: (deal?.owner as string) ?? (contact?.owner as string) ?? null,
      opportunity_name: (deal?.name as string) ?? null,
      stage: (deal?.stage as string) ?? null,
      amount: deal?.value != null ? usd.format(Number(deal.value)) : null,
      close_date: (deal?.closeDate as string) ?? null,
      next_step: (deal?.nextStep as { action?: string } | null)?.action ?? null,
      lead_source: (deal?.source as string) ?? null,
      site_url: process.env.NEXT_PUBLIC_APP_URL || "https://channelcast.io",
    },
  });

  return Response.json({ ok: true, fired: result.fired });
}
