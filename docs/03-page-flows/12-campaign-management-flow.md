# Campaign Management Flow

## Purpose

Create, approve, schedule, launch, pause, and report on audio campaigns.

## Primary Routes

`/app/admin/campaigns`, `/app/advertiser/campaigns`

## Primary Users

Admins, advertisers, partners

## Page Sections

Campaign list, campaign builder, selected ad spaces/devices, schedule, audio assets, approval status, pacing, stats.

## User Flow

Advertiser/admin creates campaign, selects ad spaces, adds audio, sets schedule, submits/approves, launches, monitors stats.

## Data Needed

Campaigns, campaign_assets, campaign_ad_spaces, schedules, bookings, playback logs.

## Primary CTAs

Create Campaign, Add Audio, Select Ad Spaces, Submit for Approval, Approve, Launch, Pause.

## Empty / Loading / Error States

Campaign without approved audio cannot launch.

## Acceptance Criteria

Campaigns respect content approval, schedule, budget, and permissions.

## Implementation Prompt

```text
Build the Campaign Management Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
