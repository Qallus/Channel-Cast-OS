# Supabase Schema Outline

This is a high-level schema outline. Convert this into migrations when implementation starts.

## Required Extensions

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
```

## Common Columns

Most tables should include:

```sql
id uuid primary key default gen_random_uuid(),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

## Core Tables

- profiles
- organizations
- organization_members
- locations
- ad_spaces
- public_listings
- devices
- device_groups
- device_heartbeats
- device_errors
- audio_assets
- campaigns
- campaign_assets
- campaign_ad_spaces
- campaign_schedules
- bookings
- quote_requests
- playback_logs
- trigger_events
- invoices
- payments
- payouts
- commissions
- partner_requests
- support_tickets
- support_ticket_messages
- agent_threads
- agent_messages
- agent_actions
- audit_logs

## Views / Aggregates

- campaign_performance_daily
- device_health_latest
- ad_space_performance_daily
- advertiser_spend_summary
- owner_revenue_summary
- partner_commission_summary
