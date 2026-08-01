# Channel Cast — Project Status

Daily implementation notes. Source of truth for what is built vs. planned.

## 2026-07-09 — Phase 1 foundation started

**Done**

- Scaffolded Next.js 15 (App Router) + TypeScript + Tailwind + ShadCN UI, adapted from
  the CTRL+P repo (cloned to `_reference/ctrl-p`, reference only — not shipped).
- Brand theme re-skinned to Channel Cast: `--brand` = `#c6ff00` (lime accent), dark mode
  default. Light mode uses a darker green for primary buttons; lime stays as accent.
- Reused from CTRL+P: `components/ui/*` (ShadCN primitives), `cn` util, Supabase SSR
  clients (`lib/supabase/`), RBAC scaffolding (`lib/rbac/`).
- Rewrote RBAC for Channel Cast's roles (`lib/rbac/roles.ts`, `permissions.ts`).
- Sidebar navigation (`lib/nav/navigation.ts`) matches the dashboard screenshot groups:
  Main / Channel Cast / Operations / Account.
- Dashboard shell: collapsible sidebar, top bar (search, notifications, theme toggle,
  profile), mobile drawer (`components/layout/`).
- **Super Admin command center** (`/app/admin`) built to match `docs/screen-shots` — KPI
  row, device health, campaign deployment, revenue snapshot, alerts, recent playback,
  quote requests, top devices / ad spots. Uses mock data (`lib/dashboard/mock-data.ts`).
- General dashboard (`/app/dashboard`) + login page (`/login`) placeholders.

**Deferred (intentionally)**

- Supabase auth + real data (running on mock data first, per decision).
- Public marketing site + marketplace (Phase 2).
- Role-specific dashboards, device API, billing, AI Agent (later phases).

**Routing notes**

- `/` and `/app` → redirect to `/app/admin` for now.
- Authenticated routes live under the literal `app/app/` segment to produce `/app/*` URLs
  per `docs/03-page-flows/00-route-map.md`.

## 2026-07-09 — Advertising Inventory

Built the **Advertising Inventory** on `/app/admin/advertising`, modeled on the reference
process from the live `ai.channelcast.io/advertising` (provided via screenshots — the code
is NOT in the `jdub-dashboard` repo, which is an unrelated AI-agent dashboard).

- Six type tabs: **Vision · Motion · Standard Audio** (primary focus) + **Digital Displays
  · Street Furniture · Wall Space**. Config-driven in `lib/advertising/inventory.ts`.
- Per-tab: computed KPI stats (Total / Available / Monthly Revenue / Avg Impressions),
  management banner, search, and location cards (status, rate, traffic, impressions,
  device-link state, row actions).
- **Add Location wizard** (`components/advertising/add-location-wizard.tsx`) — the multi-step
  device setup process: A. Location Overview · B. Traffic & Audience · C. Ad Specifications
  (type-specific) · D. Pricing · E. Availability · F. Calculations (auto-computed:
  monthly plays, impressions, CPM, cost/play, inventory) · G. Add Device (audio/display
  only). Creating a location appends it to the active tab (mock/local state).
- Brand: reference orange swapped for Channel Cast lime (`#c6ff00`) accents.

Open item: wire to Supabase + real device provisioning (API key issuance) in a later phase.

## 2026-07-09 — Device Registration & Activation

Built device registration + activation on `/app/admin/devices`, aligned with
`05-hardware-device/03-device-onboarding-provisioning.md` and `02-stack/07-device-iot-api.md`.

Model: the **device record** (dashboard identity) is separate from the **physical unit**.
- **Step 1 Registration** mints a `device_code`, a one-time `claim_code`, and an activation QR.
- **Step 2 Activation** binds the physical unit and flips status `needs_setup/registered → online`.
- Activation methods coexist: **claim code** (typed), **QR** (scan — same secret), **zero-touch**
  (pre-imaged auto-register), plus **manual match by device ID**. Name/address is a finder, not auth.
