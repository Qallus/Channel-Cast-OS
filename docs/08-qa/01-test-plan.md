# Test Plan

## Unit Tests

- Filter helpers
- Price fallback formatting
- Address fallback formatting
- Permission checks
- Campaign schedule eligibility
- Device payload validation
- Agent tool permission checks

## Integration Tests

- Marketplace search to listing detail
- Booking to checkout to campaign draft
- Audio upload to approval
- Campaign approval to schedule payload
- Device heartbeat to status update
- Playback log to report
- Stripe webhook to payment status

## Role Tests

- Advertiser cannot access admin data.
- Owner cannot access other owners' revenue.
- Partner can only access assigned requests.
- Reseller can only access assigned customers.
- Viewer cannot mutate data.
- User cannot escalate own role.

## Agent Tests

- Agent handles no-data state honestly.
- Agent requests confirmation before actions.
- Agent escalates billing/legal/privacy/hardware failure.
- Agent creates correct campaign script.
