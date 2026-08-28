export const runtime = "nodejs";

function originFrom(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

// GET /install-display.sh — turns a Debian / Raspberry Pi OS box into a screen.
//
// The audio installer runs a Python agent; a display has no agent at all — the
// player is a web page, so the job here is registering the device, then getting
// a browser to open its player URL full-screen at boot and stay there.
//
// Usage on the device:
//   curl -fsSL https://<server>/install-display.sh | sudo bash -s -- --claim WXYZ-4821
export async function GET(req: Request) {
  const server = originFrom(req);

  const script = `#!/usr/bin/env bash
set -euo pipefail

SERVER="${server}"
CLAIM=""
ROTATE=""
KIOSK_USER=""

while [ $# -gt 0 ]; do
  case "$1" in
    --claim)  CLAIM="$2"; shift 2 ;;
    --server) SERVER="$2"; shift 2 ;;
    --user)   KIOSK_USER="$2"; shift 2 ;;
    --rotate) ROTATE="$2"; shift 2 ;;   # normal | left | right | inverted
    *) shift ;;
  esac
done

if [ -z "$CLAIM" ]; then
  echo "ERROR: --claim <code> is required (from the Channel Cast dashboard)." >&2
  exit 1
fi
if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run with sudo (needs to install packages and a service)." >&2
  exit 1
fi

# Run the browser as a normal desktop user, never root — Chromium refuses to
# start as root without --no-sandbox, and disabling the sandbox on an unattended
# screen is not a trade worth making.
if [ -z "$KIOSK_USER" ]; then
  KIOSK_USER="\${SUDO_USER:-}"
  [ -z "$KIOSK_USER" ] && KIOSK_USER="$(getent passwd 1000 | cut -d: -f1)"
fi
if [ -z "$KIOSK_USER" ] || ! id "$KIOSK_USER" >/dev/null 2>&1; then
  echo "ERROR: could not determine a desktop user. Pass --user <name>." >&2
  exit 1
fi

echo "[channelcast-display] server: $SERVER"
echo "[channelcast-display] kiosk user: $KIOSK_USER"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
# Chromium is packaged under two names depending on the release; X utilities
# drive rotation and blanking.
apt-get install -y curl ca-certificates jq xdotool unclutter x11-xserver-utils || true
apt-get install -y chromium-browser 2>/dev/null || apt-get install -y chromium

BROWSER="$(command -v chromium-browser || command -v chromium || true)"
if [ -z "$BROWSER" ]; then
  echo "ERROR: Chromium could not be installed." >&2
  exit 1
fi

install -d /etc/channelcast /var/lib/channelcast-display
chown "$KIOSK_USER" /var/lib/channelcast-display

# ── Register, exactly as the audio agent does ────────────────────────────────
# A stable hardware id means re-running this script re-claims the same device
# instead of creating a duplicate screen.
HWID_FILE=/etc/channelcast/display-hardware-id
if [ -f "$HWID_FILE" ]; then
  HWID="$(cat "$HWID_FILE")"
else
  HWID="HW-$(tr -dc 'A-F0-9' </dev/urandom | head -c 10)"
  echo "$HWID" > "$HWID_FILE"
fi

echo "[channelcast-display] registering $HWID ..."
RESP="$(curl -fsS -X POST "$SERVER/api/devices/register" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"hardwareId\\":\\"$HWID\\",\\"deviceType\\":\\"digital_display\\",\\"model\\":\\"Kiosk\\",\\"firmwareVersion\\":\\"display-1.0\\",\\"registrationCode\\":\\"$CLAIM\\"}")" || {
  echo "ERROR: registration failed. Check the claim code is unused and the server is reachable." >&2
  exit 1
}

TOKEN="$(printf '%s' "$RESP" | jq -r '.deviceToken // empty')"
if [ -z "$TOKEN" ]; then
  echo "ERROR: no device token returned: $RESP" >&2
  exit 1
fi

PLAYER_URL="$SERVER/display/$TOKEN"
cat > /etc/channelcast/display.env <<EOF
CC_SERVER=$SERVER
CC_PLAYER_URL=$PLAYER_URL
CC_HARDWARE_ID=$HWID
EOF
chmod 600 /etc/channelcast/display.env
echo "[channelcast-display] player: $PLAYER_URL"

# ── Launcher ─────────────────────────────────────────────────────────────────
cat > /opt/channelcast-display-run.sh <<'LAUNCH'
#!/usr/bin/env bash
set -u
. /etc/channelcast/display.env

export DISPLAY="\${DISPLAY:-:0}"

# Screens must never sleep or show a blanked desktop.
xset s off -dpms s noblank 2>/dev/null || true
unclutter -idle 0 -root >/dev/null 2>&1 &

[ -n "\${CC_ROTATE:-}" ] && xrandr --output "$(xrandr | awk '/ connected/{print $1; exit}')" --rotate "$CC_ROTATE" 2>/dev/null || true

# Clear the exit flags Chromium sets after a power cut, or it opens with a
# "restore pages?" bubble covering the creative and waits for a click nobody
# will ever give it.
PROFILE=/var/lib/channelcast-display/profile
mkdir -p "$PROFILE/Default"
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/; s/"exited_cleanly":false/"exited_cleanly":true/' \\
  "$PROFILE/Default/Preferences" 2>/dev/null || true

exec BROWSER_BIN \\
  --user-data-dir="$PROFILE" \\
  --kiosk "$CC_PLAYER_URL" \\
  --start-fullscreen \\
  --noerrdialogs \\
  --disable-infobars \\
  --disable-session-crashed-bubble \\
  --disable-features=TranslateUI \\
  --check-for-update-interval=31536000 \\
  --autoplay-policy=no-user-gesture-required \\
  --disable-pinch \\
  --overscroll-history-navigation=0
LAUNCH

sed -i "s|BROWSER_BIN|$BROWSER|" /opt/channelcast-display-run.sh
chmod +x /opt/channelcast-display-run.sh
[ -n "$ROTATE" ] && echo "CC_ROTATE=$ROTATE" >> /etc/channelcast/display.env

# ── Service ──────────────────────────────────────────────────────────────────
# Bound to the graphical session, and always restarted: a screen that dies at
# 3am has to come back without anyone visiting the site.
cat > /etc/systemd/system/channelcast-display.service <<EOF
[Unit]
Description=Channel Cast Digital Display
After=graphical.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$KIOSK_USER
Environment=DISPLAY=:0
EnvironmentFile=/etc/channelcast/display.env
ExecStart=/opt/channelcast-display-run.sh
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
EOF

systemctl daemon-reload
systemctl enable --now channelcast-display.service

echo ""
echo "[channelcast-display] installed."
echo "  player:  $PLAYER_URL"
echo "  status:  systemctl status channelcast-display"
echo "  logs:    journalctl -u channelcast-display -f"
echo "  restart: systemctl restart channelcast-display"
echo ""
echo "Assign this screen a loop under Digital Displays -> Screens."
`;

  return new Response(script, {
    headers: { "Content-Type": "text/x-shellscript; charset=utf-8", "Cache-Control": "no-store" },
  });
}
