# Worker Autoscaler

Monitors PostgreSQL queue depth and automatically scales Railway worker instances.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PostgreSQL │────▶│  Autoscaler │────▶│   Railway   │
│  (queue)    │     │             │     │   API       │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                           │                   ▼
                    ┌──────▼──────┐     ┌─────────────┐
                    │    Redis    │◀────│  Workers    │
                    │ (rate limit)│     │  (0-N)      │
                    └─────────────┘     └─────────────┘
```

## Scaling Logic

| Queue Depth | Workers | Reasoning |
|-------------|---------|-----------|
| 0 jobs | 0 | No work, save money |
| 1-10 jobs | 1 | Light load |
| 11-30 jobs | 2 | Moderate load |
| 31-60 jobs | 3 | Heavy load |
| 61-100 jobs | 4 | Very heavy |
| 100+ jobs | 5 (max) | Respect rate limit |

**Cooldowns:**
- Scale up: 30 seconds
- Scale down: 2 minutes

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RAILWAY_API_TOKEN` | Yes | - | Railway API token |
| `RAILWAY_PROJECT_ID` | Yes | - | Railway project ID |
| `RAILWAY_ENVIRONMENT_ID` | Yes | - | Railway environment ID |
| `RAILWAY_WORKER_SERVICE_ID` | Yes | - | Worker service ID to scale |
| `DATABASE_URL` | Yes | - | PostgreSQL connection |
| `REDIS_URL` | Yes | - | Redis connection |
| `MAX_WORKERS` | No | 5 | Maximum worker count |
| `MIN_WORKERS` | No | 0 | Minimum worker count |
| `GLOBAL_RPM_LIMIT` | No | 60 | Total RPM across all workers |
| `POLL_INTERVAL_MS` | No | 10000 | Queue check interval |
| `SCALE_DOWN_COOLDOWN_MS` | No | 120000 | Scale down cooldown |
| `SCALE_UP_COOLDOWN_MS` | No | 30000 | Scale up cooldown |
| `PORT` | No | 8080 | Health check port |

## Railway Setup

### 1. Get Railway API Token

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and get token
railway login
railway whoami
```

Or create a token at: https://railway.app/account/tokens

### 2. Get Project/Environment/Service IDs

```bash
# In your Railway project directory
railway status

# Or use GraphQL playground: https://railway.app/graphiql
```

### 3. Deploy Autoscaler

```bash
# In Railway dashboard:
# 1. New Service → Empty Service
# 2. Connect GitHub repo
# 3. Set root directory: services/worker-autoscaler
# 4. Add environment variables
# 5. Deploy
```

## Endpoints

### GET /health

```json
{
  "status": "healthy",
  "workers": 2,
  "maxWorkers": 5,
  "queueDepth": 15,
  "rpmUsage": 30,
  "rpmLimit": 60
}
```

### GET /metrics

```json
{
  "workers_current": 2,
  "workers_max": 5,
  "queue_pending": 10,
  "queue_processing": 5,
  "rpm_used": 30,
  "rpm_limit": 60
}
```

## Cost Estimate

| Component | Cost |
|-----------|------|
| Autoscaler (always on) | ~$0.50-1.00/mo |
| Redis (always on) | ~$1.00-1.50/mo |
| Workers (variable) | ~$0.001-0.03/burst |

**Fixed cost:** ~$2.50/mo
**Variable:** Depends on job volume

## Local Development

```bash
# Set environment variables
export RAILWAY_API_TOKEN=...
export DATABASE_URL=...
export REDIS_URL=...

# Run locally
yarn dev
```

## Testing

Run the integration tests to validate autoscaling decisions and rate limiting:

```bash
# Run all tests (starts Docker, runs tests, stops Docker)
yarn test

# Or run steps manually:
yarn test:up     # Start Redis + PostgreSQL containers
yarn test:run    # Run test suite
yarn test:down   # Stop and cleanup containers
```

### Test Scenarios

The test harness validates:

1. **Autoscaling decisions** - Correct worker count for 0, 1, 10, 50, 100, 500, 1000 jobs
2. **Rate limit distribution** - Per-worker RPM calculated correctly (60 RPM / N workers)
3. **Rate limit enforcement** - Requests blocked when limit reached
4. **Dynamic RPM** - Different RPM configurations (30, 60, 120) enforced correctly
5. **Scale up/down sequence** - Realistic job flow from empty → burst → completion

### Test Output

```
🧪 Starting Worker Autoscaler Integration Tests

📊 Test 1: Autoscaling decisions for various job counts
     0 jobs → 0 workers ✅
     1 jobs → 1 workers ✅
    50 jobs → 3 workers ✅
   100 jobs → 4 workers ✅
  1000 jobs → 5 workers ✅

📊 Test 2: Rate limiting with different worker counts
  1 workers → 60 RPM/worker ✅
  5 workers → 12 RPM/worker ✅

📋 TEST SUMMARY
  Total:  25
  Passed: 25 ✅
  Failed: 0 ❌

🎉 All tests passed!
```

## Related Files

- Worker: `services/generation-worker/`
- Rate limiter: `services/generation-worker/src/rate-limiter.ts`
- Design log: `docs/design-logs/004-postgres-job-queue.md`
