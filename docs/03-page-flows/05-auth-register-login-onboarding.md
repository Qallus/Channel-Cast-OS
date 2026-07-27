# Auth, Register, Login, and Onboarding Flow

## Purpose

Create a clean account flow for advertisers, businesses, partners, resellers, and team members.

## Primary Routes

`/register`, `/login`, `/app/onboarding`

## Primary Users

All user types.

## Page Sections


- Login form
- Register form
- Forgot password
- Business profile setup
- Role/path selection
- Billing/profile setup for advertisers
- Onboarding checklist
- Redirect to role dashboard


## User Flow


1. User registers or logs in.
2. System identifies role and organization.
3. New users complete onboarding fields.
4. User lands on role-specific dashboard.
5. If user came from booking, redirect to booking/content setup.


## Data Needed

User profile, organization, role, onboarding status, pending booking, invited user metadata.

## Primary CTAs

Create Account, Login, Continue Setup, Finish Onboarding, Go to Dashboard.

## Empty / Loading / Error States

Expired invite and failed login states must be clear. Incomplete onboarding should resume where user left off.

## Acceptance Criteria

Auth flow supports role-based onboarding and preserves marketplace booking intent.

## Implementation Prompt

```text
Build the Auth, Register, Login, and Onboarding Flow for Channel Cast. Follow the purpose, routes, users, page sections, data needs, CTAs, states, and acceptance criteria in this document. Use ShadCN/Tailwind components, support dark/light mode, and make the page responsive on desktop, tablet, and mobile.
```
