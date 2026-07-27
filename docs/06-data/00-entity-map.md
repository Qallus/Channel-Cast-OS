# Entity Map

```txt
Organization
  ├── Members / Profiles
  ├── Locations
  │     ├── Ad Spaces
  │     │     ├── Public Listings
  │     │     ├── Devices
  │     │     ├── Campaign Assignments
  │     │     └── Playback Logs
  │     └── Device Groups
  ├── Campaigns
  │     ├── Audio Assets
  │     ├── Schedules
  │     ├── Bookings
  │     └── Reports
  ├── Billing
  │     ├── Invoices
  │     ├── Payments
  │     ├── Payouts
  │     └── Commissions
  ├── Partner Requests
  ├── Support Tickets
  └── Agent Threads
```

## Ownership Logic

- Advertisers own campaigns and audio assets.
- Businesses/ad-space owners own or manage locations and ad spaces.
- Channel Cast owns platform settings, public marketplace, device control, approvals, and system reports.
- Partners can be assigned to requests, campaigns, or organizations.
- Resellers can manage associated customer organizations and commissions.
