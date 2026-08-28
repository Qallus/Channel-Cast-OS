-- Remote control for a screen.
--
-- The player is a web page with no agent behind it, so there's nothing to push
-- a command to. Instead the dashboard writes the desired state here and the
-- player reconciles against it on a fast poll — which also means a screen that
-- was offline picks up the change the moment it comes back, rather than missing
-- a command that fired while it was dark.
--
-- One row per device. The wizard's "device hours" live here too, so a screen
-- carries its own default daypart and every loop scheduled onto it can inherit
-- the same opening times instead of re-typing them.

create table if not exists public.display_controls (
  device_id   uuid primary key references public.devices(id) on delete cascade,

  -- playing | stopped. "stopped" shows the Channel Cast idle screen rather than
  -- killing the browser, so the screen stays reachable and can be resumed.
  power       text not null default 'playing',
  muted       boolean not null default true,
  volume      integer not null default 0,
  subtitles   boolean not null default false,

  -- Pin one item from the current loop, ignoring the rotation. Null = play the
  -- whole loop in order.
  pinned_item uuid references public.display_loop_items(id) on delete set null,

  -- Default opening hours for this screen, set in the setup wizard.
  open_days   jsonb not null default '[0,1,2,3,4,5,6]'::jsonb,
  open_start  time not null default '08:00',
  open_end    time not null default '20:00',

  -- Bumped on every write; the player compares it to decide whether anything
  -- actually changed before disturbing playback.
  revision    integer not null default 1,
  updated_at  timestamptz not null default now()
);

alter table public.display_controls
  drop constraint if exists display_controls_power_check;
alter table public.display_controls
  add constraint display_controls_power_check check (power in ('playing', 'stopped'));

alter table public.display_controls
  drop constraint if exists display_controls_volume_check;
alter table public.display_controls
  add constraint display_controls_volume_check check (volume between 0 and 100);

create index if not exists display_controls_updated_idx
  on public.display_controls (updated_at desc);

alter table public.display_controls enable row level security;

-- Reads and writes go through the service role in route handlers, the same as
-- every other display table.
drop policy if exists display_controls_service on public.display_controls;
create policy display_controls_service on public.display_controls
  for all to service_role using (true) with check (true);
