export const runtime = "nodejs";

function originFrom(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

// GET /install.sh — Debian/Ubuntu/Raspberry Pi OS installer.
// Usage on a device:
//   curl -fsSL http://<server>/install.sh | sudo bash -s -- --claim WXYZ-4821 [--authkey tskey-...]
export async function GET(req: Request) {
  const server = originFrom(req);
  const script = `#!/usr/bin/env bash
set -euo pipefail

SERVER="${server}"
CLAIM=""
AUTHKEY=""
while [ $# -gt 0 ]; do
  case "$1" in
    --claim)   CLAIM="$2"; shift 2 ;;
    --server)  SERVER="$2"; shift 2 ;;
    --authkey) AUTHKEY="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -z "$CLAIM" ]; then
  echo "ERROR: --claim <code> is required (from the Channel Cast dashboard)." >&2
  exit 1
fi
if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run with sudo (needs to install a service)." >&2
  exit 1
fi

echo "[channelcast] server: $SERVER"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y python3 mpv curl ca-certificates
# 'requests' via apt if available, else pip (PEP 668 aware)
apt-get install -y python3-requests 2>/dev/null || pip3 install --break-system-packages requests 2>/dev/null || pip3 install requests

# Optional: install + join Tailscale unattended
if [ -n "$AUTHKEY" ]; then
  command -v tailscale >/dev/null 2>&1 || curl -fsSL https://tailscale.com/install.sh | sh
  tailscale up --authkey "$AUTHKEY" --hostname "cc-$(hostname)" || true
fi

install -d /opt/channelcast /etc/channelcast /var/lib/channelcast
curl -fsSL "$SERVER/agent.py" -o /opt/channelcast/channelcast_agent.py

cat > /etc/channelcast/config.env <<EOF
CC_SERVER=$SERVER
CC_CLAIM=$CLAIM
CC_STATE_DIR=/var/lib/channelcast
EOF
chmod 600 /etc/channelcast/config.env

cat > /etc/systemd/system/channelcast-agent.service <<'EOF'
[Unit]
Description=Channel Cast Device Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/channelcast/config.env
ExecStart=/usr/bin/python3 /opt/channelcast/channelcast_agent.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now channelcast-agent.service

echo ""
echo "[channelcast] installed and started."
echo "  status:  systemctl status channelcast-agent"
echo "  logs:    journalctl -u channelcast-agent -f"
echo "  update:  curl -fsSL $SERVER/agent.py -o /opt/channelcast/channelcast_agent.py && systemctl restart channelcast-agent"
`;

  return new Response(script, {
    headers: { "Content-Type": "text/x-shellscript; charset=utf-8", "Cache-Control": "no-store" },
  });
}
