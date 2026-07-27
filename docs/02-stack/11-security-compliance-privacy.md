# Security, Compliance, and Privacy

## Security Principles

- Least privilege access
- Role-based permissions
- Organization-level data isolation
- Secure device authentication
- Secure file storage
- Payment handled by Stripe
- Audit logs for sensitive actions
- No secrets in client-side code

## AI Vision Privacy

The AI vision device should be designed around privacy-first analytics.

Recommended rules:

- Prefer edge processing when possible.
- Store aggregate visitor/trigger data rather than raw video.
- Do not store biometric identifiers without explicit legal review.
- Do not expose face images or raw camera data in advertiser dashboards.
- Clearly distinguish estimated audience data from verified data.

## Content Safety

Campaign content should go through approval before delivery.

Potential restricted categories should be configurable:

- Political
- Adult
- Alcohol/tobacco
- Cannabis
- Gambling
- Medical claims
- Financial claims
- Competitor conflict
- Location-owner restricted categories

## Audit Logs

Write audit logs for:

- Role changes
- Billing changes
- Campaign approvals
- Audio approvals
- Device control actions
- Payout changes
- AI Agent actions
- Listing publishing changes
