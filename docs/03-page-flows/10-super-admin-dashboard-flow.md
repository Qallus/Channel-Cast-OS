# Super Admin Dashboard Flow

## Purpose

Provide Channel Cast with full control over the business, technology, and advertising network.

## Primary Routes

`/app/admin`

## Primary Users

Super admin, admin team

## Page Sections

Network metrics, device health, active campaigns, revenue, approvals, recent playback, quote requests, alerts.

## User Flow

Admin logs in, reviews health/revenue/approvals, drills into devices/campaigns/listings/users, resolves issues.

## Data Needed

All organizations, devices, ad spaces, campaigns, audio, billing, logs, tickets, agent actions.

## Primary CTAs

Create Ad Space, Register Device, Review Approvals, Launch Campaign, View Reports, Open AI Agent.

## Empty / Loading / Error States

If no production data, show setup checklist.

## Acceptance Criteria

Admin can see what needs action and navigate to every core module.

## Implementation Prompt

```text
Build the Super Admin Dashboard Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
