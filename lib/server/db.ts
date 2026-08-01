import { randomUUID } from "node:crypto";

import { AUDIO_BUCKET, supabaseAdmin } from "@/lib/server/supabase";

/* ── Public shapes (camelCase — what routes/frontend consume) ───────── */

export type DeviceStatus = "needs_setup" | "registered" | "online" | "offline";

export type Device = {
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

export type Audio = {
  id: string;
  name: string;
  storagePath: string;
  mime: string;
  sizeBytes: number;
  archived: boolean;
  createdAt: string;
};

export type Playlist = { id: string; name: string; trackIds: string[]; createdAt: string };

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

export type DeviceCommand = { id: string; deviceId: string; type: string; payload: Record<string, unknown>; createdAt: string };

/* ── Row → camel mappers ────────────────────────────────────────────── */

type Row = Record<string, unknown>;

function mapDevice(r: Row): Device {
  return {
    id: r.id as string,
    deviceCode: r.device_code as string,
    claimCode: (r.claim_code as string) ?? null,
    hardwareId: (r.hardware_id as string) ?? null,
    deviceToken: (r.device_token as string) ?? null,
    name: r.name as string,
    type: r.type as string,
    model: r.model as string,
    ownerOrg: r.owner_org as string,
    locationName: (r.location_name as string) ?? null,
    status: r.status as DeviceStatus,
    firmwareVersion: (r.firmware_version as string) ?? null,
    ip: (r.ip as string) ?? null,
    volume: (r.volume as number) ?? 80,
    lastHeartbeatAt: (r.last_heartbeat_at as string) ?? null,
    createdAt: r.created_at as string,
  };
}
const mapAudio = (r: Row): Audio => ({
  id: r.id as string,
  name: r.name as string,
  storagePath: r.storage_path as string,
  mime: r.mime as string,
  sizeBytes: Number(r.size_bytes ?? 0),
  archived: Boolean(r.archived),
  createdAt: r.created_at as string,
});
const mapPlaylist = (r: Row): Playlist => ({ id: r.id as string, name: r.name as string, trackIds: (r.track_ids as string[]) ?? [], createdAt: r.created_at as string });
const mapDeployment = (r: Row): Deployment => ({
  deviceId: r.device_id as string,
  playlistId: r.playlist_id as string,
  window: r.play_window as Deployment["window"],
  cooldownSec: r.cooldown_sec as number,
  maxPerHour: r.max_per_hour as number,
  rotation: (r.rotation as Deployment["rotation"]) ?? "sequential",
  version: r.version as number,
  updatedAt: r.updated_at as string,
});
const mapCommand = (r: Row): DeviceCommand => ({ id: r.id as string, deviceId: r.device_id as string, type: r.type as string, payload: (r.payload as Record<string, unknown>) ?? {}, createdAt: r.created_at as string });

/* ── Codes / ids ─────────────────────────────────────────────────────── */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const short = (n: number) => Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
export const genId = () => randomUUID();
export const claimCode = () => `${short(4)}-${short(4)}`;
export const deviceCode = (abbr: string) => `CC-${abbr}-${short(4)}`;
export const token = () => `cct_${randomUUID().replace(/-/g, "")}`;

/* ── Devices ─────────────────────────────────────────────────────────── */

/** Derive live status from last heartbeat (online if seen in the last 60s). */
export function liveStatus(d: Device): DeviceStatus {
  if (d.lastHeartbeatAt) {
    return Date.now() - new Date(d.lastHeartbeatAt).getTime() < 60_000 ? "online" : "offline";
  }
  return d.status;
}

export async function listDevices(): Promise<Device[]> {
  const { data, error } = await supabaseAdmin().from("devices").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDevice);
}
async function findDevice(column: string, value: string): Promise<Device | null> {
  const { data } = await supabaseAdmin().from("devices").select("*").eq(column, value).maybeSingle();
  return data ? mapDevice(data) : null;
}
export const getDeviceById = (id: string) => findDevice("id", id);
export const getDeviceByCode = (code: string) => findDevice("device_code", code);
export const getDeviceByToken = (t: string) => findDevice("device_token", t);
export const getDeviceByHardwareId = (hw: string) => findDevice("hardware_id", hw);

