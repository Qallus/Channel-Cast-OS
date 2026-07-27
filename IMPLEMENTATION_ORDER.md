# Implementation Order

Use this as the build order for Claude Code, Codex, Hermes, Paperclip AI, and OpenClaw.

## Phase 0 — Source of Truth Setup

1. Create the repo.
2. Copy this folder into `/docs`.
3. Add the prior HTML prototype from `references/channel-cast-dashboard-prototype.html` to a `/prototype` or `/docs/references` location.
4. Point Paperclip AI at `/docs` as the source-of-truth folder.
5. Create a `PROJECT_STATUS.md` file in the repo root for daily implementation notes.

## Phase 1 — App Foundation

Build:

- Next.js app shell
- TypeScript
- Tailwind CSS
- ShadCN UI
- Dark/light/system theme
- Layouts for public website and authenticated dashboard
- Sidebar navigation
- Header, search, notifications, profile menu
- Auth provider wiring
- Role-based route protection
- Empty/loading/error states

## Phase 2 — Public Website + Marketplace

Build:

- Public home page
- How it works page
- Advertiser page
- Business/ad-space owner page
- Reseller page
- Partner/radio station page
- Pricing/request demo/contact pages
- Marketplace archive page
- Single ad-space listing page
- Search/filter/sort UI
- Safe fallback rendering for missing listing fields

## Phase 3 — Booking + Checkout + Account Creation

Build:

- Select ad space
- Choose campaign dates
- Choose play-times
- Select package
- Review estimated plays/impressions
- Register or login
- Pay or request approval
- Create booking record
- Create campaign draft
- Redirect to advertiser dashboard

## Phase 4 — Advertiser App

Build:

- Advertiser dashboard
- Campaign builder
- Audio upload
- Recording studio
- AI Agent script creator
- Effects library
- Partner request flow
- Campaign schedule
- Campaign stats
- Billing/invoices

## Phase 5 — Super Admin and Operations

Build:

- Super admin overview
- Advertisers
- Businesses/ad-space owners
- Locations
- Ad-space inventory
- Devices
- Campaigns
- Audio library
- Content approvals
- Partner management
- Reseller management
- Support tickets
- Billing/revenue/payouts
- Reports
- Settings

## Phase 6 — Device API + Analytics

Build:

- Device registration
- Heartbeat endpoint
- Schedule pull endpoint
- Playback start/complete logs
- Error logs
- Device health dashboard
- Campaign pacing
- Playback reports
- Visitor and trigger stats

## Phase 7 — AI Agent

Build:

- Hermes agent runtime integration
- Agent chat UI
- Agent tools/actions
- Agent skills
- Agent memory model
- Agent audit logs
- Agent human handoff
- Scheduled agent tasks
- Agent evals

## Phase 8 — Billing, Revenue, and Payouts

Build:

- Stripe checkout/subscriptions/invoices
- Monthly placements
- CPM
- Per-play
- Sponsorships
- Revenue share
- Reseller commissions
- Partner commissions
- Payout tracking

## Phase 9 — QA and Launch

Complete:

- Responsive QA
- Role-based access QA
- Public listing SEO
- Device simulation tests
- Payment test mode
- Campaign scheduling tests
- Audio upload/recording tests
- AI Agent evals
- Launch checklist
