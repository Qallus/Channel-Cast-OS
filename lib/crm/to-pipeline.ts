// Contact / Lead → Pipeline.
//
// One place for the conversion so the single-record button and the bulk action
// behave identically. Two rules from the pipeline spec drive the shape of this:
// the opportunity links to the existing contact rather than copying a person
// into a new record, and a contact that is already being worked must not sprout
// a second opportunity.

import type { Contact } from "@/lib/crm/contacts";
import { contactName } from "@/lib/crm/contacts";
import { DEAL_STAGE, type Deal, type DealStage, isClosed } from "@/lib/crm/deals";
import type { Lead } from "@/lib/crm/leads";

export type ConversionResult =
  | { status: "created"; deal: Deal }
  | { status: "exists"; deal: Deal }
  | { status: "skipped"; reason: string };

/** The open opportunity already on this contact, if any. */
export function openOpportunityFor(contactId: string, deals: Deal[]): Deal | null {
  return deals.find((d) => d.contactId === contactId && !isClosed(d.stage)) ?? null;
}

/**
 * Build the Opportunity for a contact. Everything known about the person and the
 * inquiry is carried forward — company, source, owner, notes and the originating
 * lead — so nothing has to be retyped and the lead's provenance survives.
 */
export function buildOpportunity(
  contact: Contact,
  opts: { id: string; owner: string; stage?: DealStage; lead?: Lead | null; closeInDays?: number },
): Deal {
  const now = new Date();
  const stage: DealStage = opts.stage ?? "new_working";
  const closeDate = new Date(now.getTime() + (opts.closeInDays ?? 30) * 86_400_000);
  const person = contactName(contact);
  const owner = opts.owner || contact.owner || "";

  return {
    id: opts.id,
    // Named for the account when there is one, since that's how a pipeline reads.
    name: contact.company ? `${contact.company} — ${person}` : person,
    client: contact.company || person,
    contactId: contact.id,
    leadId: opts.lead?.id ?? null,
    accountId: null,
    stage,
    value: opts.lead?.value ?? 0,
    probability: DEAL_STAGE[stage].defaultProb,
    closeDate: closeDate.toISOString().slice(0, 10),
    owner,
    source: opts.lead?.source || contact.source || "Existing contact",
    campaign: opts.lead?.campaign,
    products: [],
    // The contact's own notes plus whatever the inquiry said, so context isn't
    // stranded on the lead record.
    notes: [contact.notes, opts.lead?.message].filter(Boolean).join("\n\n"),
    createdAt: now.toISOString(),
    stageEnteredAt: now.toISOString(),
    stageHistory: [{ stage, at: now.toISOString(), by: owner || "You", note: "Added to pipeline" }],
    ownerHistory: owner ? [{ owner, at: now.toISOString(), by: owner }] : [],
    checklist: {},
    nextStep: null,
    stalled: null,
    closedAt: null,
  };
}

/** The role a contact should take once it's actively worked. */
export const roleForPipeline = (contact: Contact) => (contact.type === "contact" || contact.type === "lead" ? "prospect" : contact.type);
