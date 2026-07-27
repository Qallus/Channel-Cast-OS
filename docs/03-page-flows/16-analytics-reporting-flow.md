# Analytics and Reporting Flow

## Purpose

Show playback, delivery, visitor estimates, campaign pacing, device uptime, and revenue performance.

## Primary Routes

`/app/admin/reports`, `/app/advertiser/reports`

## Primary Users

Admins, advertisers, partners, owners

## Page Sections

Date filters, metric cards, charts, playback log table, campaign/location/device breakdowns, export.

## User Flow

User filters date/campaign/location, reviews metrics, exports or shares report.

## Data Needed

Playback logs, trigger events, devices, campaigns, ad spaces, revenue records.

## Primary CTAs

Export Report, Share Report, Filter, View Campaign, View Device.

## Empty / Loading / Error States

If no logs, show helpful empty state and sample setup steps.

## Acceptance Criteria

Reports explain value without exaggerating estimates.

## Implementation Prompt

```text
Build the Analytics and Reporting Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
