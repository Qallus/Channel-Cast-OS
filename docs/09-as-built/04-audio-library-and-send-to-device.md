# Audio Library & Send to Device (as-built)

## Library

Audio Management (`/app/admin/audio`, Library tab) is real, backed by
`GET/POST /api/admin/audio` (Supabase Storage). Six views: cards, list, table,
kanban, calendar, map. Per-spot metadata (description, status, image, city/geo)
is stored client-side for now (`lib/audio/spot-meta`).

Files stream from `GET /api/audio/:id/file` with HTTP Range support so browsers
seek and devices download. Uploads are lenient on format (MP3/WAV/OGG/FLAC/M4A/
AAC, extension fallback) — downloaded WAVs re-upload cleanly.

## Row actions & bulk

Each spot's menu: **Edit, Send to Device, Download, Archive, Share, Delete**.

Bulk: a select-all checkbox by Upload + per-item checkboxes (cards/list/table).
With items selected, a bar offers **Add to Device, Download, Share, Archive,
Delete**.

## Send to Device

Opens a right slide-out listing the fleet (online status + mode). Pick one or
more devices → each selected spot is added to each device's playlist.

## How audio reaches a device

`POST /api/admin/devices/:id/audio` attaches audio to a device:
- `{ audioId }` — assign an existing library spot.
- multipart `file` — upload a new spot and assign it.

Either way it appends to the device's playlist and (re)deploys, so the spot plays
on the device's schedule / motion trigger. Remove a spot with
`DELETE /api/admin/devices/:id/audio { audioId }` (keeps it in the library).

The agent's schedule pull returns the deployed tracks; the live monitor's per-spot
**Play** button uses `test_play` to preview a spot on the speaker immediately.

## Path to video

The overlay/recording tools live under the Media Studio tab. Video playback on
devices is not yet implemented (agent plays audio via ffplay); the playback event
schema and deployment model are content-type-agnostic, so video is additive.
