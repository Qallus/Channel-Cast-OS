# Billing and Revenue Flow

## Purpose

Manage payments, invoices, revenue models, commissions, and payouts.

## Primary Routes

`/app/admin/billing`, `/app/admin/revenue`, `/app/advertiser/billing`, `/app/owner/revenue`

## Primary Users

Admins, advertisers, business owners, partners, resellers, billing staff

## Page Sections

Invoices, payments, subscriptions, revenue by model, payouts, commissions, failed payments.

## User Flow

Payment is created from booking/subscription, Stripe webhook updates status, revenue share/commission records are generated, reports display current state.

## Data Needed

Bookings, invoices, payments, payouts, revenue shares, commissions, Stripe events.

## Primary CTAs

Pay Invoice, View Receipt, Export Report, Mark Payout Reviewed, Retry Payment.

## Empty / Loading / Error States

Failed payments should show clear recovery path.

## Acceptance Criteria

Billing records are accurate and role-filtered.

## Implementation Prompt

```text
Build the Billing and Revenue Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
