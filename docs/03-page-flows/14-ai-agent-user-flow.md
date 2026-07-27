# AI Agent User Flow

## Purpose

Provide role-aware assistance for advertisers, admins, businesses, resellers, and partners.

## Primary Routes

`/app/agent`, floating panel on dashboard pages

## Primary Users

All authenticated users

## Page Sections

Agent chat, suggested actions, context cards, tool approvals, recent threads, handoff option.

## User Flow

User asks question, agent gathers context, suggests next steps, requests tool action approval, logs action or escalates.

## Data Needed

User profile, role, active page context, docs, allowed tools, campaign/listing/device records.

## Primary CTAs

Ask AI Agent, Approve Action, Create Ticket, Draft Script, Recommend Ad Spaces.

## Empty / Loading / Error States

If agent cannot act, it should explain and route to support/human.

## Acceptance Criteria

Agent helps complete tasks without violating permissions or making up data.

## Implementation Prompt

```text
Build the AI Agent User Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
