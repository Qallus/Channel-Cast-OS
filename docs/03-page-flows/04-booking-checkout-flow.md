# Booking and Checkout Flow

## Purpose

Let advertisers book or request an ad space, create an account, pay, and start content creation.

## Primary Routes

`/marketplace/[slug]/book`, `/checkout`

## Primary Users

Advertisers, agencies, business owners.

## Page Sections


- Selected listing summary
- Date picker
- Play-time selector
- Package selector
- Estimated plays/impressions summary
- Campaign goal field
- Account prompt: register/login
- Payment step
- Confirmation screen
- Next step: create/upload/record audio


## User Flow


1. Select ad space.
2. Choose campaign dates.
3. Choose play-times.
4. Choose package and budget.
5. Create account or log in.
6. Pay directly or submit request-to-book.
7. System creates booking and campaign draft.
8. User is redirected to advertiser dashboard audio/content setup.


## Data Needed

Listing, packages, availability, advertiser profile, booking details, Stripe session, campaign draft.

## Primary CTAs

Continue, Create Account, Login, Pay and Reserve, Request Approval, Create Audio Spot.

## Empty / Loading / Error States

If payment fails, booking remains draft. If approval is required, show pending review. If user is not logged in, preserve selected booking details through auth.

## Acceptance Criteria

Booking flow captures dates, play-times, package, user account, payment/request status, and creates campaign draft.

## Implementation Prompt

```text
Build the Booking and Checkout Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
