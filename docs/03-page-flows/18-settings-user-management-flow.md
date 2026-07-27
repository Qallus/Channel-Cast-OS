# Settings and User Management Flow

## Purpose

Manage profiles, organizations, team members, roles, notification settings, and security.

## Primary Routes

`/app/settings`, `/app/admin/users`

## Primary Users

All users, admins

## Page Sections

Profile settings, organization settings, team members, invites, roles, permissions, notifications, API/device settings.

## User Flow

Admin invites/edits user, assigns role, manages access, user updates profile/preferences.

## Data Needed

Profiles, organizations, organization_members, roles, permissions, invites, audit logs.

## Primary CTAs

Invite User, Edit Role, Disable User, Save Settings, Resend Invite.

## Empty / Loading / Error States

Never allow a user to remove the last super admin or escalate own role.

## Acceptance Criteria

User management is secure and role-aware.

## Implementation Prompt

```text
Build the Settings and User Management Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
