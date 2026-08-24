export const runtime = "nodejs";

function originFrom(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

// GET /install.bat?claim=XXXX-XXXX&motion=webcam&code=CC-AV-SNHN
// A double-click Windows installer: it self-elevates (one UAC "Yes"), then runs
// the same agent installer as /install.ps1 — no PowerShell typing for the user.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = originFrom(req);
  const claim = (url.searchParams.get("claim") || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 32);
  const code = (url.searchParams.get("code") || "device").replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);
  const motion = url.searchParams.get("motion") === "webcam";

  const setClaim = claim ? `$env:CC_CLAIM='${claim}'; ` : "";
  const setMotion = motion ? "$env:CC_MOTION='webcam'; " : "";

  const bat = `@echo off\r
title Channel Cast - Device Setup\r
REM ================================================================\r
REM  Channel Cast device installer\r
REM  Just double-click this file, then click "Yes" on the prompt.\r
REM ================================================================\r
\r
REM Self-elevate to Administrator if needed (installs need admin).\r
net session >nul 2>&1\r
if %errorlevel% NEQ 0 (\r
  echo Requesting administrator permission...\r
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"\r
  exit /b\r
)\r
\r
echo ================================================\r
echo   Channel Cast - installing the device agent\r
echo ================================================\r
echo This installs Python, FFmpeg${motion ? " and OpenCV" : ""}, connects this\r
echo player, and starts it automatically at every sign-in.\r
echo Please leave this window open until it says Done.\r
echo.\r
\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:CC_SERVER='${origin}'; ${setClaim}${setMotion}irm '${origin}/install.ps1' | iex"\r
\r
echo.\r
echo ================================================\r
echo   Done. This device should appear ONLINE in your\r
echo   Channel Cast dashboard within about 30 seconds.\r
echo   You can close this window.\r
echo ================================================\r
echo.\r
pause\r
`;

  return new Response(bat, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="channel-cast-setup-${code}.bat"`,
      "Cache-Control": "no-store",
    },
  });
}
