# Device Management Flow

## Purpose

Manage all deployed Channel Cast devices nationwide and globally.

## Primary Routes

`/app/admin/devices`

## Primary Users

Admins, installers, support staff

## Page Sections

Device list, filters, status badges, health cards, device detail, logs, schedule, controls, installation photos.

## User Flow

Admin adds/registers device, assigns to location/ad space, monitors heartbeat, pushes schedule, tests audio, views errors.

## Data Needed

Devices, device_groups, locations, ad_spaces, heartbeats, errors, schedules, playback logs.

## Primary CTAs

Register Device, Assign Location, Sync Schedule, Test Audio, Restart Device, View Logs.

## Empty / Loading / Error States

Offline devices should show last seen and troubleshooting action.

## Acceptance Criteria

Admins can manage device health and assignments clearly.

## Implementation Prompt

```text
Build the Device Management Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
