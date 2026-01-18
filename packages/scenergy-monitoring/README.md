# scenergy-monitoring

Monitoring tools for AI job queues: Bull Board dashboard, webhook alerts, and structured logging.

## Features

- **Bull Board** - Web dashboard for BullMQ queues
- **Webhook Alerts** - Slack/Discord notifications for failures
- **Structured Logging** - JSON logs for Cloud Run

## Usage

### Bull Board Dashboard

```typescript
import express from 'express';
import { createBullBoardApp } from 'scenergy-monitoring';

const app = express();

const { serverAdapter } = createBullBoardApp({
  redisUrl: process.env.REDIS_URL,
  basePath: '/admin/queues',
});

app.use('/admin/queues', serverAdapter.getRouter());
```

### Webhook Alerts

```typescript
import { createAlertService } from 'scenergy-monitoring';

const alerts = createAlertService({
  channels: [
    { type: 'slack', url: process.env.SLACK_WEBHOOK_URL, enabled: true },
    { type: 'discord', url: process.env.DISCORD_WEBHOOK_URL, enabled: true },
  ],
});

// Send alert
await alerts.sendAlert({
  type: 'job_failed',
  severity: 'error',
  message: 'Image generation failed',
  details: { jobId: 'abc123', error: 'API timeout' },
  timestamp: new Date(),
});
```

### Structured Logging

```typescript
import { createLogger } from 'scenergy-monitoring';

const logger = createLogger('ai-worker');

logger.info('Job started', { jobId: 'abc123' });
logger.error('Job failed', new Error('timeout'), { jobId: 'abc123' });

// Output (JSON for Cloud Logging):
// {"timestamp":"2026-01-15T10:30:00Z","level":"info","service":"ai-worker","message":"Job started","context":{"jobId":"abc123"}}
```

## Exports

```typescript
// Dashboard
export { createBullBoardApp, getBullBoardRouter } from './dashboard';

// Alerts
export { AlertService, createAlertService, getAlertService } from './alerts';

// Logging
export { createLogger, structuredLog } from './logging';
```

## Environment Variables

```bash
# Optional: Webhook alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
ALERT_WEBHOOK_URL=https://your-webhook.com/alerts
```

