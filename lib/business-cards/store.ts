// Server-side data layer for digital business cards, backed by the JSONB CRM
// store (lib/server/crm-db). Cards embed their links + sections; leads and
// analytics events are their own collections.
import { deleteRecord, listRecords, upsertRecords } from "@/lib/server/crm-db";
import { makeDefaultSections } from "./defaults";
import type {
  BusinessCard, BusinessCardEvent, BusinessCardLead, CardAnalytics, CardStats, EventType,
  OwnerOption, SaveCardPayload,
} from "./types";

function genId(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rnd}`;
}

export function slugify(input: string): string {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "card";
}

async function allCards(): Promise<BusinessCard[]> {
  const rows = await listRecords("business_cards");
  return rows as unknown as BusinessCard[];
}

async function ensureUniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const cards = await allCards();
  const taken = new Set(cards.filter((c) => c.id !== ignoreId).map((c) => c.slug));
  const root = slugify(base);
  if (!taken.has(root)) return root;
  for (let i = 2; i < 80; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// ── Reads ──────────────────────────────────────────────────────────────────────

export async function loadCardsForViewer(opts: { all: boolean; ownerId: string | null }): Promise<BusinessCard[]> {
  const cards = (await allCards()).filter((c) => c.status !== "archived");
  const scoped = opts.all ? cards : cards.filter((c) => c.owner_id === opts.ownerId);
  return scoped.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
}

export async function loadCardById(id: string): Promise<BusinessCard | null> {
  const cards = await allCards();
  return cards.find((c) => c.id === id) ?? null;
}

export async function loadPublicCardBySlug(slug: string): Promise<BusinessCard | null> {
  const cards = await allCards();
  return cards.find((c) => c.slug === slug && c.status === "published" && c.is_public) ?? null;
}

// ── Stats ────────────────────────────────────────────────────────────────────

export async function computeStats(cards: BusinessCard[]): Promise<CardStats> {
  const ids = new Set(cards.map((c) => c.id));
  let shares = 0, saves = 0, leads = 0, newLeads = 0;

  if (ids.size) {
    const events = (await listRecords("card_events")) as unknown as BusinessCardEvent[];
    for (const e of events) {
      if (!ids.has(e.card_id)) continue;
      if (e.event_type === "share") shares += 1;
      else if (e.event_type === "save_contact") saves += 1;
    }
    const leadRows = (await listRecords("card_leads")) as unknown as BusinessCardLead[];
    for (const l of leadRows) {
      if (!ids.has(l.card_id)) continue;
      leads += 1;
      if (l.status === "new") newLeads += 1;
    }
  }

  return {
    products: cards.length,
    published: cards.filter((c) => c.status === "published").length,
    views: cards.reduce((s, c) => s + (c.view_count || 0), 0),
    clicks: cards.reduce((s, c) => s + (c.click_count || 0), 0),
    nfcReady: cards.filter((c) => c.nfc_status && c.nfc_status !== "not_ordered").length,
    shares, saves, leads, newLeads,
  };
}

// ── Writes ─────────────────────────────────────────────────────────────────────

export async function saveCard(
  payload: SaveCardPayload,
  ctx: { ownerId: string; ownerEmail: string | null; ownerName: string | null; isAdmin: boolean },
): Promise<BusinessCard> {
  const isNew = !payload.id;
  const existing = payload.id ? await loadCardById(payload.id) : null;
  const now = new Date().toISOString();

  const base: BusinessCard = existing ?? {
    ...(payload as BusinessCard),
    id: genId("card"),
    owner_id: ctx.ownerId,
    owner_email: ctx.ownerEmail,
    owner_name: ctx.ownerName,
    view_count: 0,
    click_count: 0,
    created_at: now,
    updated_at: now,
    published_at: null,
    archived_at: null,
  };

  const merged: BusinessCard = { ...base, ...payload, id: base.id };

  // Ownership: admins may (re)assign; otherwise keep the creating user's ownership.
  if (isNew) {
    merged.owner_id = ctx.isAdmin && payload.owner_id ? payload.owner_id : ctx.ownerId;
    merged.owner_email = ctx.isAdmin && payload.owner_id ? (payload.owner_email ?? null) : ctx.ownerEmail;
    merged.owner_name = ctx.isAdmin && payload.owner_id ? (payload.owner_name ?? null) : ctx.ownerName;
    if (!merged.sections?.length) merged.sections = makeDefaultSections();
    if (!merged.links) merged.links = [];
    merged.created_at = base.created_at || now;
  } else if (ctx.isAdmin && payload.owner_id !== undefined) {
    merged.owner_id = payload.owner_id;
    merged.owner_email = payload.owner_email ?? merged.owner_email;
    merged.owner_name = payload.owner_name ?? merged.owner_name;
  }

  // Publish bookkeeping.
  if (payload.status === "published") {
    merged.is_public = true;
    merged.published_at = merged.published_at || now;
  } else if (payload.status === "archived") {
    merged.is_public = false;
    merged.archived_at = now;
  } else if (payload.status) {
    merged.is_public = payload.is_public ?? false;
  }

  const slugBase = payload.slug || merged.slug || merged.display_name || merged.card_name || "card";
  merged.slug = await ensureUniqueSlug(String(slugBase), merged.id);
  merged.updated_at = now;

  await upsertRecords("business_cards", [merged as unknown as { id: string } & Record<string, unknown>]);
  return merged;
}

export async function setCardStatus(id: string, status: BusinessCard["status"]): Promise<BusinessCard | null> {
  const card = await loadCardById(id);
  if (!card) return null;
  const now = new Date().toISOString();
  card.status = status;
  card.updated_at = now;
  if (status === "published") { card.is_public = true; card.published_at = card.published_at || now; }
  else if (status === "archived") { card.is_public = false; card.archived_at = now; }
  else card.is_public = false;
  await upsertRecords("business_cards", [card as unknown as { id: string } & Record<string, unknown>]);
  return card;
}

export async function reassignCard(id: string, owner: OwnerOption | null): Promise<BusinessCard | null> {
  const card = await loadCardById(id);
  if (!card) return null;
  card.owner_id = owner?.id ?? null;
  card.owner_name = owner?.name ?? null;
  card.owner_email = owner?.email ?? null;
  card.updated_at = new Date().toISOString();
  await upsertRecords("business_cards", [card as unknown as { id: string } & Record<string, unknown>]);
  return card;
}

export async function deleteCard(id: string): Promise<void> {
  await deleteRecord("business_cards", id);
}

// ── Public-side: events + leads ───────────────────────────────────────────────

export async function recordEvent(input: {
  cardId: string; eventType: EventType; linkId?: string | null;
  source?: string; deviceType?: string; referrer?: string | null;
}): Promise<void> {
  const event: BusinessCardEvent = {
    id: genId("evt"),
    card_id: input.cardId,
    link_id: input.linkId ?? null,
    event_type: input.eventType,
    source: input.source ?? "public_card",
    device_type: input.deviceType ?? null,
    referrer: input.referrer ?? null,
    created_at: new Date().toISOString(),
  };
  await upsertRecords("card_events", [event as unknown as { id: string } & Record<string, unknown>]);

  // Maintain denormalized counters on the card.
  const card = await loadCardById(input.cardId);
  if (!card) return;
  let changed = false;
  if (["view", "qr_scan", "nfc_tap"].includes(input.eventType)) { card.view_count = (card.view_count || 0) + 1; changed = true; }
  else if (["link_click", "copy_link"].includes(input.eventType)) {
    card.click_count = (card.click_count || 0) + 1; changed = true;
    if (input.linkId) {
      const link = card.links?.find((l) => l.id === input.linkId);
      if (link) link.click_count = (link.click_count || 0) + 1;
    }
  }
  if (changed) await upsertRecords("business_cards", [card as unknown as { id: string } & Record<string, unknown>]);
}

export async function createLead(input: {
  card: BusinessCard;
  name?: string; email?: string; phone?: string; company?: string; message?: string; preferredContact?: string;
}): Promise<void> {
  const lead: BusinessCardLead = {
    id: genId("lead"),
    card_id: input.card.id,
    owner_id: input.card.owner_id,
    owner_name: input.card.owner_name,
    card_name: input.card.card_name,
    card_display_name: input.card.display_name,
    name: input.name ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    company: input.company ?? null,
    message: input.message ?? null,
    preferred_contact: input.preferredContact ?? null,
    source: "public_card",
    status: "new",
    created_at: new Date().toISOString(),
  };
  await upsertRecords("card_leads", [lead as unknown as { id: string } & Record<string, unknown>]);
}

export async function loadLeads(opts: { all: boolean; ownerId: string | null }): Promise<BusinessCardLead[]> {
  const rows = (await listRecords("card_leads")) as unknown as BusinessCardLead[];
  const scoped = opts.all ? rows : rows.filter((l) => l.owner_id === opts.ownerId);
  return scoped.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

export async function loadLeadById(id: string): Promise<BusinessCardLead | null> {
  const rows = (await listRecords("card_leads")) as unknown as BusinessCardLead[];
  return rows.find((l) => l.id === id) ?? null;
}

export async function updateLeadStatus(id: string, status: BusinessCardLead["status"]): Promise<void> {
  const lead = await loadLeadById(id);
  if (!lead) return;
  lead.status = status;
  await upsertRecords("card_leads", [lead as unknown as { id: string } & Record<string, unknown>]);
}

export async function deleteLead(id: string): Promise<void> {
  await deleteRecord("card_leads", id);
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export async function loadCardAnalytics(cardId: string, rangeDays = 30): Promise<CardAnalytics> {
  const since = Date.now() - rangeDays * 86400000;
  const allEvents = (await listRecords("card_events")) as unknown as BusinessCardEvent[];
  const events = allEvents.filter((e) => e.card_id === cardId && new Date(e.created_at).getTime() >= since);
  const card = await loadCardById(cardId);
  const leadRows = (await listRecords("card_leads")) as unknown as BusinessCardLead[];
  const leadCount = leadRows.filter((l) => l.card_id === cardId).length;

  const totals: Record<string, number> = {};
  const linkClicks: Record<string, number> = {};
  const dayMap: Record<string, { views: number; clicks: number }> = {};

  const chartDays = Math.min(rangeDays, 14);
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dayMap[d.toISOString().slice(0, 10)] = { views: 0, clicks: 0 };
  }

  const VIEW = new Set(["view", "qr_scan", "nfc_tap"]);
  const CLICK = new Set(["link_click", "copy_link"]);
  for (const e of events) {
    totals[e.event_type] = (totals[e.event_type] ?? 0) + 1;
    if (e.link_id) linkClicks[e.link_id] = (linkClicks[e.link_id] ?? 0) + 1;
    const day = String(e.created_at).slice(0, 10);
    if (dayMap[day]) {
      if (VIEW.has(e.event_type)) dayMap[day].views += 1;
      else if (CLICK.has(e.event_type)) dayMap[day].clicks += 1;
    }
  }

  const labelById = new Map((card?.links ?? []).map((l) => [l.id, l.label]));
  const topLinks = Object.entries(linkClicks)
    .map(([id, count]) => ({ label: labelById.get(id) || "Link", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const sum = (keys: string[]) => keys.reduce((n, k) => n + (totals[k] ?? 0), 0);
  return {
    rangeDays,
    totals,
    views: sum(["view", "qr_scan", "nfc_tap"]),
    clicks: sum(["link_click", "copy_link"]),
    shares: totals["share"] ?? 0,
    saves: totals["save_contact"] ?? 0,
    leads: leadCount,
    daily: Object.entries(dayMap).map(([date, v]) => ({ date: date.slice(5), ...v })),
    topLinks,
  };
}

// ── Owner options (team members, for admin assignment) ─────────────────────────

export async function loadOwnerOptions(): Promise<OwnerOption[]> {
  try {
    const rows = await listRecords("team_members");
    return rows
      .map((r) => ({
        id: String(r.id),
        name: String((r.name as string) || (r.display_name as string) || (r.email as string) || "Member"),
        email: ((r.email as string) ?? null) || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
