# Device API Prompt

```text
Implement the Channel Cast device API.

Device types:

- AI vision device
- PIR motion device
- Scheduled/radio-style playback device

Core endpoints:

- POST /api/devices/register
- POST /api/devices/heartbeat
- GET /api/devices/:hardwareId/schedule
- POST /api/devices/:hardwareId/trigger
- POST /api/devices/:hardwareId/playback/start
- POST /api/devices/:hardwareId/playback/complete
- POST /api/devices/:hardwareId/error
- POST /api/devices/:hardwareId/sync

Rules:

- Authenticate devices with hardware ID plus device secret/token.
- Rate-limit device endpoints.
- Log all trigger and playback events.
- Cache schedules where possible.
- Never send unapproved audio to devices.
- Respect campaign schedule, play-times, cooldown, daily limits, priority, and active status.
- Device should receive a clean payload with audio URLs, duration, campaign ID, schedule, priority, volume, and fallback behavior.
- Device API must support offline recovery and delayed log syncing.
```
