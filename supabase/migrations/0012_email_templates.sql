-- Email templates + send log.
--
-- Templates previously lived in the crm_records JSONB store as `comm_templates`,
-- which cannot carry a builder schema, a rendered HTML body, or a send history.
-- Real tables here so the template builder, the send composer and (next phase)
-- automations all read one library, and so sends are reportable.

create table if not exists public.email_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  subject      text not null default '',
  preheader    text,
  category     text not null default 'General',
  status       text not null default 'draft',   -- draft | active | archived
  -- Rendered, email-safe HTML: what actually gets sent.
  html_body    text not null default '',
  text_body    text,
  -- The block document the visual builder round-trips. Null for HTML-only
  -- templates, which the builder opens in raw mode rather than clobbering.
  schema       jsonb,
  owner        text,
  sends        integer not null default 0,
  last_sent_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists email_templates_status_idx   on public.email_templates (status, updated_at desc);
create index if not exists email_templates_category_idx on public.email_templates (category);

create table if not exists public.email_send_logs (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid references public.email_templates (id) on delete set null,
  to_addr       text not null,
  cc_addr       text,
  bcc_addr      text,
  subject       text,
  status        text not null default 'sent',   -- sent | failed | test
  provider_id   text,
  error         text,
  -- Mirrors the communications log's association columns so a send from a
  -- record can be traced back without a join through the provider.
  opportunity_id text,
  contact_id     text,
  lead_id        text,
  owner          text,
  created_at     timestamptz not null default now()
);

create index if not exists email_send_logs_template_idx on public.email_send_logs (template_id, created_at desc);
create index if not exists email_send_logs_created_idx  on public.email_send_logs (created_at desc);

alter table public.email_templates enable row level security;
alter table public.email_send_logs enable row level security;
