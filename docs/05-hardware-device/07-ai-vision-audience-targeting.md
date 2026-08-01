# AI Vision Audience Targeting — Spec (for review)

> **Status: DRAFT for review. Not yet implemented.** This document defines how
> Channel Cast devices will use on-device computer vision to detect who is nearby
> and play the most relevant audio/video. Please review and mark decisions in
> "Open questions" before we build.

## 1. Goal & principles

Turn a motion trigger into an **audience-aware** trigger: instead of "someone is
here → play the next spot," the device plays "**this** kind of spot for **this**
kind of audience." It must be:

- **Flexible per user** — every operator defines their own audiences, content
  types, and rules. No hard-coded targeting.
- **On-device & private-by-default** — inference runs on the device; **no images
  or faces are uploaded or stored**; only anonymous, aggregate attributes leave
  the device (e.g. `{ audience: "family", confidence: 0.82 }`). Raw frames never
  leave the camera.
- **Opt-in and reversible** — vision targeting is off by default; a global and
  per-device on/off switch; the existing camera on/off already exists.
- **Additive** — it reuses the existing playback pipeline. The `playback.trigger`
  field is the seam; we add an `audience` dimension alongside it. Nothing about
  scheduling, deployment, or the agent's playback loop changes structurally.

## 2. How it fits the current system

Today the agent (v0.3.0) plays the next deployed track on motion. With vision:

```
Camera frame ─▶ on-device model ─▶ attributes {count, ageBand, gender?, attire, mood, ...}
             ─▶ rules engine (operator's audiences) ─▶ pick a content set
             ─▶ play a matching spot ─▶ report {trigger:"vision", audience, confidence}
```

The dashboard's live monitor and analytics already group by `trigger`; they gain
an **audience** breakdown for free.

## 3. Detectable attributes (the targeting vocabulary)

Each is **optional**, has a confidence score, and can be enabled/disabled per
device. Operators target on any combination.

| Attribute | Values (examples) | Notes / caveats |
|---|---|---|
| Presence & count | 0, 1, 2, 3+ | Most reliable; person detection only |
| Group composition | solo, pair, small group, family (adult+child) | Derived from count + age bands |
| Apparent age band | child, teen, adult, senior | **Coarse bands only**; never an exact age. Used for restrictions (§6) |
| Apparent gender | male / female / unknown | **Ethically sensitive & error-prone** — off by default; see §7 |
| Attire / clothing | casual, formal, business, athletic, uniform, outerwear | Coarse categories |
| Mood / expression | neutral, positive/smiling, negative | Low confidence; advisory only |
| Dwell time | glance (<2s), browsing (2-10s), lingering (>10s) | From tracking, not identity |
| Time of day | morning / day / evening / night | From the device clock, not vision |
| Location context | operator-set (e.g. "gym", "salon", "family venue") | Static per device/group |

**We do NOT do:** face recognition, identity, storing faces, tracking individuals
across visits, or fine-grained demographics. Those are out of scope by policy.

## 4. Targeting rules engine

An operator builds **audiences** and maps them to **content sets**.

- **Audience** = a named rule over attributes, e.g.
  `"Families" = ageBands include child AND adult`,
  `"Evening crowd" = timeOfDay in {evening,night}`,
  `"Athletes" = attire = athletic`.
- **Content set** = a playlist (or a single spot) to play when the audience
  matches. Reuses the existing playlist/deployment model.
