-- Email automations: a Channel Cast pipeline/CRM event fires a template.
--
-- Deliberately not MJG's "journey" model, which sequences a cohort through a
-- fixed multi-week programme. Channel Cast's events are pipeline and lifecycle
-- events, so this maps trigger -> template with an optional delay, and records
-- every firing so a rule can be audited and de-duplicated.

create table if not exists public.email_automations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  trigger_key  text not null,             -- see EMAIL_TRIGGERS in lib/email/automations.ts
  template_id  uuid references public.email_templates (id) on delete set null,
  enabled      boolean not null default false,
  -- Optional narrowing, e.g. { "stage": "proposal" } so a stage_changed rule
  -- only fires for one stage.
  conditions   jsonb not null default '{}'::jsonb,
  -- Minutes to wait after the event. 0 sends immediately.
  delay_minutes integer not null default 0,
  /** Who the mail goes to: the record's primary contact, or a fixed address. */
  recipient    text not null default 'contact',   -- contact | owner | custom
  custom_email text,
  runs         integer not null default 0,
  last_run_at  timestamptz,
  owner        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists email_automations_trigger_idx on public.email_automations (trigger_key) where enabled;

-- One row per firing. Also the de-duplication key: a rule should not re-send
-- because the same opportunity crossed the same stage twice in a day.
create table if not exists public.email_automation_runs (
  id             uuid primary key default gen_random_uuid(),
  automation_id  uuid references public.email_automations (id) on delete cascade,
  trigger_key    text not null,
  opportunity_id text,
  contact_id     text,
  lead_id        text,
  to_addr        text,
  status         text not null default 'sent',   -- sent | skipped | failed
  detail         text,
  created_at     timestamptz not null default now()
);

create index if not exists email_automation_runs_auto_idx on public.email_automation_runs (automation_id, created_at desc);
create index if not exists email_automation_runs_dedupe_idx on public.email_automation_runs (automation_id, opportunity_id, created_at desc);

alter table public.email_automations enable row level security;
alter table public.email_automation_runs enable row level security;
