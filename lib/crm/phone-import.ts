// Import contacts straight off a phone.
//
// Three routes into the same place, because Android gives us three and people
// arrive by whichever one their browser supports:
//
//   1. The Contact Picker API (`navigator.contacts`) — Chrome on Android opens
//      the real OS contact sheet, the user ticks people, we get structured data.
//      No file, no export, no Google account. This is the good path.
//   2. A vCard (.vcf) file — what "Contacts → Settings → Export" produces on
//      every Android build, and what iOS/desktop/Firefox users fall back to.
//   3. Neither, because they're on a laptop — the UI hands them a QR code to
//      re-open this page on the phone, where route 1 works.
//
// Everything here is pure: parsing and matching only, no DOM, no ids. The modal
// assigns ids at import time, which keeps this file unit-testable.

import type { Contact, ContactType } from "./contacts";

/**
 * `contactName` from ./contacts, but structural so it accepts a draft (which
 * has no id yet) as readily as a saved record. Type-only import above keeps
 * this file free of runtime deps, so the parser can be unit-tested directly.
 *
 * The phone number is in the fallback chain here and not in `contactName`:
 * phones happily store a number with no name attached, and "+1 480 555 0142"
 * is something you can recognize in the review list. "Unnamed" is not.
 */
type Named = { name?: string; firstName?: string; lastName?: string; email?: string; phone?: string };
function displayName(c: Named): string {
  return c.name?.trim() || [c.firstName, c.lastName].filter(Boolean).join(" ").trim()
    || c.email?.trim() || c.phone?.trim() || "Unnamed";
}

/** A parsed person, not yet a record — the id is minted when the user commits. */
export type ContactDraft = Omit<Contact, "id">;

/** A draft paired with what we found already sitting in the CRM. */
export type ImportCandidate = {
  /** Stable key for React lists and selection sets (drafts have no id yet). */
  key: string;
  draft: ContactDraft;
  /** An existing contact this one looks like, if any. */
  duplicateOf: Contact | null;
  /** Which field gave away the duplicate — shown to explain the match. */
  matchedOn: "email" | "phone" | "name" | null;
};

export const PHONE_IMPORT_SOURCE = "Phone";

// ── Contact Picker API ────────────────────────────────────────────────────────

/** The slice of the Contact Picker API we use. Not in lib.dom yet. */
export type ContactPickerAddress = {
  addressLine?: string[];
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
};
export type ContactPickerResult = {
  name?: string[];
  email?: string[];
  tel?: string[];
  address?: ContactPickerAddress[];
  icon?: Blob[];
};
type ContactsManager = {
  getProperties(): Promise<string[]>;
  select(properties: string[], options?: { multiple?: boolean }): Promise<ContactPickerResult[]>;
};

export function contactsManager(): ContactsManager | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { contacts?: ContactsManager };
  if (!nav.contacts || typeof nav.contacts.select !== "function") return null;
  // `ContactsManager` on window is the spec's own feature-detection hint; without
  // it, `navigator.contacts` may be an unrelated legacy object.
  if (typeof window !== "undefined" && !("ContactsManager" in window)) return null;
  return nav.contacts;
}

/** Can this browser open the OS contact sheet? Chrome on Android, over HTTPS. */
export function contactPickerSupported(): boolean {
  return contactsManager() !== null;
}

/** Map one picked person onto our shape. `photoUrl` is filled in by the caller. */
export function fromPicked(picked: ContactPickerResult): ContactDraft {
  const draft = blankDraft();
  draft.email = (picked.email ?? []).map((e) => e.trim()).find(Boolean) ?? "";
  const name = (picked.name ?? []).map((n) => n.trim()).find(Boolean) ?? "";
  if (name) applyName(draft, name);

  const tels = (picked.tel ?? []).map((t) => t.trim()).filter(Boolean);
  draft.phone = tels[0] ?? "";
  // A second number is almost always the mobile; keep it rather than drop it.
  if (tels[1]) draft.sms = tels[1];

  const addr = (picked.address ?? [])[0];
  if (addr) {
    draft.address = (addr.addressLine ?? []).filter(Boolean).join(", ");
    draft.city = addr.city ?? "";
    draft.state = addr.region ?? "";
    draft.zip = addr.postalCode ?? "";
  }
  draft.name = displayName(draft);
  return draft;
}

