// Pipeline foundation migration (Phases 0–1).
//
// Leads and Contacts had grown into two parallel people stores — Riley Chen and
// Tony Bruno existed in both — which is exactly what the pipeline spec forbids.
// This links every lead to a single contact record, folds the two historical
// lead shapes (`stage` from seeds, `status`+`kind` from live web forms) onto one
// lifecycle, and upgrades deals to the Opportunity model with stage history.
//
// Idempotent: re-running only fills gaps. Dry-run by default.
//
//   node scripts/migrate-pipeline-foundation.mjs           # report only
//   node scripts/migrate-pipeline-foundation.mjs --apply   # write
import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const POOLER_HOST = "aws-0-us-west-1.pooler.supabase.com";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const direct = new URL(env.SUPABASE_DB_URL);
const client = new pg.Client({
  host: POOLER_HOST, port: 5432, user: `postgres.${direct.hostname.split(".")[1]}`,
  password: decodeURIComponent(direct.password), database: "postgres", ssl: { rejectUnauthorized: false },
});

const emailKey = (v) => (v || "").trim().toLowerCase();
const phoneKey = (v) => (v || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
const genId = (p) => `${p}_${crypto.randomUUID().slice(0, 8)}`;

const LEGACY_STAGE_TO_STATUS = { new: "new", contacted: "contacted", qualified: "qualified", unqualified: "disqualified" };
const INBOUND_TO_STATUS = { new: "new", unread: "new", read: "new", archived: "disqualified" };
const VALID_STATUS = new Set(["new", "unassigned", "assigned", "attempting", "contacted", "nurture", "qualified", "disqualified", "in_pipeline", "converted"]);

const LEGACY_DEAL_STAGE = {
  new_lead: "new_working", prospect: "contacted", qualified: "qualified", opportunity: "opportunity",
  proposal: "proposal", negotiation: "negotiation", won: "closed_won", lost: "closed_lost",
  disqualified: "closed_lost", unresponsive: "closed_lost", nurture: "nurture",
};
const VALID_DEAL_STAGE = new Set(Object.values(LEGACY_DEAL_STAGE));
// Reasons inferred for legacy outcome stages that carried no explicit lost reason.
const IMPLIED_LOST_REASON = { disqualified: "Not a Fit", unresponsive: "No Response" };

const load = async (collection) =>
  (await client.query("select id, data from crm_records where collection = $1", [collection])).rows.map((r) => r.data);

const write = async (collection, rec) => {
  if (!APPLY) return;
  await client.query(
    `insert into crm_records (collection, id, data, updated_at) values ($1, $2, $3::jsonb, now())
     on conflict (collection, id) do update set data = excluded.data, updated_at = now()`,
    [collection, rec.id, JSON.stringify(rec)],
  );
};

await client.connect();
try {
  const leads = await load("leads");
  const contacts = await load("contacts");
  const deals = await load("deals");
  console.log(`Loaded ${leads.length} leads, ${contacts.length} contacts, ${deals.length} deals\n`);

  // ── Phase 0: one person per human ─────────────────────────────────────────
  const byEmail = new Map();
  const byPhone = new Map();
  for (const c of contacts) {
    if (emailKey(c.email)) byEmail.set(emailKey(c.email), c);
    for (const p of [c.phone, c.sms]) if (phoneKey(p)) byPhone.set(phoneKey(p), c);
  }

  // lead id -> resolved contact id, so the cross-link pass below sees this run's work.
  const resolvedContact = new Map();
  const newContacts = [];
  let linked = 0, created = 0, alreadyLinked = 0;
  for (const raw of leads) {
    if (raw.contactId) { alreadyLinked++; resolvedContact.set(raw.id, raw.contactId); continue; }

    const name = String(raw.name || [raw.firstName, raw.lastName].filter(Boolean).join(" ") || "").trim();
    const email = emailKey(raw.email);
    const phone = phoneKey(raw.phone);
    const status =
      (VALID_STATUS.has(raw.status) && raw.status) ||
      LEGACY_STAGE_TO_STATUS[raw.stage] ||
      INBOUND_TO_STATUS[raw.status] ||
      "new";

    let contact = (email && byEmail.get(email)) || (phone && byPhone.get(phone)) || null;
    if (contact) {
      linked++;
      console.log(`  link   ${name.padEnd(20)} -> existing contact ${contact.id}`);
    } else {
      contact = {
        id: genId("ct"), name: name || email || "Unnamed lead",
        firstName: raw.firstName || name.split(" ")[0] || "", lastName: raw.lastName || name.split(" ").slice(1).join(" "),
        title: raw.title || "", company: raw.company || "", type: "lead", status: "active",
        email: raw.email || "", phone: raw.phone || "", city: "", state: "",
        source: raw.source || "Website", owner: raw.owner || "", tags: [], notes: "",
        lastContact: String(raw.createdAt || new Date().toISOString()).slice(0, 10),
        createdAt: raw.createdAt || new Date().toISOString(),
      };
      created++;
      if (email) byEmail.set(email, contact);
      if (phone) byPhone.set(phone, contact);
      console.log(`  create ${name.padEnd(20)} -> new contact ${contact.id}`);
      newContacts.push(contact);
      await write("contacts", contact);
    }

    const lead = {
      id: raw.id, contactId: contact.id, status,
      source: raw.source || "Other", campaign: raw.campaign, interest: raw.interest, kind: raw.kind,
      subject: raw.subject, message: raw.message, meta: raw.meta,
      value: Number(raw.value || 0) || 0, owner: raw.owner || "", notes: raw.notes || "",
      opportunityId: raw.opportunityId || null, createdAt: raw.createdAt || new Date().toISOString(),
      capturedName: name || undefined, capturedEmail: raw.email || undefined,
      capturedPhone: raw.phone || undefined, capturedCompany: raw.company || undefined,
    };
    resolvedContact.set(raw.id, contact.id);
    await write("leads", lead);
  }

  // ── Phase 1: deals become opportunities ───────────────────────────────────
  const migrated = new Map();
  let staged = 0, enriched = 0;
  for (const d of deals) {
    const stage = VALID_DEAL_STAGE.has(d.stage) ? d.stage : LEGACY_DEAL_STAGE[d.stage] || "new_working";
    const changed = stage !== d.stage;
    if (changed) staged++;

    const closed = stage === "closed_won" || stage === "closed_lost";
    const next = {
      ...d,
      stage,
      // Preserve the pre-migration stage so nothing about the deal's past is lost.
      stageEnteredAt: d.stageEnteredAt || d.createdAt,
      stageHistory: d.stageHistory || [{ stage, at: d.createdAt, by: d.owner || "migration", note: changed ? `migrated from "${d.stage}"` : undefined }],
      ownerHistory: d.ownerHistory || (d.owner ? [{ owner: d.owner, at: d.createdAt, by: "migration" }] : []),
      checklist: d.checklist || {},
      nextStep: d.nextStep ?? null,
      stalled: d.stalled ?? null,
      leadId: d.leadId ?? null,
      accountId: d.accountId ?? null,
      closedAt: d.closedAt ?? (closed ? d.closeDate : null),
      lostReason: d.lostReason || (stage === "closed_lost" ? IMPLIED_LOST_REASON[d.stage] : undefined),
    };
    if (changed || !d.stageHistory) enriched++;
    console.log(`  deal   ${String(d.name).slice(0, 34).padEnd(36)} ${String(d.stage).padEnd(14)} -> ${stage}`);
    migrated.set(d.id, next);
    await write("deals", next);
  }

  // Every live deal came through the UI with contactId null, so the pipeline is
  // currently disconnected from the CRM. Reattach by company name, but only when
  // exactly one contact matches — a wrong link is worse than no link.
  const companyKey = (v) => (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const contactsByCompany = new Map();
  for (const c of [...contacts, ...newContacts]) {
    const k = companyKey(c.company);
    if (!k) continue;
    if (!contactsByCompany.has(k)) contactsByCompany.set(k, []);
    contactsByCompany.get(k).push(c);
  }

  let dealsLinked = 0, dealsAmbiguous = 0;
  for (const d of deals) {
    if (d.contactId) continue;
    const candidates = contactsByCompany.get(companyKey(d.client)) || [];
    if (candidates.length === 1) {
      d.contactId = candidates[0].id;
      dealsLinked++;
      console.log(`  attach ${String(d.name).slice(0, 34).padEnd(36)} -> ${candidates[0].name} (${candidates[0].id})`);
      await write("deals", { ...(migrated.get(d.id) || d), contactId: candidates[0].id });
    } else if (candidates.length > 1) {
      dealsAmbiguous++;
      console.log(`  SKIP   ${String(d.name).slice(0, 34).padEnd(36)} -> ${candidates.length} contacts at "${d.client}", needs a human`);
    }
  }

  // Cross-link leads to opportunities that share a contact.
  const dealByContact = new Map();
  for (const d of deals) if (d.contactId) dealByContact.set(d.contactId, d);
  let crossLinked = 0;
  for (const raw of leads) {
    const cid = resolvedContact.get(raw.id) || raw.contactId;
    if (!cid) continue;
    const deal = dealByContact.get(cid);
    if (deal && !raw.opportunityId) {
      crossLinked++;
      await write("leads", { ...raw, contactId: cid, opportunityId: deal.id, status: "in_pipeline" });
    }
  }

  console.log(`\nLeads    : ${linked} linked to existing contacts, ${created} contacts created, ${alreadyLinked} already linked`);
  console.log(`Deals    : ${staged} stages remapped, ${enriched} enriched with history`);
  console.log(`Attach   : ${dealsLinked} deals reattached to a contact, ${dealsAmbiguous} ambiguous (left for a human)`);
  console.log(`Crosslink: ${crossLinked} leads tied to an existing opportunity`);
  console.log(APPLY ? "\nAPPLIED." : "\nDry run — nothing written. Re-run with --apply.");
} finally {
  await client.end();
}