- **Provisioning modes** map to the two ownership scenarios: `self_service` (customer buys/activates),
  `field_install` (Channel Cast installer on-site), `zero_touch` (bulk pre-imaged fleet).
- Devices list: stats (Total / Online / Pending Activation / Needs Attention), status filters,
  search, status badges, and pending devices expose their claim code + an Activate dialog (QR + code).
- QR codes generated client-side via the `qrcode` package (`components/devices/qr-code.tsx`).
- A "Simulate device activation" button stands in for real hardware phoning home (mock phase).

Files: `lib/devices/`, `components/devices/`. Open item: real `/api/devices/register`,
token issuance, heartbeat, and install-photo capture in a later (Supabase/device-API) phase.

## 2026-07-13 — Device detail page

Added `/app/admin/devices/[deviceCode]` — the device detail view from
`03-page-flows/11-device-management-flow.md`.

- Header: name, device code, type/model, status badge, and controls (Test audio, Sync
  schedule, Restart, Edit — non-functional until the device API phase).
- Overview stat strip + Overview/Playback/Heartbeats/Errors/Schedule/Install-photos tabs.
- Telemetry is preview data derived per device from `lib/devices/detail-mock.ts` (state-aware:
  offline/warning devices surface matching errors; pending devices show empty logs).
- Device rows on the fleet list now link to the detail page by device code.
- Not-found devices render a graceful back-to-fleet state.

## 2026-07-13 — Auth pages + animated login

- Shared split-screen `(auth)` layout: animated left panel (lg+) + form on the right.
- `AuthShowcase` (`components/auth/`): concentric elliptical rings of radial ticks, each
  rotating at its own speed/direction — an audio/sonar motif. Honors prefers-reduced-motion.
  Keyframes `cc-spin` / `cc-pulse` in `globals.css`.
- Pages: `/login` (email, password + show/hide, keep-logged-in, Log in + Help, passkeys,
  download-app, links), `/register` (name/company/email/password), `/forgot-password`
  (email → "check your email" success state).
- Forms route into `/app/admin` for now; real Supabase auth lands in a later phase.
- **Update:** `AuthShowcase` swapped from CSS rings to a canvas **3D orbital-ring armillary**
  (ported from `login-animation.html`) — five perspective-tilted spinning tick-rings that
  drift, a blurred device "puck" core, and a pulsing lime lens. rAF loop with cleanup, DPR-aware,
  respects prefers-reduced-motion.

## 2026-07-13 — Full-width + responsive pass

- Removed the `max-w-[1600px]` / `max-w-[1400px]` content caps on the admin dashboard,
  Advertising, Devices, and device detail — content now fills available width (page padding
  from the `(app)` layout: `px-4 md:px-6 lg:px-8`).
- Dashboard KPI row now collapses to one row on ultrawide (`2xl:grid-cols-10`) like the
  reference, while staying 2/3/5 columns on mobile/tablet/desktop.
- Confirmed responsive behavior: KPI + stat grids reflow, two-column card rows stack on
  mobile, tables scroll horizontally (ShadCN `Table` wraps in `overflow-auto`).

## 2026-07-13 — Wired up all sidebar destinations

- Every sidebar nav item now resolves to a real page (no 404s). Verified all 24 admin
  routes return 200.
- Built the remaining 21 sections as consistent scaffolds via `lib/admin/sections.ts`
  (per-section title, description, icon, planned features, primary action) rendered by
  `components/admin/admin-section.tsx` — header + "In this module" outline + status card.
- Fully built modules remain: Dashboard, Advertising (inventory + Add Location wizard),
  Devices (fleet + Register wizard + detail). The scaffolds are the queue for full builds.
- Unknown slugs `notFound()` — clean 404 rather than a broken render.

## 2026-07-13 — Operating System module

- New sidebar item **Operating System** (Channel Cast group, after Devices) →
  `/app/admin/operating-system`.
