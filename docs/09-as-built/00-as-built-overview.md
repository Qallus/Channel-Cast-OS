# As-Built Overview

This category documents what is **actually implemented and running** today, as a
bridge between the design docs (00–08, the vision) and the code. Where design and
implementation differ, the as-built docs describe the shipped behavior.

## Business model (unchanged, confirmed)

Channel Cast turns physical spaces into motion-triggered audio advertising
channels. Advertisers discover/book/create/schedule/track audio campaigns;
businesses monetize their spaces; partners produce spots; admins run the network
from one dashboard. See `00-master/00-channel-cast-master-overview.md` and
`00-master/01-business-model.md` — both remain accurate.

## What's live now

| Area | Status | Doc |
|---|---|---|
| Supabase Auth (email/password, reset, route guard) | ✅ Live | `05-auth-and-access.md` |
| Device agent + Windows installer (one-liner) | ✅ Live | `01-device-agent-installer.md` |
| Motion-activated player (USB webcam, software detection) | ✅ Live | `01-device-agent-installer.md` |
| In-dashboard device setup wizard | ✅ Live | `03-device-groups-and-fleet-views.md` |
| Device remote control (volume, play, stop, next, camera on/off) | ✅ Live | `02-device-remote-control.md` |
| Live device monitor (mode, last trigger, playback feed) | ✅ Live | `02-device-remote-control.md` |
| Device groups (name, description, image) + fleet views | ✅ Live | `03-device-groups-and-fleet-views.md` |
| Audio library → device playlist; Send to Device; bulk actions | ✅ Live | `04-audio-library-and-send-to-device.md` |
| Communications (Twilio dialpad, SMS, call logs, AI voice) | ✅ Live | (see `components/comm`) |
| Analytics (period tabs, linked stat cards, shadcn charts) | ✅ Live | (see `components/analytics`) |
| Global FAB (AI agent, DM, SMS, dialpad, call logs, notes, add device) | ✅ Live | (see `components/fab`) |

## Roadmap / not yet built

- **AI Computer Vision audience detection** — classify who's in frame (e.g.
  group → targeted spot) and set a richer playback `trigger`/audience. The
  playback event schema already carries `trigger`, so this is additive.
- **Per-group detail pages** with all six views; **group images** are done.
- **Calendar / Map fleet views** — need scheduling dates / device geo-coordinates.
- **Device power on/off**, true **pause/resume** (needs a player that supports it,
  e.g. mpv), and precise **airtime analytics** (per-spot duration).
- **Raspberry Pi / Linux agent image** for ship-ready appliances.

## Key repos & paths

- Device agent: `agent/channelcast_agent.py` (v0.2.0)
- Windows installer (served): `app/install.ps1/route.ts` → `GET /install.ps1`
- Device APIs: `app/api/devices/*` (device-token auth) and `app/api/admin/devices/*` (dashboard)
- Migrations: `supabase/migrations/` (applied via `scripts/db.mjs`)
