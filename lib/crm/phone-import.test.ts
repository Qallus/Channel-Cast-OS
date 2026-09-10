import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findDuplicate,
  fromPicked,
  mergeOnto,
  parseVCards,
  phoneKey,
  toCandidates,
  type ContactDraft,
} from "./phone-import.ts";
import type { Contact } from "./contacts.ts";

/** What Android's "Export to .vcf" actually writes: vCard 2.1, quoted-printable. */
const ANDROID_21 = [
  "BEGIN:VCARD",
  "VERSION:2.1",
  "N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Nu=C3=B1ez;Jos=C3=A9;;;",
  "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jos=C3=A9 Nu=C3=B1ez",
  "ORG;CHARSET=UTF-8:Desert AV;Field Ops",
  "TITLE:Install Lead",
  "TEL;HOME;VOICE:(480) 555-0110",
  "TEL;CELL;VOICE:+1 480-555-0142",
  "EMAIL;INTERNET:jose@desertav.com",
  "ADR;HOME:;;1200 W Camelback Rd;Phoenix;AZ;85013;USA",
  "X-ANDROID-CUSTOM:vnd.android.cursor.item/nickname;Joe;;;;;;;;;;;;;;",
  "NOTE;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Runs the Vegas metro crew=0A=",
  "Prefers texts",
  "END:VCARD",
].join("\r\n");

const VCARD_30 = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "N:Whitfield;Dana;;;",
  "FN:Dana Whitfield",
  "ORG:Oasis Tower Resorts",
  "TEL;TYPE=CELL:+1 (480) 555-0142",
  "EMAIL;TYPE=WORK:dana@oasistower.com",
  "URL:https://oasistower.com",
  "item1.X-ABLabel:Corporate",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Marcus Lee",
  "ORG:Copper Mesa Apartments",
  "TEL:4805550110",
  "NOTE:Wants a health dashboard\\, pool zone",
  "END:VCARD",
].join("\n");

const contact = (over: Partial<Contact>): Contact => ({
  id: "ct_x", name: "", title: "", company: "", type: "contact", status: "active",
  email: "", phone: "", city: "", state: "", owner: "", tags: [], notes: "",
  lastContact: "2026-01-01", createdAt: "2026-01-01T00:00:00.000Z", ...over,
});

describe("parseVCards — Android vCard 2.1", () => {
  const [jose] = parseVCards(ANDROID_21);

  it("decodes quoted-printable UTF-8 names", () => {
    assert.equal(jose.name, "José Nuñez");
    assert.equal(jose.firstName, "José");
    assert.equal(jose.lastName, "Nuñez");
  });

  it("reads bare vCard 2.1 params and prefers the mobile number", () => {
    assert.equal(jose.phone, "+1 480-555-0142");
    assert.equal(jose.sms, "+1 480-555-0142");
    assert.equal(jose.details?.["Other phones"], "(480) 555-0110");
  });

  it("splits ORG into company and department", () => {
    assert.equal(jose.company, "Desert AV");
    assert.equal(jose.details?.Department, "Field Ops");
  });

  it("maps the structured address", () => {
    assert.equal(jose.address, "1200 W Camelback Rd");
    assert.equal(jose.city, "Phoenix");
    assert.equal(jose.state, "AZ");
    assert.equal(jose.zip, "85013");
    assert.equal(jose.details?.Country, "USA");
  });

  it("joins quoted-printable soft line breaks into one note", () => {
    assert.equal(jose.notes, "Runs the Vegas metro crew\nPrefers texts");
  });

  it("drops the phone's own X-ANDROID bookkeeping", () => {
    assert.ok(!Object.keys(jose.details ?? {}).some((k) => /android/i.test(k)));
  });

  it("stamps the source so imported people are traceable", () => {
    assert.equal(jose.source, "Phone");
  });
});

describe("parseVCards — vCard 3.0", () => {
  const drafts = parseVCards(VCARD_30);

  it("reads every card in a multi-card file", () => {
    assert.equal(drafts.length, 2);
    assert.deepEqual(drafts.map((d) => d.name), ["Dana Whitfield", "Marcus Lee"]);
  });

  it("keeps grouped X- properties as imported details", () => {
    assert.equal(drafts[0].details?.["Ablabel"], "Corporate");
    assert.equal(drafts[0].website, "https://oasistower.com");
  });

  it("unescapes commas in values", () => {
    assert.equal(drafts[1].notes, "Wants a health dashboard, pool zone");
  });

  it("derives first/last from FN when there is no N", () => {
    assert.equal(drafts[1].firstName, "Marcus");
    assert.equal(drafts[1].lastName, "Lee");
  });
});

describe("parseVCards — malformed input", () => {
  it("returns nothing for junk rather than throwing", () => {
    assert.deepEqual(parseVCards("not a vcard at all"), []);
    assert.deepEqual(parseVCards(""), []);
  });

  it("skips cards with nothing usable on them at all", () => {
    assert.deepEqual(parseVCards("BEGIN:VCARD\nVERSION:3.0\nEND:VCARD"), []);
  });

  it("keeps a nameless card that at least has a number", () => {
    const [d] = parseVCards("BEGIN:VCARD\nVERSION:3.0\nTEL:4805550110\nEND:VCARD");
    assert.equal(d.name, "4805550110");
  });

  it("still reads a card whose END is missing", () => {
    const drafts = parseVCards("BEGIN:VCARD\nVERSION:3.0\nFN:Wes Okafor\nTEL:9165550155");
    assert.equal(drafts.length, 1);
    assert.equal(drafts[0].name, "Wes Okafor");
  });

  it("unfolds RFC 2426 continuation lines", () => {
    const [d] = parseVCards("BEGIN:VCARD\nFN:Priya Nair\nNOTE:Evaluating the AI-vision\n  upgrade\nEND:VCARD");
    assert.equal(d.notes, "Evaluating the AI-vision upgrade");
  });
});

