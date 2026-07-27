# Public Marketplace Archive Page

## Purpose

Allow advertisers to search, filter, compare, and start booking available Channel Cast ad spaces.

## Primary Routes

`/marketplace`

## Primary Users

Advertisers, agencies, business owners, national brands, local marketers.

## Page Sections


- Marketplace hero/search bar
- Filter sidebar or mobile filter sheet
- Sort controls
- Listing card grid
- Map/list toggle optional
- Saved listings optional
- CTA for custom campaign help
- Empty state when no filters match


## User Flow


1. Visitor enters search criteria.
2. Visitor filters by business type, geography, budget, play-times, device type, location type, availability, and estimated impressions.
3. Visitor compares listing cards.
4. Visitor opens a single listing or starts a booking/request flow.


## Data Needed

Ad-space listings, public location fields, pricing, available dates, play-times, audience summary, device type, photos, estimated traffic/impressions.

## Primary CTAs

View Details, Book Ad Space, Request Info, Save Listing, Clear Filters.

## Empty / Loading / Error States

No results should show a helpful message and suggested filters. Loading should use skeleton cards. Never render undefined addresses or empty pricing.

## Acceptance Criteria

Filters work, listing cards are clean, mobile filter sheet is usable, and each listing routes to a single page.

## Implementation Prompt

```text
Build the Public Marketplace Archive Page for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
