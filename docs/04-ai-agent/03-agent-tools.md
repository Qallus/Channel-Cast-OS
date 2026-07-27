# Agent Tools

These are logical tools the AI Agent should eventually call through Hermes or the Channel Cast API.

## Marketplace Tools

- `search_ad_spaces(filters)`
- `get_ad_space_listing(slug_or_id)`
- `recommend_ad_spaces(business_profile, campaign_goal)`
- `save_listing(user_id, listing_id)`

## Booking Tools

- `create_booking_draft(listing_id, dates, play_times, package_id)`
- `update_booking_draft(booking_id, fields)`
- `start_checkout(booking_id)`
- `request_booking_approval(booking_id)`

## Campaign Tools

- `create_campaign_draft(advertiser_id, details)`
- `update_campaign(campaign_id, fields)`
- `submit_campaign_for_approval(campaign_id)`
- `get_campaign_status(campaign_id)`
- `get_campaign_stats(campaign_id, date_range)`

## Audio Tools

- `create_script(business_profile, offer, duration, tone, cta)`
- `save_script(campaign_id, script)`
- `upload_audio_asset(file, metadata)`
- `submit_audio_for_approval(audio_id)`
- `request_voice_talent(audio_request)`
- `request_radio_production(audio_request)`

## Device Tools

- `get_device_status(device_id)`
- `get_offline_devices(filters)`
- `get_device_errors(device_id)`
- `get_device_schedule(device_id)`
- `create_device_support_ticket(device_id, issue)`

## Admin Tools

- `list_pending_approvals(type)`
- `approve_audio(audio_id)`
- `reject_audio(audio_id, notes)`
- `approve_campaign(campaign_id)`
- `reject_campaign(campaign_id, notes)`
- `create_support_ticket(fields)`
- `assign_ticket(ticket_id, user_id)`

## Billing Tools

- `get_invoice(invoice_id)`
- `get_payment_status(booking_id)`
- `get_revenue_report(filters)`
- `get_payout_status(organization_id)`

## Tool Safety

High-impact actions require explicit approval:

- Launch campaign
- Approve/reject content
- Process payment/refund
- Change user role
- Reset/restart device
- Publish public listing
- Send customer-facing messages
