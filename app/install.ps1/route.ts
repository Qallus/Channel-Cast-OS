export const runtime = "nodejs";

function originFrom(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

// GET /install.ps1 — Windows installer for the Channel Cast device agent.
// Usage (elevated PowerShell):
//   $env:CC_SERVER="https://os.channelcast.io"; $env:CC_CLAIM="WXYZ-4821"; irm $env:CC_SERVER/install.ps1 | iex
// Motion-activated player: also set  $env:CC_MOTION="webcam"  before running.
export async function GET(req: Request) {
  const server = originFrom(req);
  const script = `# Channel Cast device agent installer (Windows)
$ErrorActionPreference = "Stop"
$Server = if ($env:CC_SERVER) { $env:CC_SERVER } else { "${server}" }
$Claim  = $env:CC_CLAIM
if (-not $Claim) { Write-Error "Set \\$env:CC_CLAIM to your claim code first."; return }
$Motion = $env:CC_MOTION
$Camera = $env:CC_CAMERA_INDEX
$Sensitivity = $env:CC_MOTION_SENSITIVITY

$Dir = "$env:ProgramData\\ChannelCast"
New-Item -ItemType Directory -Force -Path $Dir | Out-Null

# Python + deps (winget installs if missing)
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { winget install -e --id Python.Python.3.12 --silent }
python -m pip install --quiet requests | Out-Null
if ($Motion -eq "webcam") { Write-Host "[channelcast] installing OpenCV for motion detection..."; python -m pip install --quiet opencv-python-headless | Out-Null }
# ffplay for audio (best effort)
if (-not (Get-Command ffplay -ErrorAction SilentlyContinue)) { winget install -e --id Gyan.FFmpeg --silent }

Invoke-WebRequest -UseBasicParsing "$Server/agent.py" -OutFile "$Dir\\channelcast_agent.py"

# Wrapper that sets env + runs the agent
@"
@echo off
set CC_SERVER=$Server
set CC_CLAIM=$Claim
set CC_STATE_DIR=$Dir
"@ | Set-Content -Encoding ASCII "$Dir\\run-agent.cmd"
if ($Motion) { Add-Content -Encoding ASCII "$Dir\\run-agent.cmd" "set CC_MOTION=$Motion" }
if ($Camera) { Add-Content -Encoding ASCII "$Dir\\run-agent.cmd" "set CC_CAMERA_INDEX=$Camera" }
if ($Sensitivity) { Add-Content -Encoding ASCII "$Dir\\run-agent.cmd" "set CC_MOTION_SENSITIVITY=$Sensitivity" }
Add-Content -Encoding ASCII "$Dir\\run-agent.cmd" "python $Dir\\channelcast_agent.py"

# Run in the user's interactive session at logon (SYSTEM/session-0 can't reach the
# webcam or the audio device). For a headless player, enable auto-login on this PC.
$action  = New-ScheduledTaskAction -Execute "$Dir\\run-agent.cmd"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "ChannelCastAgent" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName "ChannelCastAgent"

Write-Host "[channelcast] installed. Task 'ChannelCastAgent' runs at logon."
if ($Motion -eq "webcam") { Write-Host "[channelcast] motion mode ON (webcam). Plays when the camera sees motion." }
Write-Host "[channelcast] For a headless device, enable Windows auto-login so it starts without a manual sign-in."
`;

  return new Response(script, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
