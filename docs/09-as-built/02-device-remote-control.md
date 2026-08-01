# Device Remote Control (as-built)

Every device is fully controllable from any browser signed into the account — the
dashboard is one account-scoped web app, so a desktop has the same control as the
device itself.

## Command protocol

Commands are enqueued by the dashboard (`POST /api/admin/devices/:id/command`),
delivered on the agent's next heartbeat (~4s), and de-duplicated so they don't
stack while a device is offline.

| Command | Payload | Effect on the agent |
|---|---|---|
| `set_volume` | `{ volume: 0–100 }` | Sets playback volume (applies to the next play); also stored on the device row |
| `test_play` | `{ url, name, audioId }` | Interrupts and plays that spot now (`trigger=admin_test`) |
| `stop` | — | Terminates the current spot |
| `next` | — | Skips to the next spot immediately |
| `set_motion` | `{ enabled: bool }` | Turns the camera/sensor on/off (releases/reopens the webcam) |

`mute` is `set_volume 0`. **Pause/resume** and **power on/off** are not
implemented (ffplay can't truly pause; a PC can't be powered off remotely) — Stop
covers the interrupt need.

## Live device monitor

`GET /api/admin/devices/by-code/:deviceCode` returns the device (live status),
recent playback (with `trigger`), heartbeats, and the deployed tracks. The device
page (`components/devices/device-live-monitor.tsx`) renders:

- **Header** — name, code, Online/Offline, Motion/Scheduled mode.
- **Live trigger indicator** — last trigger + relative time, pulsing dot when a
  play just landed, and recent motion vs scheduled counts.
- **Controls & tests** — volume slider (debounced), Stop / Next, Camera on/off,
  a spots list with per-spot Play + remove, and add-audio (library or upload).
- **Live playback feed** — auto-refreshing (4s), each play tagged by trigger.

Real devices render this monitor; unknown/demo device codes fall back to the mock
detail view.

## Data flow

```
Dashboard ──POST command──▶ commands table ──heartbeat pull──▶ Agent acts
Agent ──POST playback (trigger)──▶ playback table ──by-code GET──▶ Live monitor
```
