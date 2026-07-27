# Recommended Stack

## Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- ShadCN UI
- Lucide icons
- React Hook Form
- Zod validation
- Recharts or a similar chart library

## Backend

- Next.js server actions and route handlers
- Supabase Postgres
- Supabase Auth
- Supabase Storage or S3-compatible storage for audio/media
- Edge functions or background jobs for scheduled work

## Payments

- Stripe Checkout
- Stripe Billing
- Stripe webhooks
- Invoices, subscriptions, one-time purchases, payouts/commission tracking

## Audio

- Browser MediaRecorder API for direct recording
- Audio upload to storage
- Optional server-side audio processing for normalization, trim, transcode, waveform generation
- Optional AI voice generation provider later

## Device Communication

- REST endpoints for MVP
- Optional MQTT/WebSockets for real-time device state
- Device tokens/secrets
- Heartbeat logs
- Schedule pull endpoint
- Playback event logging

## AI

- Hermes for in-app AI Agent/runtime
- Paperclip AI as docs/source-of-truth
- Claude Code and Codex for implementation work
- OpenClaw / Open Claw as optional local/self-hosted ops bridge
- Optional OpenRouter later for model routing

## Notifications

- Email through Resend or similar
- SMS through Twilio if needed
- In-app notifications
- Admin alerts for approvals, device offline, billing issues, and support tickets

## Analytics

- First-party event tables for playback and campaign stats
- Optional PostHog or similar for product analytics
- Aggregated reporting views/materialized views where needed

## Deployment

- Coolify, Vercel, or VPS-hosted Next.js
- Supabase managed or self-hosted Postgres
- CDN-backed audio storage
