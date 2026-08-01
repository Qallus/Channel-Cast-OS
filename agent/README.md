# Channel Cast — Device Deployment Test Runbook

End-to-end test: deploy audio from the Channel Cast web app to your Windows mini PC
over Tailscale, on a schedule.

```
Mini PC (agent)  ──Tailscale──▶  Dev machine (Channel Cast server :3000)
  register (claim code)             /api/devices/register  → device token
  heartbeat / pull schedule         /api/devices/heartbeat, /:hw/schedule
  download + play + log             /api/audio/:id/file, /:hw/playback
```

## A. Server (your dev machine)

1. **Run the server on the tailnet** (binds to all interfaces so the mini PC can reach it):

   ```powershell
   npm run dev:lan
   ```

2. **Find the server's Tailscale IP:**

   ```powershell
   tailscale ip -4        # e.g. 100.101.102.103
   ```

3. **Allow the port through Windows Firewall** (once), so the mini PC can connect:

   ```powershell
   New-NetFirewallRule -DisplayName "Channel Cast 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
   ```

4. Open the app → **Deployment** in the sidebar (`/app/admin/deployment-channels`).

## B. Create the content (web app, Deployment page)

1. **Register device** → name it (e.g. "Mini PC — Test"). Copy the **claim code** that appears (e.g. `WXYZ-4821`).
2. **Upload audio** → add one or more MP3/WAV files.
3. **Build playlist** → select tracks, name it, save.
4. **Deploy schedule** → pick the device + playlist, set the window (leave `00:00–23:59` for always-on), Deploy.

## C. Mini PC (the agent)

1. Make sure Tailscale is up on the mini PC (same tailnet) and it can reach the server:

   ```powershell
   tailscale status
   curl http://<server-tailscale-ip>:3000/api/health
   ```

2. Install prerequisites (once):

   ```powershell
   python -m pip install -r requirements.txt
   winget install Gyan.FFmpeg          # provides ffplay for audio; restart the terminal after
   ```

3. Run the agent with the claim code from step B1:

   ```powershell
   $env:CC_SERVER = "http://<server-tailscale-ip>:3000"
   $env:CC_CLAIM  = "WXYZ-4821"
   python channelcast_agent.py
   ```

   On first run it registers and saves `agent_state.json` (token). After that you can drop `CC_CLAIM`.

## D. Watch it work

- The device flips to **online** in the Deployment page's **Live monitor** (heartbeats every ~15s).
- When inside the play window, the mini PC downloads the tracks and plays them, respecting the cooldown.
- **Recent playback** shows `start` / `complete` events streaming in.

Re-deploy anytime (new playlist, different window) — the agent picks up the new schedule version on its next poll.

## E. Motion-activated player (USB webcam)

Turn the mini PC into a **Motion-Activated Audio Player**: it watches a USB webcam and
plays the next spot only when it sees movement (respecting the same cooldown/window).

1. Install OpenCV alongside the other deps (already in `requirements.txt`):

   ```powershell
   python -m pip install -r requirements.txt   # includes opencv-python-headless
   ```

2. Run the agent in motion mode:

   ```powershell
   $env:CC_MOTION = "webcam"
   # optional: $env:CC_CAMERA_INDEX = "0"          # pick a camera
   # optional: $env:CC_MOTION_SENSITIVITY = "0.012" # lower = more sensitive
   python channelcast_agent.py
   ```

   You'll see `Motion detector active…`, then `motion detected (…%)` and `MOTION -> playing …`
   each time it triggers. Playback events log with `trigger: motion_detected` in **Recent playback**.

   If OpenCV or the camera isn't available, the agent logs a warning and **falls back to schedule
   playback** so the device still works.

3. **Production install** (one-liner) turns on motion by setting `CC_MOTION` before the install:

   ```powershell
   $env:CC_SERVER="https://os.channelcast.io"; $env:CC_CLAIM="WXYZ-4821"; $env:CC_MOTION="webcam"; irm $env:CC_SERVER/install.ps1 | iex
   ```

   The installer registers a **logon** task (runs in your user session — a webcam and the audio
   device aren't reachable from the SYSTEM/session-0 boot task). For a headless player, enable
   Windows **auto-login** so the agent starts without a manual sign-in.

## Notes / knobs

- **Audio player:** defaults to `ffplay`. Override with `CC_PLAYER` (e.g. `$env:CC_PLAYER="mpv --no-video"` or a full path to VLC).
- **Motion mode:** `CC_MOTION=webcam` gates playback on webcam motion; `CC_CAMERA_INDEX` / `CC_MOTION_SENSITIVITY` tune it. Needs `opencv-python-headless`; falls back to schedule playback if unavailable.
- **No Tailscale?** Same steps work on a LAN — use the server's local IP instead of its Tailscale IP.
- **Storage:** server data lives in `.data/` (JSON store + uploaded audio). Delete it to reset the test.
- This is the test harness. The device API contracts match `docs/02-stack/07-device-iot-api.md`; the
  JSON store swaps for Supabase later without changing the agent or the routes.
