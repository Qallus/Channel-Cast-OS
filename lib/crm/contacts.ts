export type ContactStatus = "active" | "prospect" | "cold";
export type ContactRole = "decision_maker" | "champion" | "influencer" | "technical" | "billing";

export type Contact = {
  id: string;
  name: string;
  title: string;
  company: string;
  role: ContactRole;
  status: ContactStatus;
  email: string;
  phone: string;
  city: string;
  state: string;
  owner: string;
  lastContact: string; // ISO date
  notes: string;
  createdAt: string;
};

export const CONTACT_STATUS: Record<ContactStatus, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-success/15 text-success" },
  prospect: { label: "Prospect", tone: "bg-brand/15 text-brand" },
  cold: { label: "Cold", tone: "bg-muted text-muted-foreground" },
};
export const CONTACT_STATUS_ORDER: ContactStatus[] = ["active", "prospect", "cold"];

export const CONTACT_ROLE: Record<ContactRole, { label: string; tone: string }> = {
  decision_maker: { label: "Decision maker", tone: "bg-brand/15 text-brand" },
  champion: { label: "Champion", tone: "bg-success/15 text-success" },
  influencer: { label: "Influencer", tone: "bg-accent text-accent-foreground" },
  technical: { label: "Technical", tone: "bg-secondary text-secondary-foreground" },
  billing: { label: "Billing", tone: "bg-warning/15 text-warning" },
};
export const CONTACT_ROLE_ORDER: ContactRole[] = ["decision_maker", "champion", "influencer", "technical", "billing"];

export const seedContacts: Contact[] = [
  { id: "ct_dana", name: "Dana Whitfield", title: "VP Operations", company: "Oasis Tower Resorts", role: "decision_maker", status: "active", email: "dana@oasistower.com", phone: "+1 480 555 0142", city: "Scottsdale", state: "AZ", owner: "Alex Rivera", lastContact: "2026-07-24", notes: "Signed off on the two-tower expansion. Prefers email.", createdAt: "2026-02-11T00:00:00.000Z" },
  { id: "ct_marcus", name: "Marcus Lee", title: "Property Manager", company: "Copper Mesa Apartments", role: "champion", status: "active", email: "marcus@coppermesa.living", phone: "+1 480 555 0110", city: "Tempe", state: "AZ", owner: "Alex Rivera", lastContact: "2026-07-19", notes: "Internal advocate. Wants a health dashboard for the pool zone.", createdAt: "2026-03-02T00:00:00.000Z" },
  { id: "ct_priya", name: "Priya Nair", title: "Marketing Director", company: "Harbor Lights Resort", role: "decision_maker", status: "active", email: "priya@harborlights.com", phone: "+1 619 555 0188", city: "San Diego", state: "CA", owner: "Jordan Cole", lastContact: "2026-07-27", notes: "Evaluating AI-vision upgrade. Send ROI one-pager.", createdAt: "2026-01-19T00:00:00.000Z" },
  { id: "ct_sam", name: "Sam Ortiz", title: "Regional Director", company: "Northwind Retail Group", role: "decision_maker", status: "active", email: "sam@northwindretail.com", phone: "+1 512 555 0173", city: "Austin", state: "TX", owner: "Jordan Cole", lastContact: "2026-07-15", notes: "QBR scheduled. Owns budget for all 12 locations.", createdAt: "2025-11-28T00:00:00.000Z" },
  { id: "ct_riley", name: "Riley Chen", title: "Store Owner", company: "Summit Outfitters", role: "decision_maker", status: "prospect", email: "riley@summitoutfitters.co", phone: "+1 303 555 0166", city: "Denver", state: "CO", owner: "Alex Rivera", lastContact: "2026-07-20", notes: "Reviewing the pilot proposal. Follow up next week.", createdAt: "2026-07-14T00:00:00.000Z" },
  { id: "ct_tony", name: "Tony Bruno", title: "Owner", company: "Windy City Pizza Co", role: "decision_maker", status: "prospect", email: "tony@windycitypizza.com", phone: "+1 312 555 0129", city: "Chicago", state: "IL", owner: "Jordan Cole", lastContact: "2026-07-26", notes: "Price sensitive — wants revenue-share terms before committing.", createdAt: "2026-07-25T00:00:00.000Z" },
  { id: "ct_lucia", name: "Lucia Ramos", title: "GM", company: "Ocean Drive Group", role: "champion", status: "cold", email: "lucia@oceandrivegroup.com", phone: "+1 305 555 0151", city: "Miami", state: "FL", owner: "Jordan Cole", lastContact: "2026-06-30", notes: "Gone quiet since invoices lapsed. Needs a check-in call.", createdAt: "2026-04-08T00:00:00.000Z" },
  { id: "ct_owen", name: "Owen Diaz", title: "Events Lead", company: "Local Brew Co", role: "influencer", status: "active", email: "owen@localbrew.co", phone: "+1 602 555 0139", city: "Phoenix", state: "AZ", owner: "Jordan Cole", lastContact: "2026-07-22", notes: "Coordinating BrewFest rotation. Enthusiastic.", createdAt: "2026-06-18T00:00:00.000Z" },
  { id: "ct_nora", name: "Nora Patel", title: "Producer", company: "City Events LLC", role: "billing", status: "active", email: "nora@cityevents.vegas", phone: "+1 702 555 0184", city: "Las Vegas", state: "NV", owner: "Alex Rivera", lastContact: "2026-07-18", notes: "Handles POs and scheduling for seasonal runs.", createdAt: "2026-05-16T00:00:00.000Z" },
  { id: "ct_elena", name: "Elena Frost", title: "Brand Manager", company: "Fashion Row", role: "influencer", status: "cold", email: "elena@fashionrow.com", phone: "+1 213 555 0197", city: "Los Angeles", state: "CA", owner: "Alex Rivera", lastContact: "2026-05-02", notes: "Churned account. Re-engage before fall season.", createdAt: "2025-12-05T00:00:00.000Z" },
];
