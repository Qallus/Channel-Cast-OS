# Database Models

## Core Identity

### profiles

- id
- auth_user_id
- first_name
- last_name
- email
- phone
- avatar_url
- default_organization_id
- status
- created_at
- updated_at

### organizations

- id
- name
- type: channel_cast, advertiser, business_owner, reseller, partner, radio_station, voice_talent, production_partner
- website
- phone
- billing_email
- status
- created_at
- updated_at

### organization_members

- id
- organization_id
- profile_id
- role
- status
- invited_by
- invited_at
- joined_at
- created_at
- updated_at

## Marketplace + Locations

### locations

- id
- organization_id
- name
- address_line_1
- address_line_2
- city
- state
- postal_code
- country
- latitude
- longitude
- location_type
- timezone
- status
- created_at
- updated_at

### ad_spaces

- id
- organization_id
- location_id
- name
- slug
- description
- type
- business_type
- audience_summary
- estimated_daily_visitors
- estimated_monthly_visitors
- estimated_impressions
- device_type
- indoor_outdoor
- pricing_model
- starting_price
- minimum_campaign_days
- availability_status
- public_listing_enabled
- approval_required
- status
- created_at
- updated_at

### public_listings

- id
- ad_space_id
- title
- slug
- hero_image_url
- summary
- public_city
- public_state
- public_country
- show_exact_address
- seo_title
- seo_description
- published_at
- status

## Devices

### devices

- id
- ad_space_id
- location_id
- organization_id
- name
- hardware_id
- device_type: ai_vision, pir_motion, scheduled_radio
- model
- firmware_version
- status
- last_seen_at
- volume
- timezone
- install_notes
- created_at
- updated_at

### device_heartbeats

- id
- device_id
- hardware_id
- status
- ip_address
- firmware_version
- battery_level
- signal_strength
- storage_free_mb
- volume
- current_track
- created_at

### device_errors

- id
- device_id
- error_type
- message
- severity
- resolved
- created_at
- updated_at

## Campaigns + Audio

### audio_assets

- id
- organization_id
- uploaded_by
- title
- description
- asset_type: ad_spot, music, safety, announcement, radio_spot, effect
- file_url
- duration_seconds
- transcript
- approval_status
- created_at
- updated_at

### campaigns

- id
- advertiser_organization_id
- name
- objective
- status
- start_date
- end_date
- budget
- pacing_mode
- approval_status
- created_by
- created_at
- updated_at

### campaign_assets

- id
- campaign_id
- audio_asset_id
- sort_order
- weight
- created_at

### campaign_ad_spaces

- id
- campaign_id
- ad_space_id
- price
- pricing_model
- status
- created_at

### campaign_schedules

- id
- campaign_id
- timezone
- days_of_week
- start_time
- end_time
- max_plays_per_hour
- max_plays_per_day
- cooldown_seconds
- priority
- created_at
- updated_at

## Booking + Billing

### bookings

- id
- advertiser_organization_id
- ad_space_id
- campaign_id
- booking_status
- selected_start_date
- selected_end_date
- selected_play_times
- package_name
- price
- payment_status
- created_at
- updated_at

### quote_requests

- id
- listing_id
- ad_space_id
- advertiser_organization_id
- contact_name
- business_name
- email
- phone
- desired_start_date
- desired_campaign_length
- estimated_budget
- audio_production_needed
- message
- status
- created_at
- updated_at

### playback_logs

- id
- device_id
- campaign_id
- audio_asset_id
- ad_space_id
- trigger_type
- played_at
- duration_played
- completed
- estimated_revenue
- motion_event_id
- metadata
- created_at