- **Priority** — rules are ordered; first match wins. A **default** set plays when
  nothing matches (today's behavior).
- **Confidence threshold** — per rule; below it, fall through to default.
- **Cooldown & frequency caps** — reuse existing per-device cooldown; add
  per-audience caps so one person doesn't hear the same spot repeatedly.

## 5. Setup flow (dashboard)

Per device or per **group** (so a whole location shares rules):

1. **Enable vision** (toggle). Shows a privacy summary + signage reminder (§7).
2. **Pick a model tier** — Fast (person + count only), Standard (+ age band +
   attire), Full (+ gender + mood). Higher tiers need more device compute.
3. **Choose attributes** to detect (only what the operator needs — fewer = faster,
   more private).
4. **Define audiences** — the rule builder (§4). Templates provided
   (Families, Kids, Seniors, Athletes, Morning/Evening, etc.).
5. **Map content** — attach a playlist/spot to each audience; set the default.
6. **Restrictions** — age gating and content ratings (§6).
7. **Calibrate** — use the image library (§8) + a live preview to tune thresholds.
8. **Save & deploy** — pushed to the device like any schedule.

## 6. Age restrictions & content ratings

- Every spot gets an optional **rating** (e.g. `all-ages`, `teen`, `adult`).
- Rules can **restrict**: "never play `adult`-rated content if a `child` age band
  is present," "only play alcohol/gambling spots when no `child`/`teen` present."
- A **safe-default**: if age band is uncertain, treat as the more restrictive case.
- This is a **compliance guardrail**, not marketing — it prevents inappropriate
  content near minors. Coarse age bands are sufficient and privacy-preserving.

## 7. Privacy, ethics & legal (must-haves)

- **On-device inference only.** No frames/faces leave the device; no cloud vision.
- **No storage of imagery.** Only anonymous aggregate attributes + counts are
  reported. No per-person history.
- **Signage & consent** — the setup flow requires the operator to confirm
  appropriate on-site notice ("This location uses anonymous audience sensing").
  Provide a printable notice.
- **Bias & fairness** — gender/age/attire inference is imperfect and can encode
  bias. Gender is **off by default**, clearly labeled "apparent," and never used
  for exclusionary or sensitive targeting. Document accuracy limits to operators.
- **Regulatory** — align with BIPA/CCPA/GDPR-style rules: because we avoid
  biometric identifiers and storage, exposure is minimized, but legal review is
  required before GA, and some jurisdictions may need vision disabled.
- **Kill switch** — global + per-device off; the camera on/off already exists.

## 8. Image library (for tuning, not identity)

A per-operator **reference image library** to **calibrate and validate** rules —
not to train identity models:

- Upload sample scenes (e.g. "a family," "an athlete," "evening crowd") to test
  which audiences they trigger and tune thresholds.
- Store operator-labeled examples to **evaluate** rule accuracy over time.
- Optional: fine-tune attribute thresholds per location (lighting, camera angle).
- Images here are operator-provided test assets, kept in their library — separate
  from live inference, which never stores frames.

## 9. Recommended CV stack (quick start → scale)

Ship value fast with pre-trained models; avoid training from scratch.

- **Person detection & count:** OpenCV DNN or **Ultralytics YOLOv8n** (tiny,
  fast, CPU-capable) — highest reliability, do this first.
- **Pose/landmarks & simple grouping:** **MediaPipe** (Google) — lightweight,
  runs on CPU, good for presence/pose/dwell.
- **Age band / apparent gender / expression:** a pre-trained attribute model
  (e.g. an age/gender CNN, or InsightFace/DeepFace for coarse attributes) — **use
  bands, not exact values**, and treat as advisory.
- **Attire:** a small image classifier (casual/formal/athletic/uniform) — start
  with a pre-trained backbone + a few categories.
- **Runtime:** ONNX Runtime for portability across mini-PC (CPU/GPU) and future
  Raspberry Pi / Coral / Jetson. The current agent already isolates the detector
  on a thread — the vision model plugs in there.

Phase the model tiers (Fast → Standard → Full) so low-power devices still work.

## 10. Data model & API (proposed)

- `audiences` — `{ id, deviceId|groupId, name, rules(jsonb), contentSetId,
  priority, minConfidence, enabled }`
- `content_ratings` — a `rating` field on audio/spots.
- `vision_config` — per device/group: enabled, model tier, attributes[],
  restrictions.
- `playback` — add `audience text` + `confidence real` (nullable) alongside the
  existing `trigger`.
- Agent pulls `vision_config` + `audiences` with the schedule; reports
  `{trigger:"vision", audience, confidence}` on playback.
- Dashboard: a Vision setup section (device/group), audience rule builder, ratings
  on spots, and an audience breakdown in analytics.

## 11. Phased rollout

1. **P1 — Count & presence** (no demographics): "play set A if 1 person, set B if a
   group." Reliable, private, ships fast. Adds the `audience`/`confidence` plumbing.
2. **P2 — Time + context + attire + age bands**, restrictions/ratings, rule
   builder, image-library calibration.
3. **P3 — Gender/mood (opt-in), advanced templates, per-audience frequency caps,
   analytics.**
4. **P4 — Non-Windows devices** (Pi/Coral/Jetson) with ONNX runtime.

## 12. Open questions (please decide before we build)

1. **Gender targeting** — include at all (opt-in, "apparent") or exclude entirely
   for ethics/liability? (Recommendation: exclude from P1–P2, revisit.)
2. **Age bands** — OK to use coarse child/teen/adult/senior for **restrictions
   only**, or also for marketing targeting?
3. **Default privacy posture** — confirm: on-device only, no frame storage, signage
   required. Any jurisdictions to hard-disable?
4. **Model tiers** — is the mini-PC our floor for "Full," or should we design to
   Raspberry Pi 5 as the reference device?
5. **Content ratings** — adopt a fixed scale (all-ages/teen/adult) or free-form
   category tags?
6. **Scope of P1** — start with **count/presence only** to ship the audience
   plumbing, then layer attributes? (Recommendation: yes.)
