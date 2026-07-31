export type QuoteStatus = "new" | "in_progress" | "quoted" | "won" | "lost";

export type QuoteRequest = {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  requestType: string;
  budgetRange: string;
  locations: number;
  status: QuoteStatus;
  owner: string;
  notes: string;
  dueDate: string; // ISO date — SLA target
  createdAt: string;
};

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-brand/15 text-brand-strong" },
  in_progress: { label: "In progress", tone: "bg-accent text-accent-foreground" },
  quoted: { label: "Quoted", tone: "bg-warning/15 text-warning" },
  won: { label: "Won", tone: "bg-success/15 text-success" },
  lost: { label: "Lost", tone: "bg-destructive/15 text-destructive" },
};
export const QUOTE_STATUS_ORDER: QuoteStatus[] = ["new", "in_progress", "quoted", "won", "lost"];

export const QUOTE_TYPES = ["New booking", "Expansion", "Renewal", "Sponsorship", "Custom"];

export const seedQuotes: QuoteRequest[] = [
  { id: "qr_desert", company: "Desert Spine & Joint", contact: "Dr. Alan Pierce", email: "apierce@desertspine.com", phone: "+1 480 555 0201", requestType: "New booking", budgetRange: "$8k–$12k", locations: 2, status: "new", owner: "Alex Rivera", notes: "Hospital lobby audio. Wants calm, informational tone.", dueDate: "2026-08-02", createdAt: "2026-07-30T00:00:00.000Z" },
  { id: "qr_copper", company: "Copper Mesa Apartments", contact: "Marcus Lee", email: "marcus@coppermesa.living", phone: "+1 480 555 0110", requestType: "Expansion", budgetRange: "$3k–$5k", locations: 1, status: "in_progress", owner: "Alex Rivera", notes: "Adding pool-deck zone. Building quote now.", dueDate: "2026-07-31", createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "qr_northwind", company: "Northwind Retail Group", contact: "Sam Ortiz", email: "sam@northwindretail.com", phone: "+1 512 555 0173", requestType: "Expansion", budgetRange: "$15k+", locations: 4, status: "quoted", owner: "Jordan Cole", notes: "4-store add-on quote sent. Awaiting PO.", dueDate: "2026-08-05", createdAt: "2026-07-22T00:00:00.000Z" },
  { id: "qr_ironpeak", company: "Iron Peak Gyms", contact: "Derek Vaughn", email: "derek@ironpeakgyms.com", phone: "+1 720 555 0158", requestType: "New booking", budgetRange: "$15k+", locations: 8, status: "in_progress", owner: "Jordan Cole", notes: "8-location motion-audio rollout. Scoping devices.", dueDate: "2026-08-08", createdAt: "2026-07-24T00:00:00.000Z" },
  { id: "qr_maple", company: "Maplewood Malls", contact: "Sara Lindqvist", email: "sara@maplewoodmalls.com", phone: "+1 651 555 0173", requestType: "New booking", budgetRange: "$15k+", locations: 6, status: "quoted", owner: "Alex Rivera", notes: "Network rollout quote with procurement.", dueDate: "2026-08-06", createdAt: "2026-07-20T00:00:00.000Z" },
  { id: "qr_localbrew", company: "Local Brew Co", contact: "Owen Diaz", email: "owen@localbrew.co", phone: "+1 602 555 0139", requestType: "Sponsorship", budgetRange: "$5k–$12k", locations: 3, status: "won", owner: "Jordan Cole", notes: "BrewFest sponsorship — converted to booking.", dueDate: "2026-07-24", createdAt: "2026-07-15T00:00:00.000Z" },
  { id: "qr_verde", company: "Verde Cafes", contact: "Ana Torres", email: "ana@verdecafes.com", phone: "+1 512 555 0144", requestType: "New booking", budgetRange: "$1k–$3k", locations: 1, status: "lost", owner: "Alex Rivera", notes: "Budget too small for now. Nurturing for later.", dueDate: "2026-07-18", createdAt: "2026-07-11T00:00:00.000Z" },
  { id: "qr_windy", company: "Windy City Pizza Co", contact: "Tony Bruno", email: "tony@windycitypizza.com", phone: "+1 312 555 0129", requestType: "Custom", budgetRange: "$5k–$12k", locations: 5, status: "new", owner: "Jordan Cole", notes: "Wants a revenue-share custom quote.", dueDate: "2026-08-01", createdAt: "2026-07-29T00:00:00.000Z" },
];
