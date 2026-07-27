# Public Single Ad-Space Listing Page

## Purpose

Present a detailed Airbnb/Zillow-style ad-space page that helps advertisers decide whether to book.

## Primary Routes

`/marketplace/[slug]`

## Primary Users

Advertisers, agencies, local businesses, national brands.

## Page Sections


- Photo gallery/hero
- Listing title and location summary
- Business/location type
- Audience profile
- Estimated daily/monthly visitors
- Estimated impressions
- Device type: AI vision, PIR motion, or scheduled channel
- Available play-times
- Campaign packages/pricing
- Minimum campaign length
- Content restrictions
- Location map or general area
- Related ad spaces
- Sticky booking card
- Contact/request info CTA


## User Flow


1. Visitor reviews listing details.
2. Visitor checks availability and pricing.
3. Visitor chooses to book, request approval, or ask for more info.
4. Visitor is routed to booking or quote flow.


## Data Needed

Listing, ad_space, location, public photos, pricing packages, availability, campaign rules, related listings.

## Primary CTAs

Book Ad Space, Request Info, Contact Channel Cast, Share Listing.

## Empty / Loading / Error States

If exact address is hidden, show city/region. If pricing is missing, show Request Quote. If metrics are missing, show Available upon request.

## Acceptance Criteria

Single listing page is useful, trustworthy, SEO-friendly, and never displays broken or private data.

## Implementation Prompt

```text
Build the Public Single Ad-Space Listing Page for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