export async function findDeviceByClaim(code: string): Promise<Device | null> {
  const { data } = await supabaseAdmin().from("devices").select("*").ilike("claim_code", code).maybeSingle();
  return data ? mapDevice(data) : null;
}

export async function createDevice(input: { name: string; type?: string; model?: string; ownerOrg?: string; locationName?: string | null }): Promise<Device> {
  const abbr: Record<string, string> = { ai_vision: "AV", pir_motion: "MO", standard_audio: "SA", digital_display: "DD" };
  const type = input.type || "standard_audio";
  const row = {
    device_code: deviceCode(abbr[type] || "SA"),
    claim_code: claimCode(),
    name: input.name,
    type,
    model: input.model || "Mini PC",
    owner_org: input.ownerOrg || "Channel Cast",
    location_name: input.locationName ?? null,
    status: "needs_setup",
    volume: type === "digital_display" ? 100 : 80,
  };
  const { data, error } = await supabaseAdmin().from("devices").insert(row).select("*").single();
  if (error) throw error;
  return mapDevice(data);
}

export async function updateDevice(id: string, patch: Partial<Record<string, unknown>>): Promise<Device | null> {
  const map: Record<string, string> = {
    hardwareId: "hardware_id", deviceToken: "device_token", claimCode: "claim_code", firmwareVersion: "firmware_version",
    lastHeartbeatAt: "last_heartbeat_at", locationName: "location_name", ownerOrg: "owner_org", deviceCode: "device_code",
  };
  const row: Row = {};
  for (const [k, v] of Object.entries(patch)) row[map[k] ?? k] = v;
  const { data, error } = await supabaseAdmin().from("devices").update(row).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data ? mapDevice(data) : null;
}

export async function deleteDevice(id: string): Promise<void> {
  const sb = supabaseAdmin();
  // Remove dependent rows first (no cascade guaranteed on the schema).
  await Promise.all([
    sb.from("deployments").delete().eq("device_id", id),
    sb.from("playback").delete().eq("device_id", id),
    sb.from("heartbeats").delete().eq("device_id", id),
    sb.from("commands").delete().eq("device_id", id),
  ]);
  const { error } = await sb.from("devices").delete().eq("id", id);
  if (error) throw error;
}

/* ── Audio (+ storage) ───────────────────────────────────────────────── */

export async function listAudio(): Promise<Audio[]> {
  const { data, error } = await supabaseAdmin().from("audio").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAudio);
}
export async function getAudio(id: string): Promise<Audio | null> {
  const { data } = await supabaseAdmin().from("audio").select("*").eq("id", id).maybeSingle();
  return data ? mapAudio(data) : null;
}
export async function createAudio(input: { name: string; ext: string; mime: string; buffer: Buffer }): Promise<Audio> {
  const id = genId();
  const path = `${id}.${input.ext}`;
  const up = await supabaseAdmin().storage.from(AUDIO_BUCKET).upload(path, input.buffer, { contentType: input.mime, upsert: true });
  if (up.error) throw up.error;
  const { data, error } = await supabaseAdmin()
    .from("audio")
    .insert({ id, name: input.name, storage_path: path, mime: input.mime, size_bytes: input.buffer.length })
    .select("*")
    .single();
  if (error) throw error;
  return mapAudio(data);
}
export async function updateAudio(id: string, patch: { name?: string; archived?: boolean }): Promise<Audio | null> {
  const { data, error } = await supabaseAdmin().from("audio").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data ? mapAudio(data) : null;
}
export async function deleteAudio(id: string): Promise<boolean> {
  const audio = await getAudio(id);
  if (!audio) return false;
  await supabaseAdmin().storage.from(AUDIO_BUCKET).remove([audio.storagePath]);
  const { error } = await supabaseAdmin().from("audio").delete().eq("id", id);
  if (error) throw error;
  return true;
}
export async function downloadAudio(id: string): Promise<{ buffer: Buffer; mime: string } | null> {
  const audio = await getAudio(id);
  if (!audio) return null;
  const { data, error } = await supabaseAdmin().storage.from(AUDIO_BUCKET).download(audio.storagePath);
  if (error || !data) return null;
  return { buffer: Buffer.from(await data.arrayBuffer()), mime: audio.mime };
}

/* ── Playlists ───────────────────────────────────────────────────────── */

