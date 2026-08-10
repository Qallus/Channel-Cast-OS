// Contacts CRM model — aligned with the CMI web app, retrofitted for Channel Cast.
// A single "contacts" collection holds everyone; `type` moves a record through
// Lead → Prospect → Client, or leaves it as a plain Contact.

export type ContactType = "contact" | "lead" | "prospect" | "client";
export type ContactStatus = "active" | "inactive" | "archived";

export type Contact = {
  id: string;
  // Name: `name` is the display value; first/last are kept for CSV alignment.
  name: string;
  firstName?: string;
  lastName?: string;
  title: string;
  company: string;
  type: ContactType;
  status: ContactStatus;
  email: string;
  phone: string;
  sms?: string;
  website?: string;
  address?: string;
  city: string;
  state: string;
  zip?: string;
  source?: string;
  owner: string;
  tags: string[];
  photoUrl?: string;
  logoUrl?: string;
  notes: string;
  lastContact: string; // ISO date
  createdAt: string;
  // Imported/enriched fields (e.g. from a CSV) shown as accordion categories.
  details?: Record<string, string>;
};

export const CONTACT_TYPE: Record<ContactType, { label: string; plural: string; tone: string; description: string }> = {
  contact: { label: "Contact", plural: "Contacts", tone: "bg-secondary text-secondary-foreground", description: "Just a contact." },
  lead: { label: "Lead", plural: "Leads", tone: "bg-warning/15 text-warning", description: "A new opportunity, not yet qualified." },
  prospect: { label: "Prospect", plural: "Prospects", tone: "bg-brand/15 text-brand-strong", description: "A qualified lead moving toward a deal." },
  client: { label: "Client", plural: "Clients", tone: "bg-success/15 text-success", description: "Doing business with Channel Cast." },
};
export const CONTACT_TYPE_ORDER: ContactType[] = ["contact", "lead", "prospect", "client"];
// The natural progression used by the "Convert" quick action.
export const CONTACT_TYPE_NEXT: Record<ContactType, ContactType | null> = { lead: "prospect", prospect: "client", client: null, contact: "lead" };

export const CONTACT_STATUS: Record<ContactStatus, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-success/15 text-success" },
  inactive: { label: "Inactive", tone: "bg-muted text-muted-foreground" },
  archived: { label: "Archived", tone: "bg-muted text-muted-foreground" },
};
export const CONTACT_STATUS_ORDER: ContactStatus[] = ["active", "inactive", "archived"];

// Profile tags that further define a contact — used for filtering and search.
export const CONTACT_TAGS: string[] = [
  "Radio Station", "Advertiser", "Voice Talent", "Voice Personality", "Reseller", "Affiliate",
  "Partner", "Media", "Property Manager", "Installer", "Electrician", "Marketing", "Advertising",
  "Agency", "Venue", "Vendor", "Sub Contractor", "Designer",
];

// Group an imported detail key into a display category (like CMI's IMPORTED DETAILS).
export const DETAIL_CATEGORIES = ["Person", "Company", "Location", "Industry", "Online Profiles", "More Details"] as const;
export type DetailCategory = (typeof DETAIL_CATEGORIES)[number];

export function categorizeDetail(key: string): DetailCategory {
  const k = key.toLowerCase();
  if (/(country|city|state|zip|postal|address|street|region|location)/.test(k)) return "Location";
  if (/(industry|sub-?industry|sector|naics|sic|vertical)/.test(k)) return "Industry";
  if (/(linkedin|twitter|facebook|instagram|website|url|profile|social|handle)/.test(k)) return "Online Profiles";
  if (/(company|employer|employees|founded|revenue|hq|headquarters|ownership|business model|organization|firm)/.test(k)) return "Company";
  if (/(name|title|department|job|role|manager|management|seniority|education|email|phone|birthday|gender)/.test(k)) return "Person";
  return "More Details";
}

