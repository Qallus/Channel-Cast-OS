import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Minimal persistent store for the device-deployment test harness.
 * JSON-file backed, in-memory cached, single-process. The device API contract
 * is what matters — this store is swappable for Supabase later without touching
 * the route handlers.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const AUDIO_DIR = path.join(DATA_DIR, "audio");
const DB_FILE = path.join(DATA_DIR, "cc-store.json");

export type DeviceStatus = "needs_setup" | "registered" | "online" | "offline";

export type StoredDevice = {
  id: string;
  deviceCode: string;
  claimCode: string | null;
  hardwareId: string | null;
  deviceToken: string | null;
  name: string;
  type: string;
  model: string;
  ownerOrg: string;
  locationName: string | null;
  status: DeviceStatus;
  firmwareVersion: string | null;
  ip: string | null;
  volume: number;
  lastHeartbeatAt: string | null;
  createdAt: string;
};

export type StoredAudio = {
  id: string;
  name: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
  archived?: boolean;
};

export type StoredPlaylist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
};

export type Deployment = {
  deviceId: string;
  playlistId: string;
  window: { start: string; end: string; days: number[] };
  cooldownSec: number;
  maxPerHour: number;
  rotation: "sequential" | "shuffle";
  version: number;
  updatedAt: string;
};

export type Heartbeat = {
  deviceId: string;
  ts: string;
  status: string;
  firmwareVersion: string | null;
  ip: string | null;
  volume: number | null;
};

export type PlaybackLog = {
  deviceId: string;
  ts: string;
  audioId: string | null;
  trackName: string | null;
  event: "start" | "complete";
  trigger: string;
};

export type DeviceCommand = {
  id: string;
  deviceId: string;
  type: "set_volume" | "test_play";
  payload: Record<string, unknown>;
  createdAt: string;
};

type DB = {
  devices: StoredDevice[];
  audio: StoredAudio[];
  playlists: StoredPlaylist[];
  deployments: Deployment[];
  heartbeats: Heartbeat[];
  playback: PlaybackLog[];
  commands: DeviceCommand[];
};

const EMPTY: DB = { devices: [], audio: [], playlists: [], deployments: [], heartbeats: [], playback: [], commands: [] };

let cache: DB | null = null;

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

function load(): DB {
  if (cache) return cache;
  ensureDirs();
  try {
    if (fs.existsSync(DB_FILE)) {
      cache = { ...EMPTY, ...(JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Partial<DB>) };
    } else {
      cache = structuredClone(EMPTY);
    }
  } catch {
    cache = structuredClone(EMPTY);
  }
  return cache;
}

function persist() {
  ensureDirs();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

/** Run a mutation against the DB and persist. */
export function mutate<T>(fn: (db: DB) => T): T {
  const db = load();
  const result = fn(db);
  persist();
  return result;
}

export function read<T>(fn: (db: DB) => T): T {
  return fn(load());
}

export const AUDIO_DIRECTORY = AUDIO_DIR;
export const genId = () => randomUUID();

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function shortCode(len: number) {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}
export function claimCode() {
  return `${shortCode(4)}-${shortCode(4)}`;
}
export function deviceCode(abbr: string) {
  return `CC-${abbr}-${shortCode(4)}`;
}
export function token() {
  return `cct_${randomUUID().replace(/-/g, "")}`;
}
