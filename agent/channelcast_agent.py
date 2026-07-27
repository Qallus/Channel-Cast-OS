#!/usr/bin/env python3
"""
Channel Cast device agent (test build).

Registers this machine with the Channel Cast server using a one-time claim code,
then loops: heartbeat -> pull schedule -> download/cache audio -> play tracks
within the schedule window -> log playback.

Pull-based: only this agent reaches out to the server (great over Tailscale).

Usage (first run):
    set CC_SERVER=http://<server-tailscale-ip>:3000
    set CC_CLAIM=WXYZ-4821
    python channelcast_agent.py

After the first successful registration the device token is saved to
agent_state.json and CC_CLAIM is no longer needed.

Requires: pip install requests   and   an audio player (ffplay from ffmpeg by
default; override with CC_PLAYER, e.g. a full path to ffplay/mpv/vlc).
"""

import json
import os
import platform
import shutil
import subprocess
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path

import requests

SERVER = os.environ.get("CC_SERVER", "http://localhost:3000").rstrip("/")
CLAIM = os.environ.get("CC_CLAIM", "").strip()
PLAYER = os.environ.get("CC_PLAYER", "").strip()
FIRMWARE = "agent-0.1.0"
DEVICE_TYPE = "standard_audio"
MODEL = f"{platform.system()} {platform.machine()}"

HERE = Path(__file__).resolve().parent
STATE_DIR = Path(os.environ.get("CC_STATE_DIR", str(HERE)))
STATE_DIR.mkdir(parents=True, exist_ok=True)
STATE_FILE = STATE_DIR / "agent_state.json"
CACHE_DIR = STATE_DIR / "cache"
CACHE_DIR.mkdir(exist_ok=True)

HEARTBEAT_EVERY = 15  # seconds


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))


def find_player() -> tuple[str, list[str]]:
    """Return (kind, base command) for the audio player. Volume + file are added per play."""
    if PLAYER:
        parts = PLAYER.split()
        return ("custom", parts)
    ffplay = shutil.which("ffplay")
    if ffplay:
        return ("ffplay", [ffplay, "-nodisp", "-autoexit", "-loglevel", "quiet"])
    mpv = shutil.which("mpv")
    if mpv:
        return ("mpv", [mpv, "--no-video", "--really-quiet"])
    vlc = shutil.which("vlc")
    if vlc:
        return ("vlc", [vlc, "--intf", "dummy", "--play-and-exit"])
    log("ERROR: no audio player found. Install ffmpeg (ffplay) or set CC_PLAYER.")
    log("  Windows:  winget install Gyan.FFmpeg   (then restart the terminal)")
    sys.exit(1)


def build_play_cmd(kind: str, base: list[str], path: Path, volume: int) -> list[str]:
    v = max(0, min(100, int(volume)))
    if kind == "ffplay":
        return base + ["-volume", str(v), str(path)]
    if kind == "mpv":
        return base + [f"--volume={v}", str(path)]
    if kind == "vlc":
        return base + [f"--gain={v / 100:.2f}", str(path)]
    return base + [str(path)]


def register(state: dict) -> dict:
    if state.get("device_token"):
        return state
    if not CLAIM:
        log("ERROR: not registered and no CC_CLAIM provided.")
        log("  Set CC_CLAIM to the claim code shown in the Channel Cast Deployment console.")
        sys.exit(1)

    hardware_id = state.get("hardware_id") or f"HW-{uuid.uuid4().hex[:10].upper()}"
    log(f"Registering with {SERVER} using claim {CLAIM} ...")
    r = requests.post(
        f"{SERVER}/api/devices/register",
        json={
            "hardwareId": hardware_id,
            "deviceType": DEVICE_TYPE,
            "model": MODEL,
            "firmwareVersion": FIRMWARE,
            "registrationCode": CLAIM,
        },
        timeout=15,
    )
    if r.status_code != 200:
        log(f"Registration failed ({r.status_code}): {r.text}")
        sys.exit(1)
    data = r.json()
    state.update({"hardware_id": hardware_id, "device_token": data["deviceToken"], "device_id": data.get("deviceId")})
    save_state(state)
    log(f"Registered. hardwareId={hardware_id}")
    return state


