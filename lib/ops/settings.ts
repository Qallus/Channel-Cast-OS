// Org/workspace settings — stored in the browser for the Foundation phase (no
// org backend yet). Mirrors the Profile pattern; swaps to a Supabase settings
// row when the org model lands.

export type Settings = {
  orgName: string;
  website: string;
  supportEmail: string;
  timezone: string;
  currency: string;
  tagline: string;
  brandColor: string;
  integrations: {
    supabase: boolean;
    stripe: boolean;
    openai: boolean;
    tailscale: boolean;
  };
  notifications: {
    deviceAlerts: boolean;
    quoteAlerts: boolean;
    billingAlerts: boolean;
    weeklyDigest: boolean;
  };
  updatedAt: string | null;
};

export const STORAGE_KEY = "cc-settings";

export const DEFAULT_SETTINGS: Settings = {
  orgName: "Channel Cast",
  website: "channelcast.io",
  supportEmail: "support@channelcast.io",
  timezone: "America/Chicago",
  currency: "USD",
  tagline: "Motion-based audio advertising network.",
  brandColor: "#c6ff00",
  integrations: { supabase: true, stripe: false, openai: true, tailscale: true },
  notifications: { deviceAlerts: true, quoteAlerts: true, billingAlerts: true, weeklyDigest: false },
  updatedAt: null,
};

export const TIMEZONES = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "UTC", "Europe/London"];
export const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD"];

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      integrations: { ...DEFAULT_SETTINGS.integrations, ...(parsed.integrations ?? {}) },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): Settings {
  const next = { ...settings, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
