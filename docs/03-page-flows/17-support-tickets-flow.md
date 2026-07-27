# Support Tickets Flow

## Purpose

Manage support requests from advertisers, owners, resellers, partners, installers, and admins.

## Primary Routes

`/app/support`, `/app/admin/support`

## Primary Users

All authenticated users, support staff

## Page Sections

Ticket list, new ticket form, categories, status, messages, attachments, assigned user, linked records.

## User Flow

User creates ticket, support triages, links to campaign/device/billing/listing, resolves or escalates.

## Data Needed

Tickets, comments, attachments, linked records, user/org, audit logs.

## Primary CTAs

Create Ticket, Reply, Assign, Escalate, Resolve.

## Empty / Loading / Error States

If no tickets, show contact/support options.

## Acceptance Criteria

Support requests are traceable and linked to records.

## Implementation Prompt

```text
Build the Support Tickets Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
