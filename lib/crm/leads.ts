export type LeadStage = "new" | "contacted" | "qualified" | "unqualified";

export type Lead = {
  id: string;
  name: string;
  company: string;
  title: string;
  source: string;
  stage: LeadStage;
  value: number; // estimated deal value if it converts
  email: string;
  phone: string;
  owner: string;
  notes: string;
  createdAt: string;
};

export const LEAD_STAGE: Record<LeadStage, { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-brand/15 text-brand" },
  contacted: { label: "Contacted", tone: "bg-accent text-accent-foreground" },
  qualified: { label: "Qualified", tone: "bg-success/15 text-success" },
  unqualified: { label: "Unqualified", tone: "bg-muted text-muted-foreground" },
};
export const LEAD_STAGE_ORDER: LeadStage[] = ["new", "contacted", "qualified", "unqualified"];

export const LEAD_SOURCES = ["Website", "Referral", "Event", "Cold outreach", "Inbound call", "Partner", "Social"];

export const seedLeads: Lead[] = [
  { id: "ld_summit", name: "Riley Chen", company: "Summit Outfitters", title: "Store Owner", source: "Event", stage: "qualified", value: 24000, email: "riley@summitoutfitters.co", phone: "+1 303 555 0166", owner: "Alex Rivera", notes: "Met at retail expo. Pilot proposal sent; strong intent.", createdAt: "2026-07-14T00:00:00.000Z" },
  { id: "ld_windy", name: "Tony Bruno", company: "Windy City Pizza Co", title: "Owner", source: "Inbound call", stage: "contacted", value: 18000, email: "tony@windycitypizza.com", phone: "+1 312 555 0129", owner: "Jordan Cole", notes: "Wants revenue-share terms. Sending a proposal this week.", createdAt: "2026-07-25T00:00:00.000Z" },
  { id: "ld_bayside", name: "Grace Kim", company: "Bayside Wellness", title: "Founder", source: "Website", stage: "new", value: 9000, email: "grace@baysidewellness.com", phone: "+1 415 555 0121", owner: "Alex Rivera", notes: "Filled out demo form. Two studio locations.", createdAt: "2026-07-29T00:00:00.000Z" },
  { id: "ld_ironpeak", name: "Derek Vaughn", company: "Iron Peak Gyms", title: "Operations Manager", source: "Referral", stage: "qualified", value: 31000, email: "derek@ironpeakgyms.com", phone: "+1 720 555 0158", owner: "Jordan Cole", notes: "Referred by Northwind. 8 locations, motion-triggered audio fit.", createdAt: "2026-07-22T00:00:00.000Z" },
  { id: "ld_maplewood", name: "Sara Lindqvist", company: "Maplewood Malls", title: "Marketing Lead", source: "Partner", stage: "contacted", value: 42000, email: "sara@maplewoodmalls.com", phone: "+1 651 555 0173", owner: "Alex Rivera", notes: "Partner intro. Large footprint; needs procurement sign-off.", createdAt: "2026-07-20T00:00:00.000Z" },
  { id: "ld_coastal", name: "Miguel Santos", company: "Coastal Auto Group", title: "GM", source: "Cold outreach", stage: "new", value: 15000, email: "miguel@coastalauto.com", phone: "+1 858 555 0190", owner: "Jordan Cole", notes: "Opened outreach email twice. Follow up with a case study.", createdAt: "2026-07-28T00:00:00.000Z" },
  { id: "ld_verde", name: "Ana Torres", company: "Verde Cafes", title: "Owner", source: "Social", stage: "unqualified", value: 0, email: "ana@verdecafes.com", phone: "+1 512 555 0144", owner: "Alex Rivera", notes: "Single location, budget too small for now. Nurture.", createdAt: "2026-07-11T00:00:00.000Z" },
  { id: "ld_lakeside", name: "Paul Nguyen", company: "Lakeside Events", title: "Director", source: "Event", stage: "contacted", value: 12000, email: "paul@lakesideevents.com", phone: "+1 206 555 0167", owner: "Jordan Cole", notes: "Seasonal need. Interested in short campaign flights.", createdAt: "2026-07-24T00:00:00.000Z" },
];