- Three tabs — **Vision Activated / Motion Activated / Standard Audio** — each with content
  grounded in `05-hardware-device/*` (AI vision, PIR motion, firmware runtime, trigger rules):
  summary strip (fleet + firmware), overview, trigger events, capabilities, runtime config
  defaults, hardware/sensors, playback logic steps, an OS-specific note (privacy / limitations
  / prioritization), and a shared Edge-runtime card.
- Config-driven in `lib/os/operating-systems.ts`; rendered by `components/os/operating-system.tsx`.

## 2026-07-20 — Real device deployment test harness

First real backend — deploy audio to a physical device over Tailscale.

- **Persistent store** (`lib/server/store.ts`) — JSON-file backed (`.data/`), swappable for
  Supabase later. Devices, audio, playlists, deployments, heartbeats, playback logs.
- **Device API** (matches `02-stack/07-device-iot-api.md`): `POST /api/devices/register`
  (claim code → device token), `POST /api/devices/heartbeat`, `GET /api/devices/:hw/schedule`,
  `POST /api/devices/:hw/playback`, `GET /api/health`. Bearer-token auth (`lib/server/device-auth.ts`).
- **Admin/UI API**: `/api/admin/devices` (create → claim code), `/api/admin/audio` (upload+list),
  `/api/audio/:id/file` (serve), `/api/admin/playlists`, `/api/admin/deployments` (versioned),
  `/api/admin/activity`.
- **Deployment console** (`components/deploy/deployment-console.tsx`) at the **Deployment** nav
  item (`/app/admin/deployment-channels`): register device → upload audio → build playlist →
  deploy schedule → live monitor (heartbeats + playback, polls 4s).
- **Windows agent** (`agent/channelcast_agent.py`): registers via claim code, then loops
  heartbeat / schedule pull / download+cache / play (ffplay|mpv|vlc) / log. Runbook in `agent/README.md`.
- `npm run dev:lan` (binds 0.0.0.0) so the mini PC reaches the server over the tailnet.
- **Verified**: full flow smoke-tested with curl (register→heartbeat→deploy→schedule→download→
  playback→activity, 401 without token). Server data lives in gitignored `.data/`.
- This server's Tailscale IP during testing: `100.110.248.88`.

## 2026-07-20 — Remote control + Media Studio + Audio Spots

**Remote device control** (real, over the command queue):
- Store `commands[]` + `POST /api/admin/devices/:id/command` (set_volume, test_play).
- Heartbeat response now delivers + drains pending commands; agent applies volume
  (ffplay/mpv/vlc `-volume`) and does immediate `test_play` (trigger `admin_test`).
- Deployment console Live monitor: volume slider + Test-play button per device. Verified via curl.

**Audio Management** (`/app/admin/audio`) rebuilt with tabs:
- **Library** — real upload + list with inline `<audio>` players (backed by `/api/admin/audio`).
- **Media Studio** (`components/audio/media-studio.tsx`) — voiceover via **record** (MediaRecorder),
  **upload**, or **AI voice** (script + voice-type picker + speed; browser speechSynthesis preview;
  `POST /api/admin/ai-voice` is provider-ready — returns 501 + guidance until OPENAI/ELEVENLABS key set).
  Background-music overlay, level mixing + lead-in, live preview (Web Audio), waveform, and
  **Render & save** (OfflineAudioContext → WAV via `lib/audio/wav.ts` → uploads to library).
- **Audio Spots** (`components/audio/audio-spots.tsx`) — one dataset, six views: list, table, card,
  kanban (by status), calendar (month grid), map (lat/lng pins on a US bounding box).

Web Audio studio features (record/mix/render) run in the browser — compile-verified; exercise in-app.

## 2026-07-20 — OpenAI TTS wired for AI voice

- `/api/admin/ai-voice` now calls OpenAI `audio/speech` (model `tts-1-hd`), maps the branded
  presets (Ava/Atlas/Nova/Sol/Rex/Iris → shimmer/onyx/nova/alloy/echo/fable), honors the speed
  slider, saves the MP3 to the audio library, and returns the record.
- Studio "Generate" loads the result as the voiceover and refreshes the library.
- Requires `OPENAI_API_KEY` in `.env` (created empty; paste key + restart server). Without a key
  the endpoint returns 501 + guidance; browser preview still works.
