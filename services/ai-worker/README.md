# AI Worker

Processes image generation jobs from the queue using Gemini.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│   Upstash   │◀────│  Cloud Run  │
│  (Next.js)  │     │   (Redis)   │     │  (Worker)   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   ▲                    │
      │  POST /api/       │                    │  Gemini API
      │  generate-images  │  Job Status        │  calls
      │                   │                    ▼
      └───────────────────┼──────────────┬─────────────┐
                          │              │   R2/S3     │
                          │              │  (Storage)  │
                          │              └─────────────┘
                          │
                     Poll /api/jobs/:id
```

## Quick Start (Local)

### 1. Start Redis
```bash
# Option A: Docker
docker run -d --name redis -p 6399:6379 redis:7

# Option B: Use Upstash
export REDIS_URL="redis://default:xxx@xxx.upstash.io:6379"
```

### 2. Set Environment
```bash
export GEMINI_API_KEY="your-key"
export DATABASE_URL="postgresql://..."
export R2_ACCOUNT_ID="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
export R2_BUCKET="..."
```

### 3. Run Worker
```bash
# From monorepo root
yarn workspace @repo/ai-worker build
./services/ai-worker/scripts/run-local.sh

# Or with rate limit for free tier
GEMINI_RPM=10 ./services/ai-worker/scripts/run-local.sh
```

### 4. Test It
```bash
# In another terminal, from epox-platform
yarn dev

# Then POST to /api/generate-images to enqueue a job
```

## Production Deployment (Cloud Run)

### Prerequisites
1. GCP project with Cloud Run enabled
2. Upstash Redis database
3. Secrets in Secret Manager:
   - `redis-url`
   - `gemini-api-key`
   - `database-url`
   - `r2-credentials` (or equivalent)

### Deploy
```bash
# From monorepo root
gcloud builds submit --config services/ai-worker/cloudbuild.yaml
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Upstash Redis connection string | Required |
| `GEMINI_API_KEY` | Google AI Studio API key | Required |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `GEMINI_RPM` | Gemini rate limit (requests per minute) | `60` |
| `WORKER_CONCURRENCY` | Max parallel jobs | `5` |
| `PORT` | HTTP port for health checks | `8080` |

### Gemini Rate Limits

| Tier | RPM | Recommended Config |
|------|-----|-------------------|
| Free | 10 | `GEMINI_RPM=10` |
| Pay-as-you-go | 60 | `GEMINI_RPM=60` |
| Scale | 1000+ | `GEMINI_RPM=1000` |

### Scaling for Higher Throughput

**Option 1: Increase RPM (higher Gemini tier)**
```yaml
# cloudbuild.yaml
substitutions:
  _GEMINI_RPM: "1000"  # Scale tier
```

**Option 2: Multiple Workers (multiple API keys)**

Deploy multiple instances, each with its own API key:
```bash
# Worker 1 (key A)
gcloud run deploy ai-worker-1 --set-env-vars GEMINI_RPM=60 --set-secrets GEMINI_API_KEY=key-a:latest

# Worker 2 (key B)  
gcloud run deploy ai-worker-2 --set-env-vars GEMINI_RPM=60 --set-secrets GEMINI_API_KEY=key-b:latest
```

All workers consume from the same Redis queue, effectively multiplying throughput.

## Monitoring

### Health Check
```bash
curl http://localhost:8080/health
# {"status":"healthy"}
```

### Bull Board (Optional)
Enable the dashboard for queue visibility:
```bash
ENABLE_BULL_BOARD=true ./scripts/run-local.sh
# Visit http://localhost:8080/admin/queues
```

## Troubleshooting

### Jobs stuck in "waiting"
1. Check worker is running: `curl /health`
2. Check Redis connection: Worker logs will show connection errors
3. Check rate limit: Jobs wait if RPM exceeded

### Jobs failing immediately
1. Check `GEMINI_API_KEY` is valid
2. Check Gemini quota not exceeded
3. Check worker logs for error messages

### Slow processing
1. Increase `WORKER_CONCURRENCY` (up to 10)
2. Increase `GEMINI_RPM` (upgrade Gemini tier)
3. Deploy additional worker instances
