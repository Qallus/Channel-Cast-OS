# Channel Cast — Animation Roadmap

A living plan for the device / data-flow animations. The reusable system already
exists; this doc tracks the use-case-specific pieces still to build.

## What already exists (shipped)

Reusable, theme-aware, self-contained CSS/SVG components (no libraries):

- **Device glyph** — the wide, short rectangle enclosure (AI sensor tab + lime eye + speaker grille), from `docs/media/Rectangle_Device.svg`.
- **`components/site/device-anim.tsx`** + `device-anim.module.css`:
  - `DeviceWalkthrough` — **Version C**: interactive accordion that drives a synced scene (sense → dashboard → cloud → play). Auto-plays; hover pauses; click takes control. Live on **How It Works**.
  - `ChipStepper`, `ChipVertical`, `ChipInline`, `DeviceCaption` — **Version B** text-chip process flows, distributed down **How It Works**.
  - `DeviceGlyph` — standalone device for reuse.
- **Version A concepts** (in the review artifact, not yet ported to React): Point-to-Point, Live Uplink, Fleet Mesh, Signal Relay. Port on demand.
- Motion primitives to reuse: sensing rings, arrival **impact ring** (SMIL, fires exactly on packet landing), equalizer bars, ambient drifting background, traveling packets, cloud.

## Placement types (core concept to encode everywhere)

- **Free placement** — location has sufficient foot traffic; device + software provided at no cost.
- **Paid placement** — location pays a minimal fee, gets the hardware + software **and** revenue-generation opportunities (they can sell their own ad space).

A shared visual motif should distinguish the two (e.g. a "Free" vs "Earns revenue" badge on the device, or a $ counter that only appears on paid).

## Use-case animations to build

Each is a short, looping, on-brand scene. Suggested home in parentheses.

1. **System placement — free vs paid** *(Businesses / Partners)*
   Device on a storefront. Toggle/two-up: **Free** (traffic waves → plays, no fee) vs **Paid** (small fee in → hardware+software unlocked → a revenue/$ counter ticks up as spots play). Teaches the two models in one glance.

2. **Ad space → buyers → partners loop** *(Marketplace / Advertisers)*
   A three-party loop: **buyer** picks a space → **spot** deploys to the space's devices → **partner/host** earns. Reuse Point-to-Point + an earnings tick. Shows the marketplace economy.

3. **Radio station — exclusive market** *("the station no one can change")*
   A map with an exclusive market region highlighted; the station node feeds many devices across it. Motif: **no channel dial / locked to one station**. Callouts: sell to existing clients, produce content, bill clients. Emphasize exclusivity + the station keeps its client relationships.

4. **Hotel poolside — "lifeguard on duty 24/7/365"** *(Verticals / Hospitality)*
   Poolside device. Rings pulse as a swimmer passes → plays a safety-style spot: *"No running. No lifeguard on duty. Brought to you by Banana Boat."* Sponsor logo slot. Sells the ambient, useful-message angle.

5. **Parking garage — "you're on level 7"** *(Verticals / Parking)*
   Level indicator (L7) + device; a driver passes → *"You're parked on Level 7 — brought to you by Progressive."* Motif: level number + sponsor. Great for wayfinding + sponsorship.

6. **Vehicle / auto — "24/7 walking, talking sales rep"** *(Verticals / Auto)*
   A wrapped car parked between two cars (graphics hidden). Beat 1: "How good is your wrap when you're boxed in?" → graphics dimmed. Beat 2: a passerby walks by → device speaks → *"…now they listen."* Turns a static wrap into audio reach. Strong standalone hero for an auto landing page.

7. **Installation process** *(Setup / Onboarding / Businesses)*
   Step scene: unbox → mount/place → power on (green button) → one-line command → connects (rings) → "Online." Mirrors the real setup wizard. Reassures non-technical hosts it's ~a minute.

## Notes / open questions

- Sponsor logos in examples (Banana Boat, Progressive) are **illustrative placeholders** — use generic "Your brand here" slots in production to avoid implying real endorsements.
- Vertical landing pages (hotel, parking, auto) don't exist yet — each animation can anchor a new `/verticals/*` page when we build them.
- Consider a single `<UseCaseScene variant="hotel|parking|auto|radio|placement|install" />` component so they share the device glyph + primitives.