- Provider note: only OpenAI (wired) and Gemini offer TTS. Claude / xAI / OpenRouter are text-only
  (no speech synthesis) — best used for an AI *script writer*, not voice.

## 2026-07-20 — Multi-provider TTS (OpenAI + xAI + Gemini)

Correction: xAI **does** have a TTS API (launched Apr 2026) — verified via docs.x.ai. Refactored
AI voice into a provider layer (`lib/server/tts.ts`):
- **OpenAI** `POST /v1/audio/speech` (tts-1-hd, honors speed) → MP3.
- **xAI** `POST https://api.x.ai/v1/tts` (voices ara/eve/leo/rex/sal) → base64 MP3.
- **Gemini** `POST /v1beta/interactions` (voices Kore/Charon/Leda/… ) → base64 PCM 24k → wrapped to WAV.
- Branded presets (Ava/Atlas/Nova/Sol/Rex/Iris) map to each provider's real voices.
- `GET /api/admin/ai-voice` reports which engines are configured; studio shows a **voice-engine
  picker** (disabled engines greyed until their key is set).
- Env: `OPENAI_API_KEY`, `XAI_API_KEY`, `GEMINI_API_KEY` in `.env` (restart after adding).
- Verified: provider detection + 501 hints.

## 2026-07-20 — All three TTS engines verified live

Keys added to `.env`; tested each with real keys and fixed what the live responses revealed:
- **OpenAI** ✓ MP3 (worked first try).
- **xAI** ✓ — returns raw audio bytes, not base64-JSON; switched to arrayBuffer (content-type aware).
- **Gemini** ✓ — switched from the Beta Interactions API to stable `generateContent` (responseModalities
  AUDIO + prebuiltVoiceConfig); parses `candidates[].content.parts[].inlineData` PCM → WAV (rate from mimeType).
- All three produce valid, playable files (MP3/MP3/WAV — magic-byte verified). Sample AI tracks are in
  the audio library.
- Supabase env vars present (`NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY`) but **not yet used** — the
  device/audio backend still runs on the JSON store; Supabase migration is a separate task.

## 2026-07-20 — Real map (Leaflet)

- Audio Spots **Map** view is now a real interactive map (`components/audio/spots-map.tsx`):
  Leaflet + theme-aware CARTO tiles (dark/light, no API key), brand `circleMarker`s with popups
  (name/advertiser/status/city/plays), auto-fit bounds.
- Dynamically imported with `ssr: false` (Leaflet needs `window`); `circleMarker` avoids the
  marker-icon 404 issue entirely.
- Optional `NEXT_PUBLIC_MAP_TILE_URL` to swap in keyed tiles (Mapbox/MapTiler) later.
- Deps: `leaflet` + `@types/leaflet`.

## 2026-07-20 — Fix: "Unable to decode audio data" (studio mixer)

- Cause: xAI (and OpenAI) returned 24 kHz **MPEG-2 Layer III MP3**, which Chrome's
  `decodeAudioData` can't decode (plays in `<audio>` but not the Web Audio mixer). Generation
  actually succeeded; only the in-browser decode failed.
- Fix: all TTS providers now return **WAV** (OpenAI `response_format:wav`, xAI `codec:wav`, Gemini
  already WAV). Verified all three produce valid RIFF/WAVE @ 24 kHz.
- Studio `generateAiVoice` made resilient: a generated track always lands in the library + fires
  `onSaved`; a preview-decode failure no longer reports as "Generation failed".

## 2026-07-20 — Fix audio playback + modern player + Library views

Two real bugs behind "no audio to listen to":
1. `/api/audio/:id/file` **500'd** — it put the track name (contains `·`/`…`) in `Content-Disposition`,
   which HTTP headers can't hold (non-Latin1). Removed it; added **HTTP Range** support (206) so
   browsers can play/seek. Verified plainGET=200, rangeGET=206.
