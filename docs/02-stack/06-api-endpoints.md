# API Endpoints

## Public Marketplace

- `GET /api/listings`
- `GET /api/listings/:slug`
- `POST /api/quote-requests`
- `POST /api/bookings/start`
- `POST /api/bookings/checkout`

## Advertiser

- `GET /api/advertiser/dashboard`
- `GET /api/advertiser/campaigns`
- `POST /api/advertiser/campaigns`
- `PATCH /api/advertiser/campaigns/:id`
- `POST /api/advertiser/audio/upload`
- `POST /api/advertiser/audio/recording`
- `POST /api/advertiser/partner-requests`

## Admin

- `GET /api/admin/overview`
- `GET /api/admin/devices`
- `POST /api/admin/devices`
- `PATCH /api/admin/devices/:id`
- `GET /api/admin/ad-spaces`
- `POST /api/admin/ad-spaces`
- `PATCH /api/admin/ad-spaces/:id`
- `POST /api/admin/campaigns/:id/approve`
- `POST /api/admin/audio/:id/approve`
- `GET /api/admin/reports/playback`

## Billing

- `POST /api/stripe/checkout-session`
- `POST /api/stripe/webhook`
- `GET /api/invoices`
- `GET /api/payouts`

## AI Agent

- `POST /api/agent/thread`
- `POST /api/agent/message`
- `POST /api/agent/actions/request`
- `POST /api/agent/actions/approve`
- `GET /api/agent/tools`

## Common API Rules

- Authenticate protected endpoints.
- Validate all input with Zod or equivalent.
- Use role-based permission checks.
- Write audit logs for admin, billing, approval, device control, and agent actions.
- Return safe errors to the client.
