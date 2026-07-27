# Architecture

## High-Level Architecture

```txt
Public Website / Marketplace
        |
        v
Next.js Web App + API Routes
        |
        +--> Supabase Auth
        +--> Supabase Postgres
        +--> Audio/Media Storage
        +--> Stripe Billing
        +--> Hermes AI Agent Runtime
        +--> Paperclip Docs Context
        +--> Device API
                    |
                    +--> AI Vision Devices
                    +--> PIR Motion Devices
                    +--> Scheduled/Radio Devices
```

## Main App Areas

### Public Website

Marketing pages, SEO content, marketplace archive, listing details, booking CTA, contact/demo flows.

### Authenticated App

Role-based dashboards for admins, advertisers, businesses/ad-space owners, resellers, partners, radio stations, voice talent, support staff, and viewers.

### Device API

Secure endpoints for device registration, heartbeat, schedule retrieval, playback logs, trigger logs, and error reporting.

### AI Agent Runtime

Hermes-powered agent that can answer questions, recommend ad spaces, draft scripts, create support tickets, explain stats, and route requests.

## Event Flow

1. Device detects motion or person.
2. Device checks local cooldown and schedule cache.
3. Device requests or uses active campaign schedule.
4. Device plays approved audio.
5. Device logs trigger/playback to API.
6. API saves logs and updates analytics.
7. Advertiser and admin dashboards display results.
