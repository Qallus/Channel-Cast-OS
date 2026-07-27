# Auth, Roles, and Permissions

## Roles

- super_admin
- admin
- support_staff
- sales_staff
- billing_staff
- advertiser
- business_owner
- ad_space_manager
- reseller
- partner
- radio_station_partner
- voice_talent_partner
- audio_producer
- installer
- viewer

## Permission Areas

- dashboard:view
- users:manage
- organizations:manage
- advertisers:manage
- ad_spaces:manage
- listings:publish
- devices:manage
- devices:control
- campaigns:create
- campaigns:approve
- campaigns:launch
- audio:create
- audio:approve
- billing:view
- billing:manage
- payouts:manage
- reports:view
- support:manage
- agent:use
- agent:approve_actions

## Route Protection

Public routes are visible to anyone. Authenticated routes require login. Admin routes require admin-level permissions. Organization-owned records must be filtered by membership.

## Critical Rules

- Users cannot escalate their own role.
- Only super admins can create other super admins.
- Do not allow disabling the last super admin.
- Public listing data must be separated from private organization/device/billing data.
- Device secrets must never be visible in client-side code.
