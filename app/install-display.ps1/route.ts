export const runtime = "nodejs";

function originFrom(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

// GET /install.ps1's counterpart for screens.
//
// The audio installer sets up a Python agent. A display has no agent — the
// player is a web page — so the work here is: register the device, then get a
// browser to open its player URL full-screen at every sign-in and stay there.
//
// Usage on the device:
//   $env:CC_SERVER="https://os.channelcast.io"; $env:CC_CLAIM="WXYZ-4821"; irm $env:CC_SERVER/install-display.ps1 | iex
export async function GET(req: Request) {
  const server = originFrom(req);

  const script = `#requires -version 5
$ErrorActionPreference = "Stop"

$Server = if ($env:CC_SERVER) { $env:CC_SERVER } else { "${server}" }
$Claim  = $env:CC_CLAIM
$Dir    = Join-Path $env:ProgramData "ChannelCast\\display"

if (-not $Claim) { Write-Error "Set CC_CLAIM to the claim code from the dashboard's Add Device wizard."; return }

New-Item -ItemType Directory -Force -Path $Dir | Out-Null

# A stable hardware id means re-running this re-claims the same screen instead
# of leaving a duplicate in the fleet.
$HwFile = Join-Path $Dir "hardware-id"
if (Test-Path $HwFile) {
  $Hwid = (Get-Content $HwFile -Raw).Trim()
} else {
  $Hwid = "HW-" + ((1..10 | ForEach-Object { "{0:X}" -f (Get-Random -Max 16) }) -join "")
  Set-Content -Path $HwFile -Value $Hwid -Encoding ASCII
}

Write-Host "[channelcast-display] registering $Hwid ..."
$body = @{
  hardwareId       = $Hwid
  deviceType       = "digital_display"
  model            = "Windows Kiosk"
  firmwareVersion  = "display-1.0"
  registrationCode = $Claim
} | ConvertTo-Json -Compress

try {
  $resp = Invoke-RestMethod -Method Post -Uri "$Server/api/devices/register" -ContentType "application/json" -Body $body
} catch {
  Write-Error "[channelcast-display] registration failed. Check the claim code is unused and the server is reachable. $($_.Exception.Message)"
  return
}

$Token = $resp.deviceToken
if (-not $Token) { Write-Error "[channelcast-display] no device token returned."; return }

$PlayerUrl = "$Server/display/$Token"
Write-Host "[channelcast-display] player: $PlayerUrl"

# Edge ships on every Windows 11 box; Chrome only if they installed it.
$Browser = $null
foreach ($p in @(
  "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe",
  "\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe",
  "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe",
  "\${env:ProgramFiles(x86)}\\Google\\Chrome\\Application\\chrome.exe"
)) { if (Test-Path $p) { $Browser = $p; break } }
if (-not $Browser) { Write-Error "[channelcast-display] no Edge or Chrome found on this PC."; return }
Write-Host "[channelcast-display] browser: $Browser"

$ProfileDir = Join-Path $Dir "profile"
New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

# After a power cut the browser reopens with a "restore pages?" bubble over the
# creative, waiting for a click nobody is there to give it. Clearing the exit
# flags before launch is the only reliable cure. Its own file, so no quoting has
# to survive a trip through cmd.
@'
$p = Join-Path $PSScriptRoot "profile\\Default\\Preferences"
if (Test-Path $p) {
  (Get-Content $p -Raw) -replace '"exit_type":"Crashed"','"exit_type":"Normal"' -replace '"exited_cleanly":false','"exited_cleanly":true' |
    Set-Content $p -NoNewline
}
'@ | Set-Content -Encoding ASCII (Join-Path $Dir "clear-restore.ps1")

@"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "$Dir\\clear-restore.ps1"
start "" "$Browser" --user-data-dir="$ProfileDir" --kiosk "$PlayerUrl" --edge-kiosk-type=fullscreen --start-fullscreen --no-first-run --noerrdialogs --disable-infobars --disable-session-crashed-bubble --hide-crash-restore-bubble --disable-features=TranslateUI --check-for-update-interval=31536000 --autoplay-policy=no-user-gesture-required --disable-pinch --overscroll-history-navigation=0
"@ | Set-Content -Encoding ASCII (Join-Path $Dir "run-display.cmd")

# Runs in the interactive session at logon — a kiosk browser has no desktop from
# session 0. For an unattended screen, enable Windows auto-login on this PC.
$action    = New-ScheduledTaskAction -Execute (Join-Path $Dir "run-display.cmd")
$trigger   = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "ChannelCastDisplay" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

# A screen that sleeps is a screen that shows nothing. Best effort — needs admin.
try {
  powercfg /change monitor-timeout-ac 0 2>$null
  powercfg /change standby-timeout-ac 0 2>$null
} catch {}
try {
  Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name ScreenSaveActive -Value "0" -ErrorAction SilentlyContinue
} catch {}

Start-ScheduledTask -TaskName "ChannelCastDisplay"

Write-Host ""
Write-Host "[channelcast-display] Installed and started."
Write-Host "[channelcast-display] The screen should appear in your dashboard within ~30 seconds."
Write-Host "[channelcast-display] It reopens at every sign-in. For an unattended screen, enable Windows auto-login."
Write-Host "[channelcast-display] Press Ctrl+Alt+Delete or Alt+F4 to leave kiosk mode."
`;

  return new Response(script, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
