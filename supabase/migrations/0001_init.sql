-- Channel Cast — initial schema.
-- Run in the Supabase SQL editor (or via the Supabase CLI). Idempotent-ish.

create extension if not exists "pgcrypto";

-- ── Devices ─────────────────────────────────────────────────────────
create table if not exists public.devices (
  id                uuid primary key default gen_random_uuid(),
  device_code       text not null,
  claim_code        text,
  hardware_id       text,
  device_token      text,
  name              text not null,
  type              text not null default 'standard_audio',
  model             text not null default 'Mini PC',
  owner_org         text not null default 'Channel Cast',
  location_name     text,
  status            text not null default 'needs_setup',
  firmware_version  text,
  ip                text,
  volume            int  not null default 80,
  last_heartbeat_at timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists devices_token_idx on public.devices (device_token);
create index if not exists devices_claim_idx on public.devices (claim_code);
create index if not exists devices_hw_idx    on public.devices (hardware_id);

-- ── Audio (files live in the 'audio' storage bucket) ────────────────
create table if not exists public.audio (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  storage_path text not null,
  mime         text not null default 'audio/wav',
  size_bytes   bigint not null default 0,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── Playlists ───────────────────────────────────────────────────────
create table if not exists public.playlists (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  track_ids  uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ── Deployments (one active per device) ─────────────────────────────
create table if not exists public.deployments (
  device_id     uuid primary key references public.devices(id) on delete cascade,
  playlist_id   uuid references public.playlists(id) on delete set null,
  window        jsonb not null default '{"start":"00:00","end":"23:59","days":[0,1,2,3,4,5,6]}',
  cooldown_sec  int  not null default 15,
  max_per_hour  int  not null default 12,
  rotation      text not null default 'sequential',
  version       int  not null default 1,
  updated_at    timestamptz not null default now()
);

-- ── Telemetry ───────────────────────────────────────────────────────
create table if not exists public.heartbeats (
  id               bigint generated always as identity primary key,
  device_id        uuid references public.devices(id) on delete cascade,
  ts               timestamptz not null default now(),
  status           text,
  firmware_version text,
  ip               text,
  volume           int
);
create index if not exists heartbeats_device_idx on public.heartbeats (device_id, ts desc);

create table if not exists public.playback (
  id         bigint generated always as identity primary key,
  device_id  uuid references public.devices(id) on delete cascade,
  ts         timestamptz not null default now(),
  audio_id   uuid,
  track_name text,
  event      text not null,
  trigger    text not null default 'scheduled_play'
);
create index if not exists playback_device_idx on public.playback (device_id, ts desc);

-- ── Device command queue ────────────────────────────────────────────
create table if not exists public.commands (
  id         uuid primary key default gen_random_uuid(),
  device_id  uuid references public.devices(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists commands_device_idx on public.commands (device_id);

-- ── Lock everything down: only the service role (server) may access.
-- RLS with no policies = deny all for anon/authenticated; service role bypasses RLS.
alter table public.devices     enable row level security;
alter table public.audio       enable row level security;
alter table public.playlists   enable row level security;
alter table public.deployments enable row level security;
alter table public.heartbeats  enable row level security;
alter table public.playback    enable row level security;
alter table public.commands    enable row level security;

-- ── Storage bucket for audio (private) ──────────────────────────────
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;
