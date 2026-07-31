// Period-driven analytics data. Demo numbers for the Foundation phase; each stat
// carries an href to its source page so the whole dashboard is navigable.

export type Period = "daily" | "monthly" | "annual";
export const PERIODS: { id: Period; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual" },
];

export type Tone = "brand" | "success" | "warning" | "destructive" | "muted" | "default";
export type Stat = { key: string; label: string; value: string; hint?: string; href: string; tone?: Tone };

export type Charts = {
  labels: string[];
  revenue: number[];
  plays: number[];
  revenueByIndustry: { label: string; value: number }[];
  activeClients: number[];
  activeLocations: number[];
};

export type Analytics = {
  playtime: Stat[];
  revenue: Stat[];
  partner: Stat[];
  devices: Stat[];
  charts: Charts;
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-US");
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

// Per-period snapshots. window = the hint suffix; scale = rough magnitude driver.
const SNAP: Record<Period, {
  window: string;
  hourlyPlays: number; dailyPlays: number; advertisers: number; locations: number; adspace: number;
  dailyRevenue: number; prospectiveRevenue: number; newAdSpots: number; newClients: number; newLocations: number;
  radioClients: number; radioSpots: number; radioRevenue: number; affiliateSpots: number; affiliateRevenue: number;
  devices: { online: number; warning: number; offline: number; repairs: number; installations: number; errors: number };
  charts: Charts;
}> = {
  daily: {
    window: "today",
    hourlyPlays: 4910, dailyPlays: 118000, advertisers: 68, locations: 214, adspace: 892,
    dailyRevenue: 13120, prospectiveRevenue: 184000, newAdSpots: 6, newClients: 1, newLocations: 2,
    radioClients: 8, radioSpots: 61, radioRevenue: 1840, affiliateSpots: 4, affiliateRevenue: 640,
    devices: { online: 821, warning: 54, offline: 17, repairs: 6, installations: 3, errors: 0 },
    charts: {
      labels: ["12a", "4a", "8a", "12p", "4p", "8p"],
      revenue: [1100, 640, 1980, 2760, 3210, 2430],
      plays: [3200, 1800, 9800, 21000, 24600, 18400],
      revenueByIndustry: [
        { label: "Hospitality", value: 4200 }, { label: "Retail", value: 3800 },
        { label: "Food & Bev", value: 1600 }, { label: "Events", value: 900 }, { label: "Real Estate", value: 1200 },
      ],
      activeClients: [96, 98, 101, 104, 103, 105],
      activeLocations: [198, 201, 205, 208, 210, 214],
    },
  },
  monthly: {
    window: "this month",
    hourlyPlays: 4720, dailyPlays: 113000, advertisers: 68, locations: 214, adspace: 892,
    dailyRevenue: 12480, prospectiveRevenue: 184000, newAdSpots: 84, newClients: 6, newLocations: 14,
    radioClients: 8, radioSpots: 61, radioRevenue: 18400, affiliateSpots: 41, affiliateRevenue: 8600,
    devices: { online: 821, warning: 54, offline: 17, repairs: 6, installations: 14, errors: 0 },
    charts: {
      labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
      revenue: [10200, 11100, 12400, 13200],
      plays: [268000, 291000, 312000, 336000],
      revenueByIndustry: [
        { label: "Hospitality", value: 15800 }, { label: "Retail", value: 14500 },
        { label: "Food & Bev", value: 4200 }, { label: "Events", value: 1900 }, { label: "Real Estate", value: 3200 },
      ],
      activeClients: [98, 101, 104, 107],
      activeLocations: [201, 206, 210, 214],
    },
  },
  annual: {
    window: "this year",
    hourlyPlays: 4520, dailyPlays: 108000, advertisers: 68, locations: 214, adspace: 892,
    dailyRevenue: 11960, prospectiveRevenue: 184000, newAdSpots: 342, newClients: 142, newLocations: 214,
    radioClients: 8, radioSpots: 61, radioRevenue: 214000, affiliateSpots: 128, affiliateRevenue: 96000,
    devices: { online: 821, warning: 54, offline: 17, repairs: 24, installations: 214, errors: 3 },
    charts: {
      labels: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      revenue: [21400, 23800, 26100, 24900, 28700, 31200, 33800, 36400, 39100, 41800, 44200, 46900],
      plays: [612000, 688000, 731000, 704000, 812000, 903000, 968000, 1044000, 1121000, 1198000, 1276000, 1362000],
      revenueByIndustry: [
        { label: "Hospitality", value: 189000 }, { label: "Retail", value: 174000 },
        { label: "Food & Bev", value: 50000 }, { label: "Events", value: 23000 }, { label: "Real Estate", value: 38000 },
      ],
      activeClients: [58, 64, 71, 78, 86, 94, 101, 108, 118, 126, 134, 142],
      activeLocations: [82, 96, 112, 128, 142, 158, 170, 182, 194, 202, 208, 214],
    },
  },
};

const R = {
  advertisers: "/app/admin/advertisers",
  clients: "/app/admin/clients",
  advertising: "/app/admin/advertising",
  audio: "/app/admin/audio",
  billing: "/app/admin/billing",
  pipeline: "/app/admin/pipeline",
  revenueModels: "/app/admin/revenue-models",
  radio: "/app/admin/radio-stations",
  devices: "/app/admin/devices",
  reports: "/app/admin/reports",
};

export function getAnalytics(period: Period): Analytics {
  const s = SNAP[period];
  const w = s.window;
  return {
    playtime: [
      { key: "hourly", label: "Hourly Play-Times", value: num.format(s.hourlyPlays), hint: `avg / hr · ${w}`, href: R.reports },
      { key: "daily", label: "Daily Play-Times", value: k(s.dailyPlays), hint: `avg / day · ${w}`, href: R.reports },
      { key: "advertisers", label: "Total Advertisers", value: num.format(s.advertisers), hint: "active accounts", href: R.advertisers },
      { key: "locations", label: "Total Locations", value: num.format(s.locations), hint: "across clients", href: R.clients },
      { key: "adspace", label: "Total Adspace", value: num.format(s.adspace), hint: "device slots", href: R.advertising },
    ],
    revenue: [
      { key: "dailyrev", label: "Daily Revenue", value: usd.format(s.dailyRevenue), hint: `avg / day · ${w}`, href: R.billing, tone: "brand" },
      { key: "prospective", label: "Prospective Revenue", value: usd.format(s.prospectiveRevenue), hint: "weighted pipeline", href: R.pipeline },
      { key: "newspots", label: "New Ad Spots", value: num.format(s.newAdSpots), hint: w, href: R.audio },
      { key: "newclients", label: "New Clients", value: num.format(s.newClients), hint: w, href: R.clients },
      { key: "newlocs", label: "New Locations", value: num.format(s.newLocations), hint: w, href: R.clients },
    ],
    partner: [
      { key: "radioclients", label: "Radio Station Clients", value: num.format(s.radioClients), hint: "partners", href: R.radio },
      { key: "radiospots", label: "Radio Spots", value: num.format(s.radioSpots), hint: "open inventory", href: R.radio },
      { key: "radiorev", label: "Radio Revenue", value: usd.format(s.radioRevenue), hint: w, href: R.radio, tone: "brand" },
      { key: "affspots", label: "Affiliate Spots", value: num.format(s.affiliateSpots), hint: w, href: R.advertising },
      { key: "affrev", label: "Affiliate Revenue", value: usd.format(s.affiliateRevenue), hint: w, href: R.revenueModels, tone: "brand" },
    ],
    devices: [
      { key: "online", label: "Online", value: num.format(s.devices.online), href: R.devices, tone: "success" },
      { key: "warning", label: "Warning", value: num.format(s.devices.warning), href: R.devices, tone: "warning" },
      { key: "offline", label: "Offline", value: num.format(s.devices.offline), href: R.devices, tone: "muted" },
      { key: "repairs", label: "Repairs", value: num.format(s.devices.repairs), href: R.devices, tone: "warning" },
      { key: "installs", label: "Installations", value: num.format(s.devices.installations), hint: w, href: R.devices, tone: "brand" },
      { key: "errors", label: "Errors", value: num.format(s.devices.errors), href: R.devices, tone: "destructive" },
    ],
    charts: s.charts,
  };
}
