# Master Build Prompt

Use this prompt in Claude Code, Codex, Cursor, or another coding environment.

```text
You are building Channel Cast, a proprietary motion-based audio advertising SaaS platform and public ad-space marketplace.

Before coding, read the `/docs` folder in this repo, especially:

- README.md
- PROJECT_BRIEF.md
- IMPLEMENTATION_ORDER.md
- 00-master/00-channel-cast-master-overview.md
- 02-stack/00-recommended-stack.md
- 03-page-flows/00-route-map.md
- 04-ai-agent/00-agent-overview.md

Build the app using a clean, modern ShadCN/Tailwind UI system with TypeScript. The brand accent is `#c6ff00`. Use it as a high-impact accent in dark mode. In light mode, use a darker green for primary buttons and use `#c6ff00` as a highlight/accent.

The app must support:

- Public marketing website
- Public ad-space marketplace archive page
- Public single ad-space listing page
- Booking and checkout flow
- Register/login/onboarding flow
- Authenticated dashboard layout
- Super admin dashboard
- Advertiser dashboard
- Business/ad-space owner dashboard
- Reseller dashboard
- Partner, radio station, and voice talent dashboards
- Device management
- Campaign management
- Audio library and recording studio
- AI Agent panel
- Billing/revenue/payout reporting
- Analytics/playback reports
- User management and role-based access

Start by producing an implementation plan. Then implement in small phases. Do not hard-code features in a way that blocks Supabase/Postgres, Stripe, storage, or device API integration later.

Every page must include polished loading, empty, error, and success states. Every table must have safe fallback rendering. Public listing pages must never display `undefined`, blank pricing, broken comma-separated locations, or empty metrics.
```
