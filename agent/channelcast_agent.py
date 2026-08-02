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

Motion-activated mode (webcam):
    set CC_MOTION=webcam            # play only when the camera sees motion
    (optional) CC_CAMERA_INDEX=0    # which camera
    (optional) CC_MOTION_SENSITIVITY=0.012   # lower = more sensitive
    Requires OpenCV:  pip install opencv-python-headless

Requires: pip install requests   and   an audio player (ffplay from ffmpeg by
default; override with CC_PLAYER, e.g. a full path to ffplay/mpv/vlc).
"""

import json
import os
import platform
import shutil
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path

import requests

SERVER = os.environ.get("CC_SERVER", "http://localhost:3000").rstrip("/")
CLAIM = os.environ.get("CC_CLAIM", "").strip()
PLAYER = os.environ.get("CC_PLAYER", "").strip()

# Motion-activated playback. CC_MOTION=webcam watches the default camera and plays
# only when motion is detected (trigger="motion_detected"), respecting the schedule
# window + cooldown. Without it the agent plays continuously on the schedule.
MOTION = os.environ.get("CC_MOTION", "").strip().lower()
CAMERA_INDEX = int(os.environ.get("CC_CAMERA_INDEX", "0") or 0)
# Fraction of the frame that must change to count as motion (0–1). Lower = more sensitive.
MOTION_SENSITIVITY = float(os.environ.get("CC_MOTION_SENSITIVITY", "0.012") or 0.012)
MOTION_WARMUP_FRAMES = 12
FIRMWARE = "agent-0.4.0"
DEVICE_TYPE = "standard_audio"
MODEL = f"{platform.system()} {platform.machine()}"

HERE = Path(__file__).resolve().parent
STATE_DIR = Path(os.environ.get("CC_STATE_DIR", str(HERE)))
STATE_DIR.mkdir(parents=True, exist_ok=True)
STATE_FILE = STATE_DIR / "agent_state.json"
CACHE_DIR = STATE_DIR / "cache"
CACHE_DIR.mkdir(exist_ok=True)

HEARTBEAT_EVERY = 4  # seconds — also the control-command poll interval (stop/next/etc.)


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


def report_playback(state: dict, track: dict, event: str, trigger: str = "scheduled_play", audience: str | None = None, confidence: float | None = None) -> None:
    payload = {"event": event, "audioId": track["id"], "trackName": track["name"], "trigger": trigger}
    if audience is not None:
        payload["audience"] = audience
    if confidence is not None:
        payload["confidence"] = confidence
    try:
        requests.post(
            f"{SERVER}/api/devices/{state['hardware_id']}/playback",
            headers={"Authorization": f"Bearer {state['device_token']}"},
            json=payload,
            timeout=10,
        )
    except requests.RequestException as e:
        log(f"playback report failed: {e}")


def pull_audiences(state: dict) -> dict | None:
    try:
        r = requests.get(
            f"{SERVER}/api/devices/{state['hardware_id']}/audiences",
            headers={"Authorization": f"Bearer {state['device_token']}"},
            timeout=10,
        )
        if r.status_code == 200:
            return r.json()
    except requests.RequestException:
        pass
    return None


def pick_audience(audiences: list, count: int) -> dict | None:
    """First audience (highest priority) whose count range contains `count`."""
    for a in audiences:
        lo = a.get("countMin", 1)
        hi = a.get("countMax")
        if count >= lo and (hi is None or count <= hi):
            return a
    return None


class Player:
    """Non-blocking audio playback that can be stopped / interrupted."""

    def __init__(self, kind: str, base: list[str]):
        self.kind = kind
        self.base = base
        self.proc: subprocess.Popen | None = None

    def start(self, path: Path, volume: int) -> None:
        self.stop()
        self.proc = subprocess.Popen(
            build_play_cmd(self.kind, self.base, path, volume),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    def is_playing(self) -> bool:
        return self.proc is not None and self.proc.poll() is None

    def stop(self) -> None:
        if self.proc is not None and self.proc.poll() is None:
            try:
                self.proc.terminate()
                try:
                    self.proc.wait(timeout=2)
                except Exception:
                    self.proc.kill()
            except Exception:
                pass
        self.proc = None


def handle_command(cmd: dict, state: dict, ctl: dict, camera_on: "threading.Event") -> None:
    ctype = cmd.get("type")
    payload = cmd.get("payload") or {}
    if ctype == "set_volume":
        state["volume"] = max(0, min(100, int(payload.get("volume", state.get("volume", 80)))))
        save_state(state)
        log(f"command: volume -> {state['volume']}")
    elif ctype == "stop":
        ctl["stop"] = True
        log("command: stop")
    elif ctype == "next":
        ctl["next"] = True
        log("command: next")
    elif ctype == "set_motion":
        enabled = bool(payload.get("enabled", True))
        if enabled:
            camera_on.set()
        else:
            camera_on.clear()
        state["motion_enabled"] = enabled
        save_state(state)
        log(f"command: sensor {'ON' if enabled else 'OFF'}")
    elif ctype == "set_power":
        enabled = bool(payload.get("enabled", True))
        state["active"] = enabled
        save_state(state)
        if enabled:
            if MOTION == "webcam" and state.get("motion_enabled", True):
                camera_on.set()
            log("command: power ON")
        else:
            ctl["stop"] = True   # stop whatever is playing
            camera_on.clear()
            log("command: power OFF")
    elif ctype == "test_play":
        url = payload.get("url")
        if not url:
            log("command: test_play with no url, skipping")
            return
        ctl["play_now"] = {"id": payload.get("audioId") or "test", "name": payload.get("name") or "Test play", "url": url}
        log(f"command: play '{ctl['play_now']['name']}'")


def start_motion_detector(camera_on: "threading.Event", vision: dict):
    """Watch the webcam on a daemon thread; set (and return) an Event on motion.
    Honors camera_on: when it's cleared, the camera is released (LED off / privacy)
    and re-opened when set again. When vision["enabled"], counts people on the frame
    that fired (OpenCV HOG) and stores it in vision["count"] — privacy-first: no
    frames are stored or uploaded. Returns None if OpenCV/camera isn't available."""
    try:
        import cv2  # type: ignore
    except ImportError:
        log("CC_MOTION=webcam but OpenCV is missing. Install it:  pip install opencv-python-headless")
        return None

    probe = cv2.VideoCapture(CAMERA_INDEX)
    if not probe.isOpened():
        log(f"CC_MOTION=webcam but camera index {CAMERA_INDEX} would not open (CC_CAMERA_INDEX to change).")
        probe.release()
        return None
    probe.release()

    # Person counting is best-effort — if the HOG model can't initialize on this
    # OpenCV build, we still run motion detection (just without people counts)
    # rather than crashing the whole agent.
    try:
        hog = cv2.HOGDescriptor()
        hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
    except Exception as e:  # noqa: BLE001
        hog = None
        log(f"person-count unavailable ({e}); motion detection continues without it.")

    def count_people(frame) -> int:
        if hog is None:
            return 1
        try:
            w = frame.shape[1]
            if w > 640:
                scale = 640.0 / w
                frame = cv2.resize(frame, (640, int(frame.shape[0] * scale)))
            rects, _ = hog.detectMultiScale(frame, winStride=(8, 8), padding=(8, 8), scale=1.05)
            return int(len(rects))
        except Exception:
            return 0

    flag = threading.Event()

    def loop() -> None:
        cap = None
        prev = None
        frames = 0
        while True:
            if not camera_on.is_set():
                if cap is not None:
                    cap.release()
                    cap = None
                    prev = None
                    frames = 0
                    log("camera released (sensor off).")
                time.sleep(0.3)
                continue
            if cap is None:
                cap = cv2.VideoCapture(CAMERA_INDEX)
                if not cap.isOpened():
                    cap.release()
                    cap = None
                    time.sleep(1)
                    continue
                log("camera opened (sensor on).")
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.2)
                continue
            gray = cv2.GaussianBlur(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (21, 21), 0)
            frames += 1
            if prev is None:
                prev = gray
                continue
            delta = cv2.absdiff(prev, gray)
            thresh = cv2.dilate(cv2.threshold(delta, 25, 255, cv2.THRESH_BINARY)[1], None, iterations=2)
            changed = cv2.countNonZero(thresh) / float(thresh.size)
            prev = gray
            if frames > MOTION_WARMUP_FRAMES and changed > MOTION_SENSITIVITY:
                if not flag.is_set():
                    # Only run the (slower) person count once per motion event, when vision is on.
                    if vision.get("enabled"):
                        vision["count"] = max(1, count_people(frame))  # motion => at least 1
                        log(f"motion detected ({changed*100:.1f}% of frame) — people~{vision['count']}")
                    else:
                        log(f"motion detected ({changed*100:.1f}% of frame)")
                flag.set()
            time.sleep(0.05)

    threading.Thread(target=loop, daemon=True).start()
    log(f"Motion detector active — camera {CAMERA_INDEX}, sensitivity {MOTION_SENSITIVITY}.")
    return flag


