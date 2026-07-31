// Profile is stored in the browser (localStorage) for the Foundation phase —
// there is no auth/user backend yet, so the profile is per-browser. When Supabase
// auth lands this swaps to a `profiles` row keyed by the authenticated user id;
// the shape below maps 1:1 to that future table.

export type Profile = {
  fullName: string;
  jobTitle: string;
  avatar: string | null; // data URL; when null, initials are shown instead
  bio: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  timezone: string;
  language: string;
  appearance: "light" | "dark";
  emailNotifications: boolean;
  productUpdates: boolean;
  weeklyReport: boolean;
  twoFactor: boolean;
  passwordUpdatedAt: string | null;
  updatedAt: string | null;
};

export const STORAGE_KEY = "cc-profile";

// Seeded to match the (currently hard-coded) console user so the page reads as
// "real" on first visit; every field is editable.
export const DEFAULT_PROFILE: Profile = {
  fullName: "Alex Rivera",
  jobTitle: "Super Admin",
  avatar: null,
  bio: "Runs the Channel Cast network — devices, campaigns, and the deal desk.",
  email: "alex@channelcast.example",
  phone: "",
  company: "Channel Cast",
  location: "Austin, TX",
  timezone: "America/Chicago",
  language: "English (US)",
  appearance: "dark",
  emailNotifications: true,
  productUpdates: true,
  weeklyReport: false,
  twoFactor: false,
  passwordUpdatedAt: null,
  updatedAt: null,
};

export const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Australia/Sydney",
];

export const LANGUAGES = ["English (US)", "English (UK)", "Español", "Français", "Deutsch", "Português"];

export function loadProfile(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    // Merge so profiles saved before a new field was added still parse.
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: Profile): Profile {
  const next = { ...profile, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Keep the app-wide theme in sync with the appearance preference.
    window.localStorage.setItem("cc-theme", next.appearance);
    document.documentElement.classList.toggle("dark", next.appearance === "dark");
  }
  return next;
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Downscale + compress a chosen photo to a small square-ish JPEG data URL so it
 * fits comfortably in localStorage and renders instantly. Max edge ~256px.
 */
export function avatarToDataUrl(file: File, maxEdge = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas context"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
