// Digital Display domain types, shared by the admin UI and the player.

export type DisplayMediaKind = "image" | "video";

export type DisplayMedia = {
  id: string;
  name: string;
  kind: DisplayMediaKind;
  storage_path: string | null;
  url: string | null;
  /** upload = a file in Storage; link = hosted elsewhere. */
  source?: "upload" | "link";
  embed_url?: string | null;
  provider?: string | null;
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
  device: { id: string; name: string; deviceCode?: string | null; orientation: "landscape" | "portrait" };
  loop: { id: string; name: string; version: number } | null;
  /**
   * Why the screen is dark, when it is. "unscheduled" means no schedule exists
   * at all; "off_air" means one does but its daypart doesn't cover now — very
   * different problems, and the screen is the only place anyone sees them.
   */
  idle?: { reason: "unscheduled" | "off_air" | "empty_loop"; nextWindow?: string | null } | null;
  items: {
    id: string;
    kind: DisplayMediaKind;
    url: string;
    name: string;
    durationSec: number;
    transition: "fade" | "none";
    /** Set for iframe providers; null means play natively. */
    embed?: string | null;
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

// ── Linked creative ──────────────────────────────────────────────────────────
// A screen can play a hosted link instead of an upload. YouTube and Vimeo need
// an iframe with autoplay parameters; a direct file plays in a <video> element.

export type MediaProvider = "youtube" | "vimeo" | "direct";

export type ParsedVideoLink = { provider: MediaProvider; embedUrl: string; url: string } | null;

/**
 * Normalise a pasted video URL into something a kiosk can actually autoplay.
 * Muted autoplay and loop are set here rather than in the player, since each
 * provider spells them differently.
 */
export function parseVideoLink(input: string): ParsedVideoLink {
  const url = input.trim();
  if (!url) return null;

  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.replace(/^www\./, "");

  // youtu.be/ID and youtube.com/watch?v=ID and /shorts/ID
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const id =
      host === "youtu.be" ? parsed.pathname.slice(1)
      : parsed.searchParams.get("v")
      || (parsed.pathname.startsWith("/shorts/") ? parsed.pathname.split("/")[2] : "")
      || (parsed.pathname.startsWith("/embed/") ? parsed.pathname.split("/")[2] : "");
    if (!id) return null;
    // `playlist` is required for loop to work on a single video.
    return {
      provider: "youtube",
      url,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&playsinline=1`,
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parsed.pathname.split("/").filter(Boolean).pop();
    if (!id || !/^\d+$/.test(id)) return null;
    return {
      provider: "vimeo",
      url,
      embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1&background=1`,
    };
  }

  // A direct file can be played natively, which is always preferable.
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(parsed.pathname)) {
    return { provider: "direct", url, embedUrl: url };
  }

  return null;
}

export const PROVIDER_LABEL: Record<MediaProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  direct: "Direct video",
};
