-- AI Vision Phase 1: audience-aware playback (count/presence based).

-- Per-device on/off for vision targeting.
alter table public.devices add column if not exists vision_enabled boolean not null default false;

-- Audiences: a named count-range rule → its own set of spots, ordered by priority.
create table if not exists public.audiences (
  id         uuid primary key default gen_random_uuid(),
  device_id  uuid not null references public.devices(id) on delete cascade,
  name       text not null,
  count_min  int  not null default 1,
  count_max  int,                 -- null = no upper bound
  priority   int  not null default 0,
  track_ids  jsonb not null default '[]'::jsonb,
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists audiences_device_idx on public.audiences (device_id);
alter table public.audiences enable row level security;

-- Record which audience a play served, and the detector's confidence.
alter table public.playback add column if not exists audience   text;
alter table public.playback add column if not exists confidence real;
