# Channel Cast Project Docs

Generated: 2026-07-08

This folder is the working documentation stack for the Channel Cast web app, public marketplace, device network, and AI Agent system.

Channel Cast is a proprietary motion-based audio advertising platform. It combines a public ad-space marketplace, advertiser booking flow, authenticated dashboards, audio creation tools, AI Agent support, partner workflows, billing, analytics, and connected audio playback devices.

The project has two primary surfaces:

1. **Public website and ad-space marketplace** — Visitors search, filter, compare, book, and pay for physical audio ad spaces.
2. **Authenticated web app** — Admins, advertisers, ad-space owners, resellers, partners, radio stations, voice talent, and internal team members manage the full business stack.

## How to use this folder

Copy this entire folder into your new project as:

```txt
/channel-cast-project/docs
```

Then start with these files:

```txt
README.md
DOCS_INDEX.md
IMPLEMENTATION_ORDER.md
01-prompts/00-master-build-prompt.md
02-stack/00-recommended-stack.md
03-page-flows/00-route-map.md
04-ai-agent/00-agent-overview.md
```

## Recommended tool roles

- **Paperclip AI**: Use as the source-of-truth documentation layer. Point it at this folder first.
- **Claude Code**: Use for larger app implementation, UI structure, refactors, and feature builds.
- **Codex**: Use for focused implementation tasks, database migrations, tests, bug fixes, API routes, and cleanup.
- **Hermes**: Use as the Channel Cast in-app AI Agent/operator layer.
- **OpenClaw / Open Claw**: Use as an optional local/self-hosted ops bridge for chat-driven tasks, repo workflows, and connected tool automations.

## Included sections

```txt
00-master/          Product overview, business model, glossary, scope
01-prompts/         Copy/paste prompts for Claude Code, Codex, Hermes, Paperclip, OpenClaw, UI, DB, API, and agent builds
02-stack/           Recommended technical stack, architecture, auth, DB, APIs, billing, security
03-page-flows/      Complete page-by-page flow for public website and authenticated dashboards
04-ai-agent/        AI Agent system prompt, skills, tools, memory, cron jobs, guardrails, evals
05-hardware-device/ Hardware/device docs for AI vision and PIR motion versions
06-data/            Entity map, Supabase schema outline, seed data, RLS, event taxonomy
07-operations/      Business operations, sales, onboarding, support, approvals, partner playbooks
08-qa/              Acceptance criteria, tests, responsive checklist, launch checklist
references/         The prior single-file dashboard HTML prototype
```

## First implementation target

Build the app in phases:

1. Create the app shell, brand system, navigation, auth, and roles.
2. Build the public marketing website and marketplace archive/single listing pages.
3. Build booking, checkout, registration/login, and advertiser onboarding.
4. Build the super admin dashboard and ad-space/device/campaign/audio modules.
5. Build the advertiser, ad-space owner, reseller, partner, radio station, and voice talent dashboards.
6. Build the AI Agent and audio creation flow.
7. Build the device API, playback logging, analytics, billing, and reports.
8. Harden security, permissions, responsive behavior, empty states, and launch readiness.

## Brand notes

The Channel Cast signature highlight color is:

```css
#c6ff00
```

Use `#c6ff00` as the primary accent in dark mode. In light mode, use a darker green for primary buttons and keep `#c6ff00` as a highlight/accent so the UI stays readable.
