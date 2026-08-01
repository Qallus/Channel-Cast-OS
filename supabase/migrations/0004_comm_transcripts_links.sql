-- Persisted call transcripts (one per call) + call → contact/role links.

create table if not exists public.call_transcripts (
  call_sid      text primary key,
  recording_sid text,
  transcript    text not null default '',
  created_at    timestamptz not null default now()
);
alter table public.call_transcripts enable row level security;

create table if not exists public.call_links (
  id           uuid primary key default gen_random_uuid(),
  call_sid     text not null,
  contact_id   text,
  contact_name text,
  role         text,
  details      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists call_links_call_sid_idx on public.call_links (call_sid);
alter table public.call_links enable row level security;
