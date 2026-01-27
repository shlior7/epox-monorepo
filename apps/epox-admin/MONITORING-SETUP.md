# Monitoring Setup: Betterstack & Sentry

This guide explains how to integrate Betterstack and Sentry with Epox Admin for real-time monitoring and alerting.

## Overview

Epox Admin includes built-in integration with two monitoring services:

1. **Betterstack (Logtail)** - Log aggregation and alerting
2. **Sentry** - Error tracking and performance monitoring

Critical alerts (quota exceeded, high costs, error spikes) are automatically forwarded to both services when configured.

## Betterstack Setup

### 1. Create a Betterstack Account

1. Sign up at https://betterstack.com
2. Navigate to "Logs" → "Sources"
3. Click "Add Source" and select "HTTP"
4. Copy the source token

### 2. Configure Environment Variables

Add to your `.env.local`:

```bash
BETTERSTACK_SOURCE_TOKEN=your_source_token_here
```

### 3. Verify Integration

Once configured, critical alerts will appear in Betterstack with:

- **Level**: `error` (critical) or `warn` (high/medium)
- **Context**: Alert metadata including client info, values, thresholds
- **Searchable**: By `alert_type`, `client_id`, `alert_severity`

### 4. Create Betterstack Alerts

In Betterstack dashboard:

1. Go to "Alerts" → "Create Alert"
2. Set conditions:
   - **Critical Quota**: `context.alert_type = "quota_exceeded"`
   - **High Cost**: `context.alert_type = "high_cost" AND context.value > 500`
   - **Error Rate**: `context.alert_type = "high_error_rate"`
3. Configure notification channels (email, Slack, PagerDuty, etc.)

### Example Betterstack Alert Rules

```
# Critical Quota Alert
level = "error" AND context.alert_type = "quota_exceeded"
→ Send to: #critical-alerts (Slack)

# High Monthly Cost
context.alert_type = "high_cost" AND context.value > 500
→ Send to: #finance-alerts (Slack)

# Platform Error Rate
context.alert_type = "high_error_rate" AND context.value > 25
→ Send to: PagerDuty (On-call)
```

## Sentry Setup

### 1. Create a Sentry Project

1. Sign up at https://sentry.io
2. Create a new project (select "Next.js")
3. Copy the DSN (Data Source Name)

### 2. Install Sentry SDK

```bash
cd apps/scenergy-visualizer
yarn add @sentry/nextjs
```

### 3. Initialize Sentry

Run the Sentry wizard:

```bash
npx @sentry/wizard@latest -i nextjs
```

This will create:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- Update `next.config.js`

### 4. Configure Environment Variables

Add to your `.env.local`:

```bash
SENTRY_DSN=your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_auth_token_here
SENTRY_ORG=your_org_slug
SENTRY_PROJECT=epox-admin
```

### 5. Update Sentry Configs

Edit `sentry.server.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Set trace sample rate
  tracesSampleRate: 0.1,

  // Enable logging
  enableLogs: true,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || "development",

  // Custom integrations
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["error", "warn"] }),
  ],
});
```

Edit `sentry.client.config.ts` similarly.

### 6. Verify Integration

Once configured, alerts will appear in Sentry with:

- **Level**: `error` (critical) or `warning` (other)
- **Tags**: `alert_type`, `alert_severity`, `client_id`
- **Extra Data**: Client name, values, thresholds, metadata

### 7. Create Sentry Alerts

In Sentry dashboard:

1. Go to "Alerts" → "Create Alert"
2. Set conditions:
   - **Critical Alerts**: When `tags.alert_severity = "critical"`
   - **Specific Client**: When `tags.client_id = "client_xyz"`
   - **Frequency**: When event count > threshold
3. Configure actions (email, Slack, webhooks)

### Example Sentry Alert Rules

```
# Critical Alerts Only
When tags.alert_severity equals "critical"
→ Send notification to: #critical-alerts (Slack)

# High Cost Alerts
When tags.alert_type equals "high_cost"
AND event.extra.value > 500
→ Send email to: finance@company.com

# Specific Client Monitoring
When tags.client_id equals "important-client-id"
AND tags.alert_severity in ["critical", "high"]
→ Send to: PagerDuty
```

## Alert Types Reference

### Quota Alerts

