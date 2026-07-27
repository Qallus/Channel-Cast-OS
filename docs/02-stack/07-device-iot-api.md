# Device IoT API

## Device Registration

`POST /api/devices/register`

Request:

```json
{
  "hardwareId": "CC-AI-0001",
  "deviceType": "ai_vision",
  "model": "Channel Cast AI Vision Node",
  "firmwareVersion": "0.1.0",
  "registrationCode": "one-time-code"
}
```

Response:

```json
{
  "deviceId": "uuid",
  "deviceToken": "secret-token",
  "status": "registered"
}
```

## Heartbeat

`POST /api/devices/heartbeat`

The device should send heartbeat events on a predictable interval.

Payload fields:

- hardwareId
- status
- firmwareVersion
- ipAddress
- batteryLevel
- signalStrength
- volume
- currentTrack
- storageFreeMb
- localScheduleVersion
- errors

## Schedule Pull

`GET /api/devices/:hardwareId/schedule`

Response should include only approved, active, scheduled content.

Rules:

- Must respect campaign start/end dates.
- Must respect day/time windows.
- Must respect max plays per hour/day.
- Must include cooldown rules.
- Must include priority.
- Must include signed audio URLs or cached asset references.

## Trigger Log

`POST /api/devices/:hardwareId/trigger`

Trigger types:

- motion_detected
- person_detected
- group_detected
- dwell_time_reached
- scheduled_play
- manual_test
- admin_test

## Playback Start / Complete

Use start and complete endpoints so partial plays can be tracked.

`POST /api/devices/:hardwareId/playback/start`

`POST /api/devices/:hardwareId/playback/complete`

## Error Reporting

`POST /api/devices/:hardwareId/error`

Error examples:

- audio_file_missing
- schedule_sync_failed
- sensor_offline
- camera_offline
- speaker_error
- storage_full
- network_error
- firmware_error

## Security

- Devices must authenticate with a token.
- Tokens should be rotated if compromised.
- Rate-limit device endpoints.
- Do not trust device-submitted revenue calculations.
- Validate campaign IDs against device schedule.