def main() -> None:
    state = load_state()
    state = register(state)
    state.setdefault("volume", 80)
    state.setdefault("active", True)
    kind, base = find_player()
    player = Player(kind, base)

    # Sensor on/off switch shared with the detector thread (restored from state).
    camera_on = threading.Event()
    if state.get("motion_enabled", True) and state.get("active", True):
        camera_on.set()

    vision = {"enabled": False, "count": 1, "audiences": [], "idx": {}}
    motion_flag = None
    if MOTION == "webcam":
        try:
            motion_flag = start_motion_detector(camera_on, vision)
        except Exception as e:  # noqa: BLE001
            log(f"motion detector failed to start ({e}); falling back to schedule playback.")
    motion_mode = motion_flag is not None
    if MOTION == "webcam" and not motion_mode:
        log("Motion mode requested but unavailable — falling back to schedule playback.")
    log(f"Agent online. Server={SERVER}  player={kind}  volume={state['volume']}  mode={'motion' if motion_mode else 'schedule'}")

    ctl = {"stop": False, "next": False, "play_now": None}
    last_hb = 0.0
    idx = 0
    cooldown_until = 0.0
    active: dict | None = None  # {track, trigger} currently playing
    force_play: dict | None = None  # a scheduled track queued by "next"
    schedule: dict = {"tracks": [], "window": None, "cooldownSec": 15, "version": -1}

    def cooldown_sec() -> float:
        return float(schedule.get("cooldownSec", 15))

    while True:
        now = time.time()

        # --- poll heartbeat, control commands, and schedule ---
        if now - last_hb >= HEARTBEAT_EVERY:
            hb = heartbeat(state)
            for cmd in (hb or {}).get("commands", []):
                handle_command(cmd, state, ctl, camera_on)
            fresh = pull_schedule(state)
            if fresh and fresh.get("version", 0) != schedule.get("version"):
                schedule = fresh
                idx = 0
                log(f"schedule v{schedule.get('version')} — {len(schedule.get('tracks', []))} track(s)")
            av = pull_audiences(state)
            if av is not None:
                was = vision["enabled"]
                vision["enabled"] = bool(av.get("visionEnabled"))
                vision["audiences"] = av.get("audiences", [])
                if vision["enabled"] != was:
                    log(f"vision {'ON' if vision['enabled'] else 'OFF'} ({len(vision['audiences'])} audience(s))")
            last_hb = now

        # --- manage the currently-playing spot ---
        if active is not None:
            if ctl["stop"] or ctl["next"]:
                want_next = ctl["next"]
                ctl["stop"] = ctl["next"] = False
                player.stop()
                report_playback(state, active["track"], "complete", active["trigger"], active.get("audience"), active.get("confidence"))
                log(f"{'skipped' if want_next else 'stopped'} '{active['track']['name']}'")
                cooldown_until = now + cooldown_sec()
                active = None
                tracks = schedule.get("tracks", [])
                if want_next and tracks:
                    force_play = tracks[idx % len(tracks)]
                    idx += 1
                    cooldown_until = 0.0  # play the next one immediately
                continue
            if not player.is_playing():  # finished on its own
                report_playback(state, active["track"], "complete", active["trigger"], active.get("audience"), active.get("confidence"))
                cooldown_until = now + cooldown_sec()
                active = None
                continue
            time.sleep(0.2)
            continue

        # Powered off — play nothing until turned back on.
        if not state.get("active", True):
            time.sleep(0.3)
            continue

        # Nothing playing — a leftover stop/next is meaningless, so drop it.
        if ctl["stop"] or ctl["next"]:
            ctl["stop"] = ctl["next"] = False

        # --- immediate plays: admin test_play, or the "next" queued track ---
        req = ctl["play_now"] or force_play
        if req is not None:
            is_test = ctl["play_now"] is not None
            ctl["play_now"] = None
            force_play = None
            ctl["stop"] = ctl["next"] = False
            path = cache_track(req)
            if path:
                trigger = "admin_test" if is_test else "scheduled_play"
                log(f"playing '{req['name']}' at volume {state['volume']}")
                report_playback(state, req, "start", trigger)
                player.start(path, state["volume"])
                active = {"track": req, "trigger": trigger}
            continue

        # --- scheduled / motion-gated playback ---
        tracks = schedule.get("tracks", [])
        vision_on = motion_mode and vision["enabled"] and bool(vision["audiences"])
        has_content = bool(tracks) or (vision_on and any(a.get("tracks") for a in vision["audiences"]))
        ready = has_content and now >= cooldown_until and in_window(schedule.get("window"))

        if motion_mode:
            if not ready or not camera_on.is_set():
                motion_flag.clear()  # drop stale triggers while cooling down / sensor off / out of window
                time.sleep(0.15)
                continue
            if not motion_flag.is_set():
                time.sleep(0.1)
                continue
            motion_flag.clear()
            trigger = "motion_detected"
        elif not ready:
            time.sleep(0.5)
            continue
        else:
            trigger = "scheduled_play"

        # Vision: map the detected person count to an audience's content set.
        audience_name = None
        confidence = None
        track = None
        if trigger == "motion_detected" and vision_on:
            count = int(vision.get("count", 1))
            aud = pick_audience(vision["audiences"], count)
            if aud and aud.get("tracks"):
                key = aud["name"]
                i = vision["idx"].get(key, 0)
                track = aud["tracks"][i % len(aud["tracks"])]
                vision["idx"][key] = i + 1
                trigger = "vision"
                audience_name = aud["name"]
                confidence = 0.7
                log(f"vision: {count} person(s) -> audience '{audience_name}'")

        if track is None:
            if not tracks:
                time.sleep(0.2)
                continue
            track = tracks[idx % len(tracks)]
            idx += 1

        path = cache_track(track)
        if path:
            label = f"VISION[{audience_name}] -> " if audience_name else ("MOTION -> " if motion_mode else "")
            log(f"{label}playing '{track['name']}' at volume {state['volume']}")
            report_playback(state, track, "start", trigger, audience_name, confidence)
            player.start(path, state["volume"])
            active = {"track": track, "trigger": trigger, "audience": audience_name, "confidence": confidence}


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("stopped.")