2. OpenAI/xAI returned **streaming WAV** with placeholder data size `0xFFFFFFFF` → browser couldn't
   compute duration (`0:00`). Added `fixWavSizes()` in `lib/server/tts.ts` to rewrite RIFF/data sizes.
   Verified real durations across all three engines.

New: **`components/audio/audio-player.tsx`** — custom ShadCN-style player (play/pause, seekable
progress w/ hover thumb, times, volume, download; `compact` variant). Replaced native `<audio controls>`.

Library now has **Cards / List / Table** view options (`audio-management.tsx`).

## 2026-07-20 — Library item actions

- `StoredAudio.archived` + `PATCH`/`DELETE /api/admin/audio/:id` (rename, archive, delete file+record).
- Per-item **⋮ actions menu** (custom dropdown, no new dep): **Edit** (rename dialog), **Archive/
  Unarchive**, **Share** (copies the file link), **Delete** (confirm dialog). Wired into all 3 views.
- Archived items dim + get a badge; hidden by default with a "Show archived (N)" toggle.
- Renamed the **Grid** view → **Cards**. Verified PATCH/DELETE end-to-end (file 404s after delete).

## 2026-07-20 — Real per-provider voices (fixes "missing/mismatched voices")

- Root cause: 6 hardcoded branded presets (Ava/Atlas/…) mapped to a subset of each provider's
  voices — hid most voices + caused mismatches.
