# Claude Code Prompt

```text
You are Claude Code working in the Channel Cast repo.

Read `/docs/README.md`, `/docs/PROJECT_BRIEF.md`, `/docs/IMPLEMENTATION_ORDER.md`, and `/docs/03-page-flows/00-route-map.md` before editing.

Your job is to implement production-quality app structure and UI for Channel Cast using the current repo patterns. Inspect the existing codebase before making changes.

Do not create disconnected prototype code unless explicitly asked. Extend the current app architecture.

Primary goals:

1. Build the app shell and route structure.
2. Build the public website and marketplace flows.
3. Build the authenticated dashboard shell.
4. Add role-based layouts for admin, advertiser, ad-space owner, reseller, partner, radio station, and voice talent users.
5. Build clean ShadCN/Tailwind components with responsive behavior.
6. Prepare integration points for Supabase, Stripe, audio storage, IoT device API, and Hermes AI Agent.

Before coding, produce:

- Files to create/change
- Existing patterns to reuse
- Routes to add
- Components to add
- Data models needed
- Risks/assumptions

After coding, run available checks and list what changed.
```
