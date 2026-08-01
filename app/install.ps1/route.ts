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
if (-not $Claim) { Write-Error "Set the CC_CLAIM environment variable to your claim code first."; return }
$Motion = $env:CC_MOTION
$Camera = $env:CC_CAMERA_INDEX
$Sensitivity = $env:CC_MOTION_SENSITIVITY

$Dir = "$env:ProgramData\\ChannelCast"
New-Item -ItemType Directory -Force -Path $Dir | Out-Null

$AutoAgree = @('--accept-source-agreements','--accept-package-agreements')

# Resolve a REAL python.exe. Windows ships a fake 'python' Store alias in
# WindowsApps that only prints "Python was not found" — skip it, and never
# trust bare 'python' on PATH (winget doesn't refresh this shell's PATH).
function Find-Python {
  foreach ($name in @('python','python3')) {
    $c = Get-Command $name -ErrorAction SilentlyContinue
    if ($c -and $c.Source -and ($c.Source -notlike '*WindowsApps*')) {
      try { & $c.Source --version *> $null; if ($LASTEXITCODE -eq 0) { return $c.Source } } catch {}
    }
  }
  foreach ($glob in @("$env:LOCALAPPDATA\\Programs\\Python\\Python3*\\python.exe","$env:ProgramFiles\\Python3*\\python.exe")) {
    $f = Get-ChildItem $glob -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
    if ($f) { return $f.FullName }
  }
  return $null
}

$Py = Find-Python
if (-not $Py) {
  Write-Host "[channelcast] installing Python 3..."
  winget install -e --id Python.Python.3.12 --silent @AutoAgree | Out-Null
  $Py = Find-Python
}
if (-not $Py) { Write-Error "[channelcast] Python could not be installed automatically. Install Python 3 from https://python.org and re-run this command."; return }
Write-Host "[channelcast] using Python at $Py"

# Python deps (via the resolved interpreter, not the PATH alias).
& $Py -m ensurepip --upgrade *> $null
& $Py -m pip install --quiet --disable-pip-version-check requests | Out-Null
if ($Motion -eq "webcam") { Write-Host "[channelcast] installing OpenCV for motion detection..."; & $Py -m pip install --quiet --disable-pip-version-check opencv-python-headless | Out-Null }

# ffplay for audio (best effort).
if (-not (Get-Command ffplay -ErrorAction SilentlyContinue)) { winget install -e --id Gyan.FFmpeg --silent @AutoAgree | Out-Null }

Invoke-WebRequest -UseBasicParsing "$Server/agent.py" -OutFile "$Dir\\channelcast_agent.py"

# Wrapper that sets env + runs the agent with the resolved python path.
@"
@echo off
set CC_SERVER=$Server
set CC_CLAIM=$Claim
set CC_STATE_DIR=$Dir
"@ | Set-Content -Encoding ASCII "$Dir\\run-agent.cmd"
if ($Motion) { Add-Content -Encoding ASCII "$Dir\\run-agent.cmd" "set CC_MOTION=$Motion" }
if ($Camera) { Add-Content -Encoding ASCII "$Dir\\run-agent.cmd" "set CC_CAMERA_INDEX=$Camera" }
if ($Sensitivity) { Add-Content -Encoding ASCII "$Dir\\run-agent.cmd" "set CC_MOTION_SENSITIVITY=$Sensitivity" }
Add-Content -Encoding ASCII "$Dir\\run-agent.cmd" ('"' + $Py + '" "' + $Dir + '\\channelcast_agent.py"')

# Run in the user's interactive session at logon (SYSTEM/session-0 can't reach the
# webcam or the audio device). For a headless player, enable auto-login on this PC.
$action  = New-ScheduledTaskAction -Execute "$Dir\\run-agent.cmd"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "ChannelCastAgent" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

# Start it now (in this user session) so it registers immediately.
Start-ScheduledTask -TaskName "ChannelCastAgent"

Write-Host ""
Write-Host "[channelcast] Installed and started. The device should appear in your dashboard within ~30 seconds."
if ($Motion -eq "webcam") { Write-Host "[channelcast] Motion mode ON (webcam) - it plays when the camera sees movement." }
Write-Host "[channelcast] It also auto-starts at logon. For a headless player, enable Windows auto-login."
`;

  return new Response(script, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
