# Trigger and Playback Rules

## Trigger Types

- motion_detected
- person_detected
- group_detected
- dwell_time_reached
- scheduled_play
- manual_play
- admin_test
- campaign_rotation

## Playback Eligibility

A track can play only if:

- Audio is approved.
- Campaign is active.
- Campaign date range is valid.
- Day/time window is valid.
- Device or ad space is assigned.
- Daily/hourly limits are not exceeded.
- Cooldown has passed.
- Location/category restrictions are satisfied.
- Payment/booking status allows delivery.

## Prioritization

- Higher priority campaign wins.
- Then pacing needs.
- Then rotation weight.
- Then least recently played.

## Logs

Log both:

- Trigger events
- Playback start/complete events

This allows Channel Cast to distinguish detected activity from completed audio delivery.
