// Per-spot metadata (description, cover image, status, location) that the audio
// table doesn't carry yet. Stored in the browser for the Foundation phase — the
// audio *record* (id, name, file) still lives in Supabase; this only decorates it.
// Keyed by audio id. Swaps to Supabase columns + storage when the schema lands;
// the shape below maps 1:1 to those future columns.

import type { SpotStatus } from "@/lib/audio/spots";

export type SpotMeta = {
  description: string;
  image: string | null; // data URL (downscaled) so it renders with no upload backend
  status: SpotStatus;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
};

export const DEFAULT_META: SpotMeta = {
  description: "",
  image: null,
  status: "draft",
  city: "",
  state: "",
  lat: null,
  lng: null,
};

const STORAGE_KEY = "cc-spot-meta";

type MetaMap = Record<string, Partial<SpotMeta>>;

function readMap(): MetaMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as MetaMap;
  } catch {
    return {};
  }
}

function writeMap(map: MetaMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function loadAllMeta(): Record<string, SpotMeta> {
  const map = readMap();
  const out: Record<string, SpotMeta> = {};
  for (const [id, m] of Object.entries(map)) out[id] = { ...DEFAULT_META, ...m };
  return out;
}

export function getMeta(id: string): SpotMeta {
  return { ...DEFAULT_META, ...(readMap()[id] ?? {}) };
}

export function saveMeta(id: string, meta: Partial<SpotMeta>): SpotMeta {
  const map = readMap();
  const next = { ...DEFAULT_META, ...(map[id] ?? {}), ...meta };
  map[id] = next;
  writeMap(map);
  return next;
}

export function deleteMeta(id: string) {
  const map = readMap();
  if (map[id]) {
    delete map[id];
    writeMap(map);
  }
}

/**
 * Downscale + compress an image file to a small JPEG data URL so it fits
 * comfortably in localStorage and renders instantly. Max edge ~640px.
 */
export function imageToDataUrl(file: File, maxEdge = 640): Promise<string> {
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
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
