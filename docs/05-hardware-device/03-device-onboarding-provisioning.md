# Device Onboarding and Provisioning

## Admin Flow

1. Admin creates device record.
2. System generates hardware ID or waits for device registration.
3. Admin assigns device to organization, location, and ad space.
4. Installer enters registration code on device.
5. Device calls registration endpoint.
6. System returns token and initial configuration.
7. Device starts heartbeat.
8. Admin verifies online status.
9. Admin tests audio.
10. Admin assigns schedule/campaign.

## Device Setup Fields

- Device name
- Hardware ID
- Device type
- Model
- Location
- Ad space
- Volume
- Timezone
- Network type
- Install photos
- Notes

## Statuses

- needs_setup
- registered
- online
- offline
- warning
- error
- updating
- retired
