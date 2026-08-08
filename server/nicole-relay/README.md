# Nicole voice relay

A tiny WebSocket relay so the browser can talk to the xAI realtime agent
**without ever seeing `XAI_API_KEY`** (browsers can't set the `Authorization`
header xAI needs, and the key must stay server-side).

```
Browser (mic/speaker) ⇄ this relay (holds XAI_API_KEY) ⇄ wss://api.x.ai/v1/realtime
```

## Deploy in Coolify (as its own service)
1. New **Resource → Application** from the `Qallus/Channel-Cast-OS` repo.
2. **Base directory:** `server/nicole-relay`  ·  **Build:** `npm install`  ·  **Start:** `npm start`
3. **Environment variables:**
   - `XAI_API_KEY` = your xAI key **(mark secret)**
   - `XAI_AGENT_ID` = `agent_HamskohGyCzAkXQc` (optional; this is the default)
   - `ALLOWED_ORIGINS` = `https://channelcast.io,https://www.channelcast.io,https://os.channelcast.io` (optional; locks the relay to your sites)
   - `PORT` = `8787` (or whatever Coolify assigns)
4. Give it a domain, e.g. **`nicole.channelcast.io`**, with SSL (Coolify handles WSS).

## Point the web app at it
In the **main app's** env (build-time, since it's public):
```
NEXT_PUBLIC_NICOLE_WS_URL = wss://nicole.channelcast.io
```

That's it — the "Talk to Nicole AI" button in the site FAB will connect through this relay.

## Local test
```
cd server/nicole-relay
npm install
XAI_API_KEY=xai-... node index.mjs
# then set NEXT_PUBLIC_NICOLE_WS_URL=ws://localhost:8787 in the web app's .env.local
```
