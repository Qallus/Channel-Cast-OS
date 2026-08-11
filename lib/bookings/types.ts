// Booking / appointment system — shared by the public /book wizard, the public
// booking API, and the dashboard Bookings manager. Persisted in the JSONB CRM
// store under the "bookings" and "event_pages" collections.

export type BookingStatus = "pending" | "confirmed" | "completed" | "canceled";

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "text-warning" },
  confirmed: { label: "Confirmed", tone: "text-brand-strong" },
  completed: { label: "Completed", tone: "text-success" },
  canceled: { label: "Canceled", tone: "text-destructive" },
};

export type AppointmentType = { id: string; name: string; description: string; minutes: number };

// Channel Cast appointment types (the advertising-network equivalent of CMI's
// construction meeting types).
export const APPOINTMENT_TYPES: AppointmentType[] = [
  { id: "discovery", name: "Discovery Call", description: "Intro call to see if Channel Cast fits your goals, audience, and budget.", minutes: 30 },
  { id: "ad-space", name: "Ad Space Consultation", description: "Find placement sites and audiences that match your campaign.", minutes: 30 },
  { id: "campaign", name: "Campaign Planning", description: "Plan flights, budgets, creative, and the play schedule.", minutes: 45 },
  { id: "creative", name: "Creative & Audio Review", description: "Review or produce your audio spots for the network.", minutes: 30 },
  { id: "site-walk", name: "Placement Site Walk", description: "On-site visit to scope a device placement at your location.", minutes: 60 },
  { id: "demo", name: "Device Demo", description: "See a motion-triggered audio device in action.", minutes: 30 },
  { id: "partner", name: "Partner / Reseller Onboarding", description: "Get set up to sell campaigns or host devices on the network.", minutes: 45 },
  { id: "radio", name: "Radio Station Partnership", description: "Explore exclusive market access for your station.", minutes: 30 },
];

export const EVENT_TYPES = ["open_house", "workshop", "webinar", "launch", "demo_day", "mixer"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  open_house: "Open House", workshop: "Workshop", webinar: "Webinar", launch: "Launch Event", demo_day: "Demo Day", mixer: "Partner Mixer",
};

export type EventStatus = "draft" | "published" | "archived";

export type Booking = {
  id: string;
  typeId: string;
  typeName: string;
  minutes: number;
  date: string;   // YYYY-MM-DD
  time: string;   // "HH:MM" 24-hour
  status: BookingStatus;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  projectName: string;
  notes: string;
  smsConsent: boolean;
  location: string;         // onsite / remote / phone
  clientVisible: boolean;
  showOnTimeline: boolean;
  // Links to other records (optional).
  contactId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  planId?: string | null;
  workspaceId?: string | null;
  assignedStaff?: string | null;
  source: "website" | "dashboard";
  createdAt: string;
};

export type EventPage = {
  id: string;
  title: string;
  slug: string;
  eventType: EventType;
  hostStaff: string;
  multiDay: boolean;
  date: string;       // YYYY-MM-DD
  endDate: string;    // for multi-day
  startTime: string;  // "HH:MM"
  endTime: string;
  projectId: string | null;
  status: EventStatus;
  locationType: "in_person" | "virtual" | "hybrid";
  location: string;
  capacity: number | null;
  showOnTimeline: boolean;
  showSpots: boolean;
  summary: string;
  description: string;
  photoUrl: string;
  videoUrl: string;
  gallery: string[];
  rsvps: string[];    // list of registrant emails
  createdAt: string;
};

// ── Availability + slot generation ────────────────────────────────────────────
export type AvailabilityRule = { day: string; start: string; end: string; available: boolean };

export const DEFAULT_AVAILABILITY: AvailabilityRule[] = [
  { day: "Monday", start: "09:00", end: "16:00", available: true },
  { day: "Tuesday", start: "09:00", end: "16:00", available: true },
  { day: "Wednesday", start: "09:00", end: "16:00", available: true },
  { day: "Thursday", start: "09:00", end: "16:00", available: true },
  { day: "Friday", start: "09:00", end: "16:00", available: true },
  { day: "Saturday", start: "00:00", end: "00:00", available: false },
  { day: "Sunday", start: "00:00", end: "00:00", available: false },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}
export function fmtTime(hhmm: string): string {
  const mins = toMinutes(hhmm);
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Open 15-minute slots for a given date (YYYY-MM-DD) and appointment length,
// from the availability rules, excluding already-taken times.
export function slotsForDate(dateStr: string, durationMin: number, taken: string[] = [], rules: AvailabilityRule[] = DEFAULT_AVAILABILITY): string[] {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return [];
  const rule = rules.find((r) => r.day === DAY_NAMES[d.getDay()]);
  if (!rule || !rule.available) return [];
  const start = toMinutes(rule.start);
  const end = toMinutes(rule.end);
  const out: string[] = [];
  for (let t = start; t + durationMin <= end; t += 15) {
    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    const val = `${hh}:${mm}`;
    if (!taken.includes(val)) out.push(val);
  }
  return out;
}

export const bookingName = (b: Pick<Booking, "firstName" | "lastName" | "email">) =>
  [b.firstName, b.lastName].filter(Boolean).join(" ") || b.email || "Guest";

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
