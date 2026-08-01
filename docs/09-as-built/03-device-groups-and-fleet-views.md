# Device Groups & Fleet Views (as-built)

## Setup wizard

`/app/admin/devices/new` (the "Add Device" page) and the FAB "Add Device" tool
host a 4-step flow (`components/devices/device-setup-wizard.tsx`):

1. **Details** — name + Motion/Scheduled mode (+ optional location) → creates the
   device via `POST /api/admin/devices` (returns a claim code).
2. **Install** — shows the exact PowerShell one-liner (claim code + `CC_MOTION`
   baked in) with a copy button.
3. **Waiting** — polls `GET /api/admin/devices` until the agent checks in.
4. **Done** — confirms connected + links to the device.

The page also carries a setup **guide** (how it works, prerequisites, links to
Fleet / Deployment / Reports).

## Fleet page (`/app/admin/devices`)

Driven by **real** devices end to end: Search → Stats → Tabs all operate on live
data. Poll every 8s so connected devices appear. A device can be removed
(`DELETE /api/admin/devices/:id`, cascades its activity).

### Views

- **List / Table / Cards** — status (Online / Awaiting setup / Offline) + mode.
- **Kanban** — columns by status.
- **Folders (groups)** — devices organized under their group, with an Ungrouped
  bucket; assign via a per-device dropdown.

## Groups

Migration `0005_device_groups.sql`: a `device_groups` table (name, description,
`image_url`) + `devices.group_id` (ON DELETE SET NULL, so members become
ungrouped when a group is deleted).

- API: `GET/POST /api/admin/device-groups`, `PATCH/DELETE /api/admin/device-groups/:id`.
- Assign a device: `PATCH /api/admin/devices/:id { groupId }`.
- UI: create/edit dialog with **name, description, image** (data URL); the group
  image shows as a thumbnail in the Folders view.

### Not yet built

- Per-group **detail pages** with all six views (the folder grouping exists).
- **Calendar / Map** fleet views (need scheduling dates / device geo-coordinates).
