export type ReportCategory = "Delivery" | "Revenue" | "Devices" | "Campaigns" | "Deal Desk";

export type Report = {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  format: "CSV" | "PDF";
  lastRun: string | null; // ISO date
  headers: string[];
  rows: (string | number)[][];
};

export const REPORT_CATEGORIES: ReportCategory[] = ["Delivery", "Revenue", "Devices", "Campaigns", "Deal Desk"];

export const CATEGORY_TONE: Record<ReportCategory, string> = {
  Delivery: "bg-brand/15 text-brand-strong",
  Revenue: "bg-success/15 text-success",
  Devices: "bg-accent text-accent-foreground",
  Campaigns: "bg-warning/15 text-warning",
  "Deal Desk": "bg-secondary text-secondary-foreground",
};

export const seedReports: Report[] = [
  {
    id: "rp_playback",
    name: "Playback delivery",
    description: "Plays, completions, and triggers by device over the period.",
    category: "Delivery",
    format: "CSV",
    lastRun: "2026-07-30",
    headers: ["Device", "Location", "Plays", "Completions", "Motion triggers"],
    rows: [
      ["Lobby Player · Oasis Tower", "Scottsdale, AZ", 4120, 3980, 2610],
      ["Pool Deck Zone B", "Tempe, AZ", 2880, 2740, 2210],
      ["Store 4 · Northwind", "Austin, TX", 5210, 5040, 3120],
      ["Sunrise Deck · Harbor", "San Diego, CA", 6100, 5920, 4010],
    ],
  },
  {
    id: "rp_revenue",
    name: "Revenue & payouts",
    description: "Gross billed, net to Channel Cast, and client payouts.",
    category: "Revenue",
    format: "CSV",
    lastRun: "2026-07-29",
    headers: ["Client", "Gross billed", "Net to CC", "Client payout"],
    rows: [
      ["Northwind Retail Group", 12400, 7440, 4960],
      ["Oasis Tower Resorts", 7800, 4680, 3120],
      ["Harbor Lights Resort", 6100, 3660, 2440],
      ["Copper Mesa Apartments", 3200, 1920, 1280],
    ],
  },
  {
    id: "rp_devices",
    name: "Device health",
    description: "Uptime, heartbeat drift, and firmware by device.",
    category: "Devices",
    format: "CSV",
    lastRun: "2026-07-30",
    headers: ["Device", "Status", "Uptime %", "Heartbeat drift (s)", "Firmware"],
    rows: [
      ["Lobby Player · Oasis Tower", "online", 99.8, 42, "agent-0.1.0"],
      ["Pool Deck Zone B", "warning", 96.1, 118, "agent-0.1.0"],
      ["Store 4 · Northwind", "online", 99.4, 51, "agent-0.1.0"],
      ["Harbor Front Desk", "offline", 87.2, 0, "agent-0.1.0"],
    ],
  },
  {
    id: "rp_campaigns",
    name: "Campaign performance",
    description: "Budget pacing and delivery by campaign.",
    category: "Campaigns",
    format: "PDF",
    lastRun: "2026-07-28",
    headers: ["Campaign", "Advertiser", "Budget", "Spent", "Plays"],
    rows: [
      ["Spring Patio Promo", "Oasis Tower Resorts", 18000, 11200, 41200],
      ["Sunrise Promo 30s", "Harbor Lights Resort", 16000, 9400, 190000],
      ["Memorial Spotlight", "Northwind Retail Group", 9000, 9000, 96400],
    ],
  },
  {
    id: "rp_quotes",
    name: "Quote SLA",
    description: "Open requests, SLA status, and win rate for the deal desk.",
    category: "Deal Desk",
    format: "CSV",
    lastRun: null,
    headers: ["Company", "Type", "Budget", "Status", "SLA due"],
    rows: [
      ["Desert Spine & Joint", "New booking", "$8k–$12k", "new", "2026-08-02"],
      ["Iron Peak Gyms", "New booking", "$15k+", "in_progress", "2026-08-08"],
      ["Maplewood Malls", "New booking", "$15k+", "quoted", "2026-08-06"],
    ],
  },
];
