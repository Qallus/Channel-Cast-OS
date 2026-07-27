# AI Vision Device

## Purpose

The AI vision device uses computer vision to detect people or visitor activity and trigger specific audio content based on campaign rules.

## Possible Hardware

- AI-capable edge computer
- Camera or vision sensor
- Speaker or directional speaker
- Audio output/controller
- Wi-Fi/Ethernet/LTE
- Local storage
- Power supply or solar/battery for future versions

## Possible Detection Events

- Person detected
- Group detected
- Zone entered
- Dwell time reached
- Repeat presence detected
- Direction of movement
- Visitor count estimate

## Privacy-First Design

- Prefer edge processing.
- Store aggregate events, not raw video.
- Do not expose raw camera data to advertisers.
- Treat visitor counts and impressions as estimates unless directly measured.

## Playback Logic

1. Vision model detects qualified visitor activity.
2. Device checks cooldown and local schedule.
3. Device chooses eligible campaign/audio by priority and pacing.
4. Device plays audio.
5. Device logs trigger and playback.
6. Device syncs stats to cloud.
