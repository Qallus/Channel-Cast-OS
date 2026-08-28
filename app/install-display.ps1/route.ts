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

# A way out. A kiosk browser with no title bar is genuinely hard to quit if you
# don't know the keystroke, so ship a stop button rather than a folk remedy.
# Matches on the profile path so it only kills this screen's browser, never the
# operator's own browsing session.
@'
$dir = $PSScriptRoot
Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe' OR Name = 'chrome.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine -like "*channelcast*display*profile*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Write-Host "Channel Cast display stopped."
Write-Host "It reopens at the next sign-in. To stop that too, run: schtasks /Change /TN ChannelCastDisplay /DISABLE"
'@ | Set-Content -Encoding ASCII (Join-Path $Dir "stop-display.ps1")

@"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "$Dir\\stop-display.ps1"
pause
"@ | Set-Content -Encoding ASCII (Join-Path $Dir "stop-display.cmd")

# Put it somewhere findable, not just in ProgramData.
try {
  $sm = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs"
  $ws = New-Object -ComObject WScript.Shell
  $lnk = $ws.CreateShortcut((Join-Path $sm "Stop Channel Cast Display.lnk"))
  $lnk.TargetPath = Join-Path $Dir "stop-display.cmd"
  $lnk.WorkingDirectory = $Dir
  $lnk.Description = "Close the Channel Cast display player on this PC"
  $lnk.Save()
} catch { Write-Host "[channelcast-display] (could not create the Start Menu shortcut)" }

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
Write-Host "================================================================"
Write-Host " Channel Cast display installed and started."
Write-Host ""
Write-Host " TO CLOSE THE SCREEN:  press Alt+F4"
Write-Host "   or Start Menu -> 'Stop Channel Cast Display'"
Write-Host "   or run: $Dir\\stop-display.cmd"
Write-Host ""
Write-Host " It reopens at every sign-in. To stop that as well:"
Write-Host "   schtasks /Change /TN ChannelCastDisplay /DISABLE"
Write-Host ""
Write-Host " The screen appears in your dashboard within ~30 seconds, and"
Write-Host " picks up a newly assigned loop within ~15 seconds."
Write-Host " For an unattended screen, enable Windows auto-login."
Write-Host "================================================================"
`;

  return new Response(script, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
