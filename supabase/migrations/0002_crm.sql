-- CRM records: one row per record, entity payload stored as JSONB.
-- Generic on purpose — Clients, Contacts, Leads, and Deals all live here keyed by
-- `collection`. The app reads/writes the whole record; filtering/sorting is done
-- app-side. Split into per-field columns later if relational queries are needed.
create table if not exists public.crm_records (
  collection text not null,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists crm_records_collection_idx on public.crm_records (collection);

-- Only the service role (server API routes) may touch it; anon/authenticated denied.
alter table public.crm_records enable row level security;
