export const runtime = "nodejs";

function originFrom(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

// GET /install-display.bat?claim=XXXX-XXXX&code=CC-DD-SNHN
// The screen version of /install.bat: double-click, click "Yes" once, done.
// No PowerShell typing, same as setting up an audio player.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = originFrom(req);
  const claim = (url.searchParams.get("claim") || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 32);
  const code = (url.searchParams.get("code") || "screen").replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);

  const setClaim = claim ? `$env:CC_CLAIM='${claim}'; ` : "";

  const bat = `@echo off\r
title Channel Cast - Screen Setup\r
REM ================================================================\r
REM  Channel Cast digital display installer\r
REM  Just double-click this file, then click "Yes" on the prompt.\r
REM ================================================================\r
\r
REM Self-elevate to Administrator if needed (power settings need admin).\r
net session >nul 2>&1\r
if %errorlevel% NEQ 0 (\r
  echo Requesting administrator permission...\r
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"\r
  exit /b\r
)\r
\r
echo ================================================\r
echo   Channel Cast - setting up this screen\r
echo ================================================\r
echo This connects the screen, opens your player full-screen,\r
echo stops the display from sleeping, and reopens it at every\r
echo sign-in. Please leave this window open until it says Done.\r
echo.\r
\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:CC_SERVER='${origin}'; ${setClaim}irm '${origin}/install-display.ps1' | iex"\r
\r
echo.\r
echo ================================================\r
echo   Done. The screen should appear ONLINE in your\r
echo   Channel Cast dashboard within about 30 seconds.\r
echo   You can close this window.\r
echo ================================================\r
echo.\r
pause\r
`;

  return new Response(bat, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="channel-cast-screen-${code}.bat"`,
      "Cache-Control": "no-store",
    },
  });
}
