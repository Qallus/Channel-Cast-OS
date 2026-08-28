// Digital Display domain types, shared by the admin UI and the player.

export type DisplayMediaKind = "image" | "video";

export type DisplayMedia = {
  id: string;
  name: string;
  kind: DisplayMediaKind;
  storage_path: string;
  url: string | null;
  mime: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration_sec: number | null;
  thumbnail_url: string | null;
  advertiser_id: string | null;
  campaign_id: string | null;
  tags: string[];
  archived: boolean;
  created_at: string;
};

export type DisplayLoopItem = {
  id: string;
  loop_id: string;
  media_id: string;
  position: number;
  duration_sec: number;
  transition: "fade" | "none";
  starts_on: string | null;
  ends_on: string | null;
  enabled: boolean;
  /** Joined for display and for the player's preload list. */
  media?: DisplayMedia;
};

export type DisplayLoop = {
  id: string;
  name: string;
  description: string | null;
  orientation: "landscape" | "portrait";
  version: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  items?: DisplayLoopItem[];
};

export type DisplayDeployment = {
  id: string;
  device_id: string;
  loop_id: string | null;
  days: number[];
  start_time: string;
  end_time: string;
  priority: number;
  version: number;
  enabled: boolean;
};

/** What the player fetches: everything needed to run offline until the version moves. */
export type PlayerManifest = {
  device: { id: string; name: string; orientation: "landscape" | "portrait" };
  loop: { id: string; name: string; version: number } | null;
  items: {
    id: string;
    kind: DisplayMediaKind;
    url: string;
    name: string;
    durationSec: number;
    transition: "fade" | "none";
  }[];
  /** Seconds until the player should re-check the manifest. */
  pollSeconds: number;
};

export const DEFAULT_IMAGE_SECONDS = 10;
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB — video creative is large.

export const ACCEPTED_MIME = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "video/mp4", "video/webm",
];

export const kindForMime = (mime: string): DisplayMediaKind | null =>
  mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : null;

/** Total loop length. Video items fall back to their own duration. */
export function loopSeconds(items: Pick<DisplayLoopItem, "duration_sec" | "enabled" | "media">[]): number {
  return items
    .filter((i) => i.enabled)
    .reduce((total, i) => total + (Number(i.duration_sec) || Number(i.media?.duration_sec) || DEFAULT_IMAGE_SECONDS), 0);
}

export const formatSeconds = (total: number) => {
  const s = Math.round(total);
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
};

/** Is this item inside its flight dates today? */
export function itemIsLive(item: Pick<DisplayLoopItem, "starts_on" | "ends_on" | "enabled">, today = new Date()): boolean {
  if (!item.enabled) return false;
  const day = today.toISOString().slice(0, 10);
  if (item.starts_on && day < item.starts_on) return false;
  if (item.ends_on && day > item.ends_on) return false;
  return true;
}
