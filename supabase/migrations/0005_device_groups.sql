-- Device groups: organize devices by location (or any grouping).
create table if not exists public.device_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  image_url   text,
  created_at  timestamptz not null default now()
);
alter table public.device_groups enable row level security;

-- Each device optionally belongs to one group.
alter table public.devices add column if not exists group_id uuid references public.device_groups(id) on delete set null;
create index if not exists devices_group_idx on public.devices (group_id);
