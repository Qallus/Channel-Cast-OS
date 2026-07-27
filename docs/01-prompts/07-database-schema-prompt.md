# Database Schema Prompt

```text
Design and implement the Channel Cast database schema using Supabase/Postgres.

Read:

- `/docs/02-stack/05-database-models.md`
- `/docs/06-data/00-entity-map.md`
- `/docs/06-data/01-supabase-schema-outline.md`
- `/docs/06-data/03-rls-policy-outline.md`

Core entities:

- profiles
- organizations
- organization_members
- roles
- permissions
- locations
- ad_spaces
- public_listings
- devices
- device_groups
- device_heartbeats
- device_errors
- audio_assets
- campaigns
- campaign_ad_spaces
- campaign_schedules
- playback_logs
- trigger_events
- bookings
- quote_requests
- invoices
- payments
- payouts
- partner_requests
- support_tickets
- agent_threads
- agent_actions
- audit_logs

Requirements:

- Include created_at and updated_at timestamps.
- Include organization ownership where relevant.
- Support role-based access through RLS.
- Keep public listing fields safe for unauthenticated users.
- Never expose private billing, contact, or device secrets through public policies.
- Prepare seed data for demo marketplace listings, devices, campaigns, and playback logs.
```
