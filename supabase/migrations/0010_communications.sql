-- Unified communications log.
--
-- Calls previously existed only in Twilio's API, SMS had no association columns,
-- and email/AI-voice were never stored at all. Without a local row per
-- communication there is nothing to join an Opportunity to, so none of the
-- pipeline KPIs (talk time, connection rate, time-to-first-contact, stale
-- detection) can be computed. This table is that join target.
--
-- The Communications module stays the engine; this is the durable record it
-- writes to, and Leads/Opportunities read back as a filtered view.

create table if not exists public.communications (
  id              uuid primary key default gen_random_uuid(),

  -- What happened
  kind            text not null,          -- call | sms | email | ai_voice | voicemail | meeting | note | task
  direction       text,                   -- inbound | outbound
  external_id     text,                   -- Twilio CallSid / MessageSid / provider message id

  -- Who it relates to. Populated from internal ids when Channel Cast initiated
  -- the communication, or by phone/email match for inbound.
  opportunity_id  text,
  contact_id      text,
  account_id      text,
  lead_id         text,
  owner           text,                   -- assigned owner at time of the event
  actor           text,                   -- user or automation that sent it

  -- How confident the association is. 'ambiguous' means several records matched
  -- and a human must pick, rather than silently attaching to the wrong deal.
  association     text not null default 'linked',  -- linked | matched | ambiguous | unmatched

  -- Endpoints
  from_addr       text,
  to_addr         text,

  -- Content
  subject         text,
  body            text,
  media           jsonb,                  -- MMS media, attachments

  -- Call / voice specifics
  status          text,                   -- completed | no-answer | busy | failed | delivered | sent …
  disposition     text,                   -- connected | voicemail | no answer | wrong number …
  duration_seconds integer,
  recording_url   text,
  transcript      text,
  ai_summary      text,
  ai_meta         jsonb,                  -- intent, objections, appointment, transfer, next action

  -- Timing
  occurred_at     timestamptz not null default now(),
  answered_at     timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One row per provider event; re-syncing Twilio must update, never duplicate.
create unique index if not exists communications_external_uniq
  on public.communications (kind, external_id) where external_id is not null;

create index if not exists communications_opportunity_idx on public.communications (opportunity_id, occurred_at desc);
create index if not exists communications_contact_idx     on public.communications (contact_id, occurred_at desc);
create index if not exists communications_lead_idx        on public.communications (lead_id, occurred_at desc);
create index if not exists communications_occurred_idx    on public.communications (occurred_at desc);
create index if not exists communications_review_idx      on public.communications (association) where association in ('ambiguous', 'unmatched');
-- Phone/email fallback matching for inbound events.
create index if not exists communications_from_idx on public.communications (from_addr);
create index if not exists communications_to_idx   on public.communications (to_addr);

-- Server routes use the service-role key; deny everything else by default.
alter table public.communications enable row level security;