- Now: `listVoices(provider)` returns **each provider's real voices** — **xAI fetched live** from
  `GET /v1/tts/voices` (**26 voices**, not the docs' 5), OpenAI 10, Gemini 30 (curated with descriptors).
- `GET /api/admin/ai-voice` returns providers each with their `voices`; POST uses the **actual voice id**.
  Studio shows the selected engine's real voices in a scrollable grid; picking a voice = getting that voice.
- Verified: live lists + generation with real ids (xAI "Cosmo", Gemini "Fenrir").

## 2026-07-20 — Fix: "every voice sounds like the same robot"

- Cause: the studio's **"Preview voice"** button used the browser's `speechSynthesis` (OS robotic
  TTS) — same robotic voice regardless of provider/voice. It never used the real neural voice.
- Fix: removed the browser preview entirely. **Generate** now shows a **real inline `AudioPlayer`**
  of the actual generated voice (auto-loads as voiceover + saves to library).
- Confirmed the neural voices are genuinely distinct: same script, xAI "atlas" vs "celeste" →
  different audio (different md5/size). The robot was only ever the browser preview.

## 2026-07-20 — Voice descriptions + Beat Lab (Background Music tabs)

**Voice descriptions:** `Voice` now has `gender`. xAI parser uses the API's real `gender`
(was wrongly showing `language`="MULTILINGUAL"); OpenAI/Gemini curated with gender + style.
Studio voice cards show "Male · Deep, authoritative" etc.

**Background Music → 3 tabs** (`components/audio/background-music.tsx`), each auditionable:
- **Upload** — file, **secondary URL field** (fetch+decode; warns on CORS), or library pick + inline player.
- **Drum Machine** (`drum-machine.tsx` + `lib/audio/drum-engine.ts`) — a real Web-Audio step
  sequencer: synthesized Kick/Snare/Hi-Hat/Open-Hat/Clap/Tom/Piano, 16 steps, tempo, per-track
  mixer (level+mute), piano note, live loop playback (lookahead scheduler), instrument preview,
  and "Use as background music" (renders the loop to a buffer for the mix).
- **AI Beats** — text description → `POST /api/admin/ai-beats` (OpenAI gpt-4o-mini → validated
  16-step pattern) → loads into the Drum Machine to tweak/play. Verified (95 BPM hip-hop groove).

Media Studio refactored to use `<BackgroundMusic>`; loop toggle moved to the mixer.
Note: Web-Audio synth/playback/render are compile-verified; exercise in-browser. AI-Beats audio-
description (STT) is a future add — text works now.

## 2026-07-20 — Beat Lab v2 (melodic piano roll + more instruments)

- Drum engine rebuilt: **10 percussion** (kick/snare/hihat/openhat/clap/tom/**rimshot/cowbell/ride/crash**)
  + **4 melodic instruments** (**piano/guitar/bass/synth**), all synthesized. Pattern model = drum
  boolean grid + monophonic note-per-step melodic tracks.
- DrumMachine UI: drum grid + a **piano roll** (13-note octave, shiftable up/down) for the selected
  melodic instrument, per-track level/mute, previews, transport, render-to-music.
- AI Beats schema updated → returns drums + melodic note lines; verified (lofi prompt → 4-on-floor
  kick, backbeat snare, piano melody, bass line, guitar). Merge in BackgroundMusic updated.

## 2026-07-28 — LIVE on os.channelcast.io (Coolify + GitHub App + Supabase)

- Deployed: Coolify VPS builds from `Qallus/Channel-Cast-OS` (GitHub App auth) via Dockerfile,
  HTTPS on **os.channelcast.io**. Auto-deploy on push.
- Verified in prod: `/api/health` → `{ok:true}`; `/api/admin/devices` → `[]` (Supabase data layer
  connected — tables + service-role env correct).
- Gotchas resolved: repo was private (GitHub App install fixed the pull); `SUPABASE_URL`/
  `SUPABASE_SECRET_KEY` env-name flexibility; reserved `window` column → `play_window`.
- Devices can now activate against `https://os.channelcast.io/install.sh`.

## Next up
- Add **Supabase Auth** (real login) to protect the public dashboard — TOP PRIORITY (it's public + open).
- Begin Phase 2 public marketing home + marketplace archive, or role dashboards — TBD.

## 2026-07-21 — Supabase migration (data + storage) + pushed to GitHub

- **JSON store removed.** Data now lives in Supabase Postgres; audio in Supabase Storage.
- Schema: `supabase/migrations/0001_init.sql` (devices/audio/playlists/deployments/heartbeats/
  playback/commands, RLS deny-all, private `audio` bucket). Run it in the Supabase SQL editor.
- `lib/server/supabase.ts` (service-role client) + `lib/server/db.ts` (async data layer, camelCase
  mappers, Storage upload/download). Device-auth is async. All 13 API routes swapped.
- `/api/audio/:id/file` streams from Storage with Range support; device URLs unchanged.
- Needs env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`. Runbook: `SUPABASE_SETUP.md`.
- Verified: typecheck + `npm run build` clean (lazy client → builds without the key). Pushed to
  `Qallus/Channel-Cast-OS` main. **App now requires Supabase to run** (run SQL + set keys first).
- Repo: initialized, `.env`/`.data`/`_reference` gitignored, Dockerfile for Coolify.

## 2026-07-21 — One-command device activation (Linux + Windows)

Focus shifted to device setup. Deployment target: Hostinger VPS + home server (later), both on
the tailnet. Devices Debian/Ubuntu/Pi OS; Tailscale reusable auth key.

- **`/install.sh`** (served by the app) — Debian/Ubuntu/Pi OS installer: apt-installs python3 + mpv +
  requests, optionally installs & joins **Tailscale** (`--authkey`), downloads the agent from
  `/agent.py`, writes `/etc/channelcast/config.env`, installs a **systemd service**
  (`channelcast-agent`, Restart=always, boot-start). The server URL is injected from the request
  Host, so `curl http://<vps>/install.sh` bakes in the right server automatically.
- **`/install.ps1`** — Windows equivalent (winget python/ffmpeg, Scheduled Task at boot).
- **`/agent.py`** — serves `agent/channelcast_agent.py` (single source of truth). Agent now honors
  `CC_STATE_DIR` (state + cache) for clean service operation.
- **Deployment console** — each pending device shows a **Copy install command** (Linux/Windows toggle).
- Per-device flow: register in dashboard → copy command → run on device → auto-registers + runs as a
  service. Verified: routes serve, server URL injected correctly per Host.
- STILL NEEDED for a real fleet: deploy the app to the VPS (always-on) + migrate JSON store → Supabase
  (currently resets on restart).
