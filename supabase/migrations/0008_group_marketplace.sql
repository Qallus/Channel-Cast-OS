-- Publish a device group (a location) as a bookable ad space on the marketplace.
alter table public.device_groups add column if not exists listed            boolean not null default false;
alter table public.device_groups add column if not exists slug              text;
alter table public.device_groups add column if not exists space_type        text;
alter table public.device_groups add column if not exists city              text;
alter table public.device_groups add column if not exists state             text;
alter table public.device_groups add column if not exists price_per_week    int;
alter table public.device_groups add column if not exists audience_per_week int;
alter table public.device_groups add column if not exists tags              jsonb not null default '[]'::jsonb;

create unique index if not exists device_groups_slug_uidx on public.device_groups (slug) where slug is not null;
