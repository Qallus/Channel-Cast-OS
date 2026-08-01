# Device Agent & Windows Installer (as-built)

## The agent

`agent/channelcast_agent.py` (v0.2.0) is a single-file Python agent. It:

1. **Registers** with a claim code (`POST /api/devices/register`) and stores a
   device token in `agent_state.json`.
2. **Heartbeats** every ~4s (`POST /api/devices/heartbeat`) — this also delivers
   **control commands** and lets the dashboard show live status.
3. **Pulls its schedule** (`GET /api/devices/:hardwareId/schedule`) — the deployed
   playlist's tracks + window + cooldown.
4. **Plays** audio via a non-blocking `Player` (subprocess `Popen`; `ffplay` by
   default, override with `CC_PLAYER`) so a spot can be stopped mid-play.
5. **Reports playback** (`POST /api/devices/:hardwareId/playback`) with a
   `trigger` (`scheduled_play` | `motion_detected` | `admin_test`).

### Motion mode (USB webcam, software detection)

Set `CC_MOTION=webcam`. A daemon thread runs OpenCV frame-differencing; on motion
it sets an event and the main loop plays the next spot (respecting cooldown +
window). Honors a camera on/off switch (releases the webcam when off). Falls back
to schedule playback if OpenCV/camera is unavailable.

Env knobs: `CC_CAMERA_INDEX` (default 0), `CC_MOTION_SENSITIVITY` (default 0.012,
lower = more sensitive).

## Windows installer (`GET /install.ps1`)

One-liner, run in **elevated PowerShell**:

```powershell
$env:CC_SERVER="https://os.channelcast.io"; $env:CC_CLAIM="XXXX-YYYY"; $env:CC_MOTION="webcam"; irm $env:CC_SERVER/install.ps1 | iex
```

The script:
- **Finds a real Python** — skips the Microsoft Store `python` alias stub (a
  common trap that reports "Python was not found"), installs Python 3 via winget
  if missing, and resolves the absolute `python.exe`.
- Auto-accepts winget agreements (`--accept-source-agreements`
  `--accept-package-agreements`).
- Installs `requests` (+ `opencv-python-headless` when motion), and `ffmpeg`.
- Downloads the agent, writes a `run-agent.cmd` wrapper that uses the resolved
  Python path (not the PATH alias), and registers a **logon** scheduled task
  running in the **user session** (SYSTEM/session-0 can't reach the webcam or
  audio device). Starts it immediately.

### Headless operation

Enable Windows **auto-login** so the logon task starts the player on boot without
a manual sign-in.

## Gotchas learned (documented so they don't recur)

- The Store `python` alias satisfies `Get-Command python` but isn't real Python —
  always verify or use an absolute path.
- winget prompts for source agreements unless the accept flags are passed.
- `winget install` doesn't refresh the current shell's PATH — use absolute paths.
- A SYSTEM boot task can't access a USB webcam or audio device — use a logon task.
