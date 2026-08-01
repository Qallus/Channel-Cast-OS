-- Device location coordinates (for the Map view).
alter table public.devices add column if not exists latitude  double precision;
alter table public.devices add column if not exists longitude double precision;
