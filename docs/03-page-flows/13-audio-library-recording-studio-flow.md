# Audio Library and Recording Studio Flow

## Purpose

Let users upload, organize, record, edit, and submit audio content.

## Primary Routes

`/app/advertiser/audio`, `/app/advertiser/studio`, `/app/admin/audio`

## Primary Users

Advertisers, admins, audio producers, voice talent

## Page Sections

Audio library, upload, record, preview, transcript, effects, approval status, partner requests.

## User Flow

User uploads/records audio, edits/previews, saves draft, submits for approval, admin/partner reviews.

## Data Needed

Audio assets, transcripts, effects, approvals, campaign links, partner requests.

## Primary CTAs

Upload Audio, Record Spot, Ask AI Agent, Add Effect, Submit for Approval, Request Voice Talent.

## Empty / Loading / Error States

If microphone access is denied, show upload and help options.

## Acceptance Criteria

Audio can be created and routed to campaign approval without leaving the app.

## Implementation Prompt

```text
Build the Audio Library and Recording Studio Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
