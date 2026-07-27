# Agent Cron Jobs and Heartbeat

## AI Agent Heartbeat

The AI Agent should run periodic checks for high-value operational issues.

## Suggested Cron Jobs

### Every 5 Minutes

- Check offline devices.
- Check failed device heartbeats.
- Check active campaigns with no available audio.
- Check urgent support tickets.

### Hourly

- Campaign pacing check.
- Playback anomaly detection.
- Pending content approval reminders.
- Booking payment status sync.
- Device schedule sync health.

### Daily

- Daily admin summary.
- Daily advertiser campaign digest.
- Daily ad-space owner revenue/activity summary.
- Daily partner request summary.
- Daily reseller/customer activity summary.
- Expiring campaign reminders.
- Failed payment follow-up list.

### Weekly

- Weekly network performance report.
- Offline device trend report.
- Top ad-space performance report.
- Top advertiser campaigns report.
- Partner/reseller commission summary.

## Agent-Initiated Notifications

The agent may draft or queue notifications, but sensitive notifications should require approval.

Examples:

- Device offline alert
- Campaign needs audio
- Audio rejected with notes
- Campaign ending soon
- Invoice past due
- Partner request pending