def heartbeat(state: dict) -> dict | None:
    try:
        r = requests.post(
            f"{SERVER}/api/devices/heartbeat",
            headers={"Authorization": f"Bearer {state['device_token']}"},
            json={"status": "online", "firmwareVersion": FIRMWARE, "volume": state.get("volume", 80)},
            timeout=10,
        )
        return r.json() if r.status_code == 200 else None
    except requests.RequestException as e:
        log(f"heartbeat failed: {e}")
        return None


def pull_schedule(state: dict) -> dict | None:
    try:
        r = requests.get(
            f"{SERVER}/api/devices/{state['hardware_id']}/schedule",
            headers={"Authorization": f"Bearer {state['device_token']}"},
            timeout=10,
        )
        if r.status_code == 200:
            return r.json()
        log(f"schedule pull returned {r.status_code}")
    except requests.RequestException as e:
        log(f"schedule pull failed: {e}")
    return None


def cache_track(track: dict) -> Path | None:
    dest = CACHE_DIR / f"{track['id']}"
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    try:
        url = track["url"]
        if url.startswith("/"):
            url = SERVER + url
        log(f"downloading '{track['name']}' ...")
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        dest.write_bytes(r.content)
        return dest
    except requests.RequestException as e:
        log(f"download failed for {track['name']}: {e}")
        return None


def in_window(window: dict | None) -> bool:
    if not window:
        return True
    now = datetime.now()
    cur = now.strftime("%H:%M")
    start = window.get("start", "00:00")
    end = window.get("end", "23:59")
    # Sunday=0 .. Saturday=6 to match the server's day indexing.
    days = window.get("days")
    if days is not None and ((now.weekday() + 1) % 7) not in days:
        return False
    return start <= cur <= end


def report_playback(state: dict, track: dict, event: str, trigger: str = "scheduled_play") -> None:
    try:
        requests.post(
            f"{SERVER}/api/devices/{state['hardware_id']}/playback",
            headers={"Authorization": f"Bearer {state['device_token']}"},
            json={"event": event, "audioId": track["id"], "trackName": track["name"], "trigger": trigger},
            timeout=10,
        )
    except requests.RequestException as e:
        log(f"playback report failed: {e}")


def play(kind: str, base: list[str], path: Path, volume: int) -> None:
    subprocess.run(build_play_cmd(kind, base, path, volume), check=False)


def handle_command(cmd: dict, state: dict, kind: str, base: list[str]) -> None:
    ctype = cmd.get("type")
    payload = cmd.get("payload") or {}
    if ctype == "set_volume":
        state["volume"] = max(0, min(100, int(payload.get("volume", state.get("volume", 80)))))
        save_state(state)
        log(f"command: volume -> {state['volume']}")
    elif ctype == "test_play":
        url = payload.get("url")
        if not url:
            log("command: test_play with no url, skipping")
            return
        track = {"id": payload.get("audioId") or "test", "name": payload.get("name") or "Test play", "url": url}
        path = cache_track(track)
        if path:
            log(f"command: TEST PLAY '{track['name']}'")
            report_playback(state, track, "start", "admin_test")
            play(kind, base, path, state.get("volume", 80))
            report_playback(state, track, "complete", "admin_test")


def main() -> None:
    state = load_state()
    state = register(state)
    state.setdefault("volume", 80)
    kind, base = find_player()
    log(f"Agent online. Server={SERVER}  player={kind}  volume={state['volume']}")

    last_hb = 0.0
    idx = 0
    cooldown_until = 0.0
    schedule: dict = {"tracks": [], "window": None, "cooldownSec": 15, "version": -1}

    while True:
        now = time.time()

        if now - last_hb >= HEARTBEAT_EVERY:
            hb = heartbeat(state)
            for cmd in (hb or {}).get("commands", []):
                handle_command(cmd, state, kind, base)
            fresh = pull_schedule(state)
            if fresh and fresh.get("version", 0) != schedule.get("version"):
                schedule = fresh
                idx = 0
                log(f"schedule v{schedule.get('version')} — {len(schedule.get('tracks', []))} track(s)")
            last_hb = now

        tracks = schedule.get("tracks", [])
        if tracks and now >= cooldown_until and in_window(schedule.get("window")):
            track = tracks[idx % len(tracks)]
            idx += 1
            path = cache_track(track)
            if path:
                log(f"playing '{track['name']}' at volume {state['volume']}")
                report_playback(state, track, "start")
                play(kind, base, path, state["volume"])
                report_playback(state, track, "complete")
                cooldown_until = time.time() + float(schedule.get("cooldownSec", 15))
        else:
            time.sleep(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("stopped.")
