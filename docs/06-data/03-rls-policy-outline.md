# RLS Policy Outline

## Public Access

Public users may read published public listings only.

They must not read:

- private location details unless explicitly public
- private device details
- advertiser billing
- owner revenue
- private campaign data
- user profiles beyond intentionally public fields

## Authenticated Users

Authenticated users can read/write records owned by their organization, based on membership and role.

## Admin Access

Super admins can read/write all records. Admins can read/write records based on assigned permissions.

## Example Rules

- Advertisers can see their own campaigns, bookings, invoices, and audio assets.
- Businesses/ad-space owners can see their own locations, ad spaces, assigned devices, active campaigns at their locations, and revenue share.
- Partners can see assigned requests and deliverables.
- Resellers can see assigned customer organizations and commission records.
- Installers can see assigned device installation records.
- Public listing read access must be separate from ad_space private data.

## Sensitive Tables

Require strict policies:

- payments
- payouts
- commissions
- device secrets/tokens
- audit_logs
- agent_actions
- organization_members
