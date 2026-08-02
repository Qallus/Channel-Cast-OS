-- Coordinates for a published ad space (for the marketplace map).
alter table public.device_groups add column if not exists latitude  double precision;
alter table public.device_groups add column if not exists longitude double precision;