// ── vCard parsing ─────────────────────────────────────────────────────────────

type VLine = { name: string; params: Record<string, string[]>; value: string };

/**
 * Rejoin folded lines. Two flavours in the wild, and Android emits both:
 * RFC 2426 folding (continuation starts with a space or tab) and vCard 2.1
 * quoted-printable soft breaks (the line ends with a bare `=`).
 */
function unfold(text: string): string[] {
  const out: string[] = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const prev = out.length ? out[out.length - 1] : null;
    if (prev !== null && /^[ \t]/.test(line)) {
      out[out.length - 1] = prev + line.slice(1);
    } else if (prev !== null && prev.endsWith("=") && /ENCODING=QUOTED-PRINTABLE/i.test(prev)) {
      out[out.length - 1] = prev.slice(0, -1) + line;
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Split on `sep`, ignoring separators inside double quotes. */
function splitUnquoted(s: string, sep: string): string[] {
  const parts: string[] = [];
  let cur = "", quoted = false;
  for (const ch of s) {
    if (ch === '"') { quoted = !quoted; cur += ch; }
    else if (ch === sep && !quoted) { parts.push(cur); cur = ""; }
    else cur += ch;
  }
  parts.push(cur);
  return parts;
}

function parseLine(line: string): VLine | null {
  let colon = -1, quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ":" && !quoted) { colon = i; break; }
  }
  if (colon < 0) return null;

  const segments = splitUnquoted(line.slice(0, colon), ";");
  let name = segments[0].trim();
  if (name.includes(".")) name = name.slice(name.indexOf(".") + 1); // drop the "item1." group prefix
  if (!name) return null;

  const params: Record<string, string[]> = {};
  const push = (k: string, v: string) => { (params[k] ||= []).push(v); };
  for (const seg of segments.slice(1)) {
    const eq = seg.indexOf("=");
    // vCard 2.1 writes bare params: `TEL;CELL;VOICE:…`
    if (eq < 0) push("type", seg.trim().toUpperCase());
    else {
      const key = seg.slice(0, eq).trim().toLowerCase();
      for (const v of splitUnquoted(seg.slice(eq + 1), ",")) push(key, v.replace(/^"|"$/g, "").trim().toUpperCase());
    }
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

function decodeQuotedPrintable(s: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
      bytes.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(s.charCodeAt(i));
    }
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

function rawValue(line: VLine): string {
  const enc = (line.params.encoding ?? []).join(" ");
  return /QUOTED-PRINTABLE/i.test(enc) ? decodeQuotedPrintable(line.value) : line.value;
}

function decodeValue(line: VLine): string {
  return rawValue(line).replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
}

/** Split a structured value (N, ADR, ORG) on unescaped semicolons. */
function components(line: VLine): string[] {
  const raw = rawValue(line);
  const parts: string[] = [];
  let cur = "";
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "\\" && i + 1 < raw.length) {
      cur += raw[i + 1] === "n" || raw[i + 1] === "N" ? "\n" : raw[i + 1];
      i++;
    } else if (raw[i] === ";") { parts.push(cur); cur = ""; }
    else cur += raw[i];
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

const typesOf = (line: VLine) => (line.params.type ?? []).map((t) => t.toUpperCase());
const isMobile = (line: VLine) => typesOf(line).some((t) => t === "CELL" || t === "MOBILE");

/** Contact photos ride along as base64. Skip the huge ones — these go in a row. */
const MAX_PHOTO_CHARS = 300_000;

function photoDataUrl(line: VLine): string | null {
  const value = line.value.replace(/\s/g, "");
  if (!value || value.length > MAX_PHOTO_CHARS) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^data:/i.test(value)) return value;
  const type = (line.params.type ?? []).map((t) => t.toLowerCase()).find((t) => /^(jpeg|jpg|png|gif|webp)$/.test(t));
  const mime = type ? `image/${type === "jpg" ? "jpeg" : type}` : "image/jpeg";
  return `data:${mime};base64,${value}`;
}

/** Fields we lift into the record; everything else lands in imported details. */
const KNOWN_FIELDS = new Set([
  "BEGIN", "END", "VERSION", "FN", "N", "ORG", "TITLE", "ROLE", "TEL", "EMAIL",
  "ADR", "URL", "NOTE", "PHOTO", "BDAY", "NICKNAME", "CATEGORIES", "PRODID", "REV", "UID",
]);

/**
 * Parse a .vcf file — one card or many, vCard 2.1 / 3.0 / 4.0.
 * Anything we don't map becomes an imported detail rather than being dropped.
 */
export function parseVCards(text: string): ContactDraft[] {
  const drafts: ContactDraft[] = [];
  let current: VLine[] | null = null;

  for (const raw of unfold(text)) {
    const line = parseLine(raw);
    if (!line) continue;
    if (line.name === "BEGIN" && /VCARD/i.test(line.value)) { current = []; continue; }
    if (line.name === "END" && /VCARD/i.test(line.value)) {
      if (current) { const draft = buildDraft(current); if (draft) drafts.push(draft); }
      current = null;
      continue;
    }
    current?.push(line);
  }
  // A file that never closed its last card still has usable people in it.
  if (current) { const draft = buildDraft(current); if (draft) drafts.push(draft); }
  return drafts;
}

function buildDraft(lines: VLine[]): ContactDraft | null {
  const draft = blankDraft();
  const details: Record<string, string> = {};
  const extraTels: string[] = [];
  const extraEmails: string[] = [];
  let fn = "", org = "", department = "";

  for (const line of lines) {
    switch (line.name) {
      case "FN":
        fn = decodeValue(line);
        break;
      case "N": {
        const [last, first, middle, prefix, suffix] = components(line);
        draft.firstName = first || "";
        draft.lastName = last || "";
        draft.name = [prefix, first, middle, last, suffix].filter(Boolean).join(" ").trim();
        break;
      }
      case "ORG": {
        const [company, dept] = components(line);
        org = company || "";
        department = dept || "";
        break;
      }
      case "TITLE":
      case "ROLE":
        if (!draft.title) draft.title = decodeValue(line);
        break;
      case "TEL": {
        const tel = decodeValue(line);
        if (!tel) break;
        if (isMobile(line)) {
          // The mobile is the number you'd actually use — promote it, and keep
          // whatever was already in `phone` as a secondary.
          if (draft.phone && draft.phone !== tel) extraTels.push(draft.phone);
          draft.phone = tel;
          draft.sms = tel;
        } else if (!draft.phone) draft.phone = tel;
        else if (tel !== draft.phone) extraTels.push(tel);
        break;
      }
      case "EMAIL": {
        const email = decodeValue(line);
        if (!email) break;
        if (!draft.email) draft.email = email;
        else if (email !== draft.email) extraEmails.push(email);
        break;
      }
      case "ADR": {
        if (draft.city || draft.address) break;
        const [, , street, city, region, postal, country] = components(line);
        draft.address = street || "";
        draft.city = city || "";
        draft.state = region || "";
        draft.zip = postal || "";
        if (country) details["Country"] = country;
        break;
      }
      case "URL":
        if (!draft.website) draft.website = decodeValue(line);
        break;
      case "NOTE": {
        const note = decodeValue(line);
        if (note) draft.notes = [draft.notes, note].filter(Boolean).join("\n");
        break;
      }
      case "PHOTO": {
        const url = photoDataUrl(line);
        if (url && !draft.photoUrl) draft.photoUrl = url;
        break;
      }
      case "BDAY":
        details["Birthday"] = decodeValue(line);
        break;
      case "NICKNAME":
        details["Nickname"] = decodeValue(line);
        break;
      default: {
        if (KNOWN_FIELDS.has(line.name)) break;
        const value = decodeValue(line);
        // X-ANDROID-CUSTOM carries the phone's own bookkeeping — noise, not data.
        if (!value || line.name.startsWith("X-ANDROID")) break;
        details[prettyKey(line.name)] = value;
      }
    }
  }

  draft.company = org;
  if (department) details["Department"] = department;
  if (extraTels.length) details["Other phones"] = extraTels.join(", ");
  if (extraEmails.length) details["Other emails"] = extraEmails.join(", ");
  draft.details = details;

  // FN wins over the assembled N when both exist — it's what the phone displays.
  if (fn) draft.name = fn;
  if (!draft.firstName && !draft.lastName && draft.name) applyName(draft, draft.name);
  draft.name = displayName(draft);
  // A card with no name, no email and no number isn't a person, it's a stub.
  return draft.name === "Unnamed" ? null : draft;
}

/** `X-SKYPE-USERNAME` → `Skype Username`. */
function prettyKey(name: string): string {
  return name.replace(/^X-/i, "").split(/[-_]/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function blankDraft(type: ContactType = "contact"): ContactDraft {
  return {
    name: "", firstName: "", lastName: "", title: "", company: "", type, status: "active",
    email: "", phone: "", sms: "", website: "", address: "", city: "", state: "", zip: "",
    source: PHONE_IMPORT_SOURCE, owner: "", tags: [], notes: "",
    lastContact: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(), details: {},
  };
}

function applyName(draft: ContactDraft, full: string) {
  draft.name = full;
  const parts = full.split(/\s+/).filter(Boolean);
  draft.firstName = parts[0] ?? "";
  draft.lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
}

/**
 * Phone numbers for comparison only. Last 10 digits, so `+1 (480) 555-0142`
 * and `480-555-0142` are the same person — which is the whole point, since a
 * phone book and a CRM rarely agree on formatting.
 */
export function phoneKey(phone: string | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

const nameKey = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");

/** Find the existing contact this draft duplicates. Email, then phone, then name. */
export function findDuplicate(
  draft: ContactDraft,
  existing: Contact[],
): { contact: Contact; matchedOn: "email" | "phone" | "name" } | null {
  const email = draft.email.trim().toLowerCase();
  if (email) {
    const hit = existing.find((c) => c.email?.trim().toLowerCase() === email);
    if (hit) return { contact: hit, matchedOn: "email" };
  }
  const phone = phoneKey(draft.phone);
  if (phone.length >= 10) {
    const hit = existing.find((c) => phoneKey(c.phone) === phone || phoneKey(c.sms) === phone);
    if (hit) return { contact: hit, matchedOn: "phone" };
  }
  const name = nameKey(draft.name);
  if (name.length > 3) {
    const hit = existing.find((c) => nameKey(displayName(c)) === name);
    if (hit) return { contact: hit, matchedOn: "name" };
  }
  return null;
}

/**
 * Turn drafts into reviewable candidates: de-duplicated against each other
 * (phones love to hold the same person twice, once per synced account) and
 * matched against what's already in the CRM.
 */
export function toCandidates(drafts: ContactDraft[], existing: Contact[]): ImportCandidate[] {
  const seen = new Set<string>();
  const candidates: ImportCandidate[] = [];

  drafts.forEach((draft, i) => {
    const identity = draft.email.trim().toLowerCase() || phoneKey(draft.phone) || nameKey(draft.name);
    if (identity && seen.has(identity)) return;
    if (identity) seen.add(identity);
    const dup = findDuplicate(draft, existing);
    candidates.push({
      key: `${identity || "row"}-${i}`,
      draft,
      duplicateOf: dup?.contact ?? null,
      matchedOn: dup?.matchedOn ?? null,
    });
  });

  return candidates;
}

const MERGEABLE = ["title", "company", "email", "phone", "sms", "website", "address", "city", "state", "zip", "photoUrl"] as const;

/**
 * Merge a phone record onto an existing contact: fill the blanks, never
 * overwrite. What's already in the CRM was typed by a person and outranks a
 * phone book.
 */
export function mergeOnto(existing: Contact, draft: ContactDraft): Partial<Contact> {
  const patch: Partial<Contact> = {};
  for (const key of MERGEABLE) {
    const next = draft[key];
    if (next && !existing[key]) patch[key] = next;
  }
  const details = { ...(existing.details ?? {}) };
  let added = false;
  for (const [k, v] of Object.entries(draft.details ?? {})) {
    if (!details[k]) { details[k] = v; added = true; }
  }
  if (added) patch.details = details;
  return patch;
}
