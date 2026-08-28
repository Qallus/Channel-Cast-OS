-- Digital Display: creative library, loops, and what a screen is playing.
--
-- Deliberately separate from the audio tables. Audio playback is event-driven —
-- motion or vision fires a spot, and `deployments.cooldown_sec` / `max_per_hour`
-- exist to stop it repeating. A display is the opposite: a continuous loop of
-- timed creative, dayparted by weekday and hour. Reusing the audio schema would
-- mean fighting those trigger columns on every feature after this one.

-- ── Creative ────────────────────────────────────────────────────────────────
create table if not exists public.display_media (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  kind          text not null,                    -- image | video
  storage_path  text not null,
  url           text,                             -- public URL when the bucket allows it
  mime          text,
  size_bytes    bigint,
  width         integer,
  height        integer,
  -- Video only. Images take their duration from the loop item instead, since the
  -- same still can run for different lengths in different loops.
  duration_sec  numeric,
  thumbnail_url text,
  advertiser_id text,
  campaign_id   text,
  tags          jsonb not null default '[]'::jsonb,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists display_media_kind_idx on public.display_media (kind) where not archived;

-- ── Loops ───────────────────────────────────────────────────────────────────
create table if not exists public.display_loops (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  orientation text not null default 'landscape',  -- landscape | portrait
  -- Bumped whenever the loop or its items change. Players poll this and only
  -- re-download when it moves, so a screen mid-loop isn't interrupted needlessly.
  version     integer not null default 1,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.display_loop_items (
  id           uuid primary key default gen_random_uuid(),
  loop_id      uuid not null references public.display_loops (id) on delete cascade,
  media_id     uuid not null references public.display_media (id) on delete cascade,
  position     integer not null default 0,
  -- Images need an explicit dwell; video defaults to its own length when null.
  duration_sec numeric not null default 10,
  transition   text not null default 'fade',      -- fade | none
  -- Optional flight dates, so a seasonal spot drops out without editing the loop.
  starts_on    date,
  ends_on      date,
  enabled      boolean not null default true
);
create index if not exists display_loop_items_loop_idx on public.display_loop_items (loop_id, position);

-- ── What a screen is playing ────────────────────────────────────────────────
create table if not exists public.display_deployments (
  id          uuid primary key default gen_random_uuid(),
  device_id   uuid not null references public.devices (id) on delete cascade,
  loop_id     uuid references public.display_loops (id) on delete set null,
  -- Dayparting: which weekdays (0=Sun) and what window on those days.
  days        jsonb not null default '[0,1,2,3,4,5,6]'::jsonb,
  start_time  time not null default '00:00',
  end_time    time not null default '23:59',
  priority    integer not null default 0,
  version     integer not null default 1,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now()
);
create index if not exists display_deployments_device_idx on public.display_deployments (device_id) where enabled;

-- ── Proof of play ───────────────────────────────────────────────────────────
create table if not exists public.display_playback (
  id         uuid primary key default gen_random_uuid(),
  device_id  uuid references public.devices (id) on delete cascade,
  media_id   uuid references public.display_media (id) on delete set null,
  loop_id    uuid references public.display_loops (id) on delete set null,
  media_name text,
  played_at  timestamptz not null default now(),
  duration_sec numeric
);
create index if not exists display_playback_device_idx on public.display_playback (device_id, played_at desc);
create index if not exists display_playback_media_idx  on public.display_playback (media_id, played_at desc);

alter table public.display_media       enable row level security;
alter table public.display_loops       enable row level security;
alter table public.display_loop_items  enable row level security;
alter table public.display_deployments enable row level security;
alter table public.display_playback    enable row level security;