export function contactName(c: Contact): string {
  return c.name?.trim() || [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || c.email || "Unnamed";
}

export const seedContacts: Contact[] = [
  { id: "ct_dana", name: "Dana Whitfield", firstName: "Dana", lastName: "Whitfield", title: "VP Operations", company: "Oasis Tower Resorts", type: "client", status: "active", email: "dana@oasistower.com", phone: "+1 480 555 0142", city: "Scottsdale", state: "AZ", source: "Referral", owner: "Jeremy Waters", tags: ["Venue", "Advertiser"], notes: "Signed off on the two-tower expansion. Prefers email.", lastContact: "2026-07-24", createdAt: "2026-02-11T00:00:00.000Z", details: { "Job Function": "Operations", "Employees": "500", "Primary Industry": "Hospitality" } },
  { id: "ct_marcus", name: "Marcus Lee", firstName: "Marcus", lastName: "Lee", title: "Property Manager", company: "Copper Mesa Apartments", type: "client", status: "active", email: "marcus@coppermesa.living", phone: "+1 480 555 0110", city: "Tempe", state: "AZ", source: "Inbound", owner: "Jeremy Waters", tags: ["Property Manager"], notes: "Internal advocate. Wants a health dashboard for the pool zone.", lastContact: "2026-07-19", createdAt: "2026-03-02T00:00:00.000Z" },
  { id: "ct_priya", name: "Priya Nair", firstName: "Priya", lastName: "Nair", title: "Marketing Director", company: "Harbor Lights Resort", type: "prospect", status: "active", email: "priya@harborlights.com", phone: "+1 619 555 0188", city: "San Diego", state: "CA", source: "Website", owner: "Jordan Cole", tags: ["Marketing", "Advertiser"], notes: "Evaluating AI-vision upgrade. Send ROI one-pager.", lastContact: "2026-07-27", createdAt: "2026-01-19T00:00:00.000Z" },
  { id: "ct_riley", name: "Riley Chen", firstName: "Riley", lastName: "Chen", title: "Store Owner", company: "Summit Outfitters", type: "prospect", status: "active", email: "riley@summitoutfitters.co", phone: "+1 303 555 0166", city: "Denver", state: "CO", source: "Event", owner: "Jeremy Waters", tags: ["Advertiser"], notes: "Reviewing the pilot proposal. Follow up next week.", lastContact: "2026-07-20", createdAt: "2026-07-14T00:00:00.000Z" },
  { id: "ct_tony", name: "Tony Bruno", firstName: "Tony", lastName: "Bruno", title: "Owner", company: "Windy City Pizza Co", type: "lead", status: "active", email: "tony@windycitypizza.com", phone: "+1 312 555 0129", city: "Chicago", state: "IL", source: "Cold outreach", owner: "Jordan Cole", tags: ["Advertiser"], notes: "Price sensitive — wants revenue-share terms before committing.", lastContact: "2026-07-26", createdAt: "2026-07-25T00:00:00.000Z" },
  { id: "ct_wes", name: "Wes Okafor", firstName: "Wes", lastName: "Okafor", title: "Program Director", company: "KZAP 104.3", type: "lead", status: "active", email: "wes@kzap.fm", phone: "+1 916 555 0155", city: "Sacramento", state: "CA", source: "Partner intro", owner: "Jeremy Waters", tags: ["Radio Station", "Partner"], notes: "Exploring a network affiliate deal.", lastContact: "2026-07-21", createdAt: "2026-07-10T00:00:00.000Z" },
  { id: "ct_owen", name: "Owen Diaz", firstName: "Owen", lastName: "Diaz", title: "Voice Talent", company: "Freelance", type: "contact", status: "active", email: "owen@localbrew.co", phone: "+1 602 555 0139", city: "Phoenix", state: "AZ", source: "Roster", owner: "Jordan Cole", tags: ["Voice Talent", "Voice Personality"], notes: "Warm, versatile read. Available for seasonal spots.", lastContact: "2026-07-22", createdAt: "2026-06-18T00:00:00.000Z" },
  { id: "ct_nora", name: "Nora Patel", firstName: "Nora", lastName: "Patel", title: "Installer", company: "Desert AV", type: "contact", status: "active", email: "nora@desertav.com", phone: "+1 702 555 0184", city: "Las Vegas", state: "NV", source: "Vendor", owner: "Jeremy Waters", tags: ["Installer", "Electrician"], notes: "Handles device installs across the Vegas metro.", lastContact: "2026-07-18", createdAt: "2026-05-16T00:00:00.000Z" },
  { id: "ct_elena", name: "Elena Frost", firstName: "Elena", lastName: "Frost", title: "Reseller", company: "Fashion Row Media", type: "prospect", status: "inactive", email: "elena@fashionrow.com", phone: "+1 213 555 0197", city: "Los Angeles", state: "CA", source: "Referral", owner: "Jordan Cole", tags: ["Reseller", "Agency"], notes: "Reseller lead gone quiet — re-engage before fall.", lastContact: "2026-05-02", createdAt: "2025-12-05T00:00:00.000Z" },
];