| Type | Severity | Trigger | Sent to Monitoring |
|------|----------|---------|-------------------|
| `quota_exceeded` | critical | Usage >= 100% | ✅ Yes |
| `quota_warning` | high/medium | Usage >= 80% | ❌ No (only critical) |

### Cost Alerts

| Type | Severity | Trigger | Sent to Monitoring |
|------|----------|---------|-------------------|
| `high_cost` | critical/high | >$500 / >$100 per month | ✅ Only if critical |
| `cost_spike` | high | >200% increase vs last month | ❌ No |

### Error Alerts

| Type | Severity | Trigger | Sent to Monitoring |
|------|----------|---------|-------------------|
| `high_error_rate` | critical/high | >25% / >10% error rate | ✅ Only if critical |

## Testing the Integration

### 1. Trigger Test Alerts

You can manually trigger alerts by:

1. Creating a test client with low quota
2. Generating enough operations to exceed quota
3. Checking the alerts page: `/admin/alerts`

Or use the API directly:

```bash
curl http://localhost:3000/api/admin/alerts
```

### 2. Verify in Betterstack

1. Go to Betterstack Logs dashboard
2. Search for `alert_type`
3. You should see log entries with full alert context

### 3. Verify in Sentry

1. Go to Sentry Issues dashboard
2. Check for messages with tag `alert_type`
3. View the event details to see all metadata

## Monitoring Best Practices

### 1. Alert Fatigue Prevention

- Only send **critical** alerts to on-call/PagerDuty
- Route **high** severity to team Slack channels
- Send **medium/low** to email digests
- Use Betterstack/Sentry muting for known issues

### 2. Alert Grouping

In Sentry, group alerts by:
- `alert_type` - See all quota alerts together
- `client_id` - See all alerts for a specific client
- `alert_severity` - Prioritize by severity

### 3. Response Workflows

Create runbooks for common alerts:

**Quota Exceeded:**
1. Check client details in Epox Admin
2. Review usage trends
3. Contact client to upgrade plan or adjust usage

**High Cost:**
1. Check cost breakdown by operation type
2. Identify unusual spike (cost_spike alert?)
3. Investigate client activity
4. Consider implementing cost limits

**High Error Rate:**
1. Check Sentry for specific errors
2. Review recent deployments
3. Check external service status
4. Investigate affected operations

### 4. Dashboard Setup

**Betterstack Dashboard:**
- Widget 1: Critical alerts (last 24h)
- Widget 2: Alert count by type (last 7d)
- Widget 3: Top 5 clients by alert count

**Sentry Dashboard:**
- Chart 1: Alert frequency over time
- Chart 2: Alerts by severity
- Chart 3: Affected clients count

## Troubleshooting

### Betterstack not receiving logs

1. Verify `BETTERSTACK_SOURCE_TOKEN` is set
2. Check network connectivity to `in.logs.betterstack.com`
3. Look for errors in server console: `[ALERT SERVICE]`
4. Test with curl:

```bash
curl -X POST https://in.logs.betterstack.com/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "test", "dt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

### Sentry not receiving events

1. Verify `SENTRY_DSN` is set correctly
2. Check Sentry initialization logs
3. Verify `globalThis.Sentry` is available
4. Test manually:

```typescript
if (typeof globalThis !== 'undefined' && (globalThis as any).Sentry) {
  (globalThis as any).Sentry.captureMessage('Test alert');
}
```

### Alerts not generating

1. Check alerts API: `GET /api/admin/alerts`
2. Verify clients exist with quotas/usage
3. Check database connectivity
4. Review alert service logs

## Environment Variables Summary

Required for full monitoring:

```bash
# Betterstack
BETTERSTACK_SOURCE_TOKEN=your_source_token

# Sentry
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_auth_token
SENTRY_ORG=your_org_slug
SENTRY_PROJECT=epox-admin
```

## Next Steps

1. Set up alert notification channels (Slack, email, PagerDuty)
2. Create escalation policies for critical alerts
3. Document response procedures for each alert type
4. Schedule regular review of alert thresholds
5. Monitor alert noise and adjust as needed

## Resources

- **Betterstack Docs**: https://betterstack.com/docs/logs/
- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Alert Service Code**: `lib/services/alert-service.ts`
- **Alerts API**: `app/api/admin/alerts/route.ts`