export async function listPlaylists(): Promise<Playlist[]> {
  const { data, error } = await supabaseAdmin().from("playlists").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPlaylist);
}
export async function getPlaylist(id: string): Promise<Playlist | null> {
  const { data } = await supabaseAdmin().from("playlists").select("*").eq("id", id).maybeSingle();
  return data ? mapPlaylist(data) : null;
}
export async function createPlaylist(name: string, trackIds: string[]): Promise<Playlist> {
  const { data, error } = await supabaseAdmin().from("playlists").insert({ name, track_ids: trackIds }).select("*").single();
  if (error) throw error;
  return mapPlaylist(data);
}

/* ── Deployments ─────────────────────────────────────────────────────── */

export async function getDeployment(deviceId: string): Promise<Deployment | null> {
  const { data } = await supabaseAdmin().from("deployments").select("*").eq("device_id", deviceId).maybeSingle();
  return data ? mapDeployment(data) : null;
}
export async function upsertDeployment(input: {
  deviceId: string;
  playlistId: string;
  window?: Deployment["window"];
  cooldownSec?: number;
  maxPerHour?: number;
  rotation?: Deployment["rotation"];
}): Promise<Deployment> {
  const existing = await getDeployment(input.deviceId);
  const row = {
    device_id: input.deviceId,
    playlist_id: input.playlistId,
    play_window: input.window ?? { start: "00:00", end: "23:59", days: [0, 1, 2, 3, 4, 5, 6] },
    cooldown_sec: input.cooldownSec ?? 15,
    max_per_hour: input.maxPerHour ?? 12,
    rotation: input.rotation === "shuffle" ? "shuffle" : "sequential",
    version: (existing?.version ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin().from("deployments").upsert(row, { onConflict: "device_id" }).select("*").single();
  if (error) throw error;
  return mapDeployment(data);
}

/* ── Telemetry ───────────────────────────────────────────────────────── */

export async function addHeartbeat(h: { deviceId: string; status: string; firmwareVersion: string | null; ip: string | null; volume: number | null }) {
  await supabaseAdmin().from("heartbeats").insert({
    device_id: h.deviceId, status: h.status, firmware_version: h.firmwareVersion, ip: h.ip, volume: h.volume,
  });
}
export async function addPlayback(p: { deviceId: string; audioId: string | null; trackName: string | null; event: string; trigger: string }) {
  await supabaseAdmin().from("playback").insert({
    device_id: p.deviceId, audio_id: p.audioId, track_name: p.trackName, event: p.event, trigger: p.trigger,
  });
}
export async function recentActivity(deviceId: string) {
  const sb = supabaseAdmin();
  const [hb, pb, dep] = await Promise.all([
    sb.from("heartbeats").select("*").eq("device_id", deviceId).order("ts", { ascending: false }).limit(20),
    sb.from("playback").select("*").eq("device_id", deviceId).order("ts", { ascending: false }).limit(20),
    getDeployment(deviceId),
  ]);
  return {
    heartbeats: (hb.data ?? []).map((r) => ({ deviceId, ts: r.ts, status: r.status, firmwareVersion: r.firmware_version, ip: r.ip, volume: r.volume })),
    playback: (pb.data ?? []).map((r) => ({ deviceId, ts: r.ts, audioId: r.audio_id, trackName: r.track_name, event: r.event, trigger: r.trigger })),
    deployment: dep,
  };
}

/* ── Command queue ───────────────────────────────────────────────────── */

export async function enqueueCommand(deviceId: string, type: string, payload: Record<string, unknown>): Promise<DeviceCommand> {
  const sb = supabaseAdmin();
  if (type === "set_volume") {
    await sb.from("commands").delete().eq("device_id", deviceId).eq("type", "set_volume");
    if (typeof payload.volume === "number") await updateDevice(deviceId, { volume: Math.max(0, Math.min(100, Math.round(payload.volume))) });
  }
  const { data, error } = await sb.from("commands").insert({ device_id: deviceId, type, payload }).select("*").single();
  if (error) throw error;
  return mapCommand(data);
}
export async function takeCommands(deviceId: string): Promise<DeviceCommand[]> {
  const sb = supabaseAdmin();
  const { data } = await sb.from("commands").select("*").eq("device_id", deviceId);
  const cmds = (data ?? []).map(mapCommand);
  if (cmds.length) await sb.from("commands").delete().eq("device_id", deviceId);
  return cmds;
}
