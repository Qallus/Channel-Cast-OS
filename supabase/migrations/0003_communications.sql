-- Communications — call notes + SMS log. Twilio is the source of truth for call
-- history and recordings; these tables hold what Twilio doesn't (per-call notes
-- and a local SMS log). RLS on → service-role (server routes) only.

create table if not exists public.call_notes (
  id         uuid primary key default gen_random_uuid(),
  call_sid   text not null,
  note       text not null,
  created_at timestamptz not null default now()
);
create index if not exists call_notes_call_sid_idx on public.call_notes (call_sid);
alter table public.call_notes enable row level security;

create table if not exists public.sms_messages (
  id          uuid primary key default gen_random_uuid(),
  sid         text,
  direction   text not null default 'outbound',   -- outbound | inbound
  from_number text,
  to_number   text,
  body        text not null default '',
  status      text,
  created_at  timestamptz not null default now()
);
create index if not exists sms_messages_created_idx on public.sms_messages (created_at desc);
alter table public.sms_messages enable row level security;