describe("fromPicked", () => {
  it("maps the Contact Picker payload onto a draft", () => {
    const draft = fromPicked({
      name: ["Riley Chen"],
      email: ["riley@summitoutfitters.co"],
      tel: ["+1 303 555 0166", "3035550100"],
      address: [{ addressLine: ["18 Larimer St", "Unit 4"], city: "Denver", region: "CO", postalCode: "80202" }],
    });
    assert.equal(draft.name, "Riley Chen");
    assert.equal(draft.firstName, "Riley");
    assert.equal(draft.email, "riley@summitoutfitters.co");
    assert.equal(draft.phone, "+1 303 555 0166");
    assert.equal(draft.sms, "3035550100");
    assert.equal(draft.address, "18 Larimer St, Unit 4");
    assert.equal(draft.city, "Denver");
  });

  it("names a number-only entry after its number, not \"Unnamed\"", () => {
    const draft = fromPicked({ tel: ["4805550110"] });
    assert.equal(draft.phone, "4805550110");
    assert.equal(draft.name, "4805550110");
  });
});

describe("phoneKey", () => {
  it("ignores formatting and country code", () => {
    assert.equal(phoneKey("+1 (480) 555-0142"), "4805550142");
    assert.equal(phoneKey("480.555.0142"), "4805550142");
    assert.equal(phoneKey("00 1 480 555 0142"), "4805550142");
  });

  it("leaves short numbers alone rather than inventing a match", () => {
    assert.equal(phoneKey("911"), "911");
    assert.equal(phoneKey(undefined), "");
  });
});

describe("findDuplicate", () => {
  const existing = [
    contact({ id: "a", name: "Dana Whitfield", email: "dana@oasistower.com", phone: "+1 480 555 0142" }),
    contact({ id: "b", name: "Marcus Lee", phone: "+1 480 555 0110" }),
  ];
  const draft = (over: Partial<ContactDraft>): ContactDraft =>
    ({ ...parseVCards("BEGIN:VCARD\nFN:Someone Else\nEND:VCARD")[0], ...over });

  it("matches on email first", () => {
    const hit = findDuplicate(draft({ email: "DANA@oasistower.com" }), existing);
    assert.equal(hit?.contact.id, "a");
    assert.equal(hit?.matchedOn, "email");
  });

  it("matches on a differently formatted phone number", () => {
    const hit = findDuplicate(draft({ phone: "(480) 555-0110" }), existing);
    assert.equal(hit?.contact.id, "b");
    assert.equal(hit?.matchedOn, "phone");
  });

  it("falls back to the name", () => {
    const hit = findDuplicate(draft({ name: "marcus lee" }), existing);
    assert.equal(hit?.matchedOn, "name");
  });

  it("reports no match for someone new", () => {
    assert.equal(findDuplicate(draft({ email: "new@example.com" }), existing), null);
  });
});

describe("toCandidates", () => {
  it("collapses the same person listed twice on the phone", () => {
    const drafts = parseVCards(
      "BEGIN:VCARD\nFN:Tony Bruno\nEMAIL:tony@windycitypizza.com\nEND:VCARD\n" +
      "BEGIN:VCARD\nFN:Tony Bruno\nEMAIL:tony@windycitypizza.com\nTEL:3125550129\nEND:VCARD",
    );
    assert.equal(drafts.length, 2);
    assert.equal(toCandidates(drafts, []).length, 1);
  });

  it("flags the ones already in the CRM", () => {
    const drafts = parseVCards("BEGIN:VCARD\nFN:Dana Whitfield\nEMAIL:dana@oasistower.com\nEND:VCARD");
    const [c] = toCandidates(drafts, [contact({ id: "a", name: "Dana Whitfield", email: "dana@oasistower.com" })]);
    assert.equal(c.duplicateOf?.id, "a");
    assert.equal(c.matchedOn, "email");
  });
});

describe("mergeOnto", () => {
  const existing = contact({ id: "a", name: "Dana Whitfield", email: "dana@oasistower.com", company: "Oasis Tower Resorts", details: { Employees: "500" } });
  const [draft] = parseVCards([
    "BEGIN:VCARD",
    "FN:Dana Whitfield",
    "ORG:Oasis Towers LLC",
    "TEL;TYPE=CELL:+1 480 555 0142",
    "BDAY:1984-03-02",
    "END:VCARD",
  ].join("\n"));

  it("fills blanks without overwriting what someone typed", () => {
    const patch = mergeOnto(existing, draft);
    assert.equal(patch.phone, "+1 480 555 0142");
    assert.equal(patch.company, undefined, "company was already set and must not change");
  });

  it("adds new imported details and keeps the old ones", () => {
    const patch = mergeOnto(existing, draft);
    assert.equal(patch.details?.Birthday, "1984-03-02");
    assert.equal(patch.details?.Employees, "500");
  });

  it("returns an empty patch when the phone adds nothing", () => {
    const full = contact({ ...existing, phone: "+1 480 555 0142", sms: "+1 480 555 0142", details: { Birthday: "1984-03-02", Employees: "500" } });
    assert.deepEqual(mergeOnto(full, draft), {});
  });
});
