# Firmware / Edge Runtime

## Responsibilities

The device runtime should:

- Authenticate with Channel Cast API.
- Send heartbeat.
- Pull schedule.
- Cache audio files.
- Listen for PIR or AI vision triggers.
- Apply playback rules locally.
- Play audio.
- Log playback events.
- Sync logs after offline periods.
- Report errors.

## Local Cache

Cache:

- Active schedules
- Approved audio files
- Device configuration
- Pending logs

## Offline Behavior

If internet connection is lost:

- Continue approved cached schedule if allowed.
- Queue playback logs locally.
- Stop campaigns that require live validation if configured.
- Sync queued logs when online.

## Update Behavior

- Device should report firmware version.
- Admin dashboard should show update status.
- Updates should not interrupt active playback unless critical.
