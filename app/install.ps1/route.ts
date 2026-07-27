export const runtime = "nodejs";

function originFrom(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

// GET /install.ps1 — Windows installer.
// Usage (elevated PowerShell):
//   $env:CC_CLAIM="WXYZ-4821"; irm http://<server>/install.ps1 | iex
export async function GET(req: Request) {
  const server = originFrom(req);
  const script = `# Channel Cast device agent installer (Windows)
$ErrorActionPreference = "Stop"
$Server = if ($env:CC_SERVER) { $env:CC_SERVER } else { "${server}" }
$Claim  = $env:CC_CLAIM
if (-not $Claim) { Write-Error "Set \\$env:CC_CLAIM to your claim code first."; return }

$Dir = "$env:ProgramData\\ChannelCast"
New-Item -ItemType Directory -Force -Path $Dir | Out-Null

# Python + deps (winget installs if missing)
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { winget install -e --id Python.Python.3.12 --silent }
python -m pip install --quiet requests | Out-Null
# ffplay for audio (best effort)
if (-not (Get-Command ffplay -ErrorAction SilentlyContinue)) { winget install -e --id Gyan.FFmpeg --silent }

Invoke-WebRequest -UseBasicParsing "$Server/agent.py" -OutFile "$Dir\\channelcast_agent.py"

# Wrapper that sets env + runs the agent
@"
@echo off
set CC_SERVER=$Server
set CC_CLAIM=$Claim
set CC_STATE_DIR=$Dir
python "$Dir\\channelcast_agent.py"
"@ | Set-Content -Encoding ASCII "$Dir\\run-agent.cmd"

# Scheduled task: start at boot, keep running
$action  = New-ScheduledTaskAction -Execute "$Dir\\run-agent.cmd"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "ChannelCastAgent" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -User "SYSTEM" -Force | Out-Null
Start-ScheduledTask -TaskName "ChannelCastAgent"

Write-Host "[channelcast] installed. Task 'ChannelCastAgent' is running (starts at boot)."
`;

  return new Response(script, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
