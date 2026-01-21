# Production Setup Guide

This guide walks you through setting up the full production infrastructure for the Epox platform.

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   epox-platform     │────▶│   Upstash Redis  │◀────│   AI Worker     │
│   (Vercel/Next.js)  │     │   (Queue + Jobs) │     │   (Cloud Run)   │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                    │
         │                                                    │
         ▼                                                    ▼
┌─────────────────────┐                           ┌─────────────────┐
│   Neon PostgreSQL   │                           │   Gemini API    │
│   (Database)        │                           │   (AI Service)  │
└─────────────────────┘                           └─────────────────┘
         │
         ▼
┌─────────────────────┐
│   Cloudflare R2     │
│   (File Storage)    │
└─────────────────────┘
```

## Prerequisites

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- [Upstash Account](https://upstash.com/) (free tier available)
- [Google AI Studio API Key](https://aistudio.google.com/app/apikey)
- Node.js 22+ and Yarn 4+

---

## Step 1: Set Up Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database:
   - **Name**: `epox-queue`
   - **Region**: Choose closest to your Cloud Run region (e.g., `us-central1`)
   - **Type**: Regional (for lower latency)
3. Copy the connection details:
   - **Redis URL**: `redis://default:xxx@xxx.upstash.io:6379`
   - **REST URL**: `https://xxx.upstash.io` (for rate limiting)
   - **REST Token**: `AXxx...`

**Test the connection locally:**

```bash
# Install redis-cli if needed
brew install redis

# Test connection (replace with your URL)
redis-cli -u "redis://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379" ping
# Should return: PONG
```

---

## Step 2: Set Up Google Cloud Project

```bash
# Set your project ID
export GCP_PROJECT="your-gcp-project-id"

# Authenticate and set project
gcloud auth login
gcloud config set project $GCP_PROJECT

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com

# Grant Cloud Build permission to deploy to Cloud Run
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$(gcloud projects describe $GCP_PROJECT --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$(gcloud projects describe $GCP_PROJECT --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

---

## Step 3: Store Secrets in Secret Manager

```bash
# Store Redis URL
echo -n "redis://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379" | \
  gcloud secrets create redis-url --data-file=-

# Store Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | \
  gcloud secrets create gemini-api-key --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding redis-url \
  --member="serviceAccount:$(gcloud projects describe $GCP_PROJECT --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:$(gcloud projects describe $GCP_PROJECT --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 4: Deploy AI Worker to Cloud Run

```bash
cd /Users/liorsht/MyThings/MyProjects/epox-monorepo

# Deploy using Cloud Build
gcloud builds submit --config services/ai-worker/cloudbuild.yaml

# Or deploy manually:
# 1. Build the image
docker build -t gcr.io/$GCP_PROJECT/ai-worker:latest -f services/ai-worker/Dockerfile .

# 2. Push to Container Registry
docker push gcr.io/$GCP_PROJECT/ai-worker:latest

# 3. Deploy to Cloud Run
gcloud run deploy ai-worker \
  --image gcr.io/$GCP_PROJECT/ai-worker:latest \
  --region us-central1 \
  --platform managed \
  --cpu 2 \
  --memory 2Gi \
  --min-instances 0 \
  --max-instances 10 \
  --ingress internal \
  --allow-unauthenticated \
  --set-env-vars "WORKER_CONCURRENCY=5,GEMINI_RPM=60" \
  --set-secrets "REDIS_URL=redis-url:latest,GOOGLE_AI_STUDIO_API_KEY=gemini-api-key:latest"
```

**Verify deployment:**

```bash
# Get the service URL
gcloud run services describe ai-worker --region us-central1 --format='value(status.url)'

# Check logs
gcloud run services logs read ai-worker --region us-central1 --limit 50
```

---

## Step 5: Configure Local Development with Production Services

For local development using production Upstash Redis (but local platform):

**Create `apps/epox-platform/.env.local`:**

```bash
# Database - use local or production
DATABASE_URL="postgresql://test:test@localhost:5434/visualizer_test"
# Or production: DATABASE_URL="postgresql://user:pass@host.neon.tech/neondb?sslmode=require"

# AI - use your Gemini API key
GOOGLE_AI_STUDIO_API_KEY="your-gemini-api-key"

# Redis - use production Upstash
REDIS_URL="redis://default:xxx@xxx.upstash.io:6379"

# Rate limiting (optional, uses same Upstash)
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxx..."

# Storage - local for dev
STORAGE_DRIVER="filesystem"
LOCAL_STORAGE_DIR=".local-storage"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Run the local platform:**

```bash
cd apps/epox-platform
yarn dev
```

**Run the AI worker locally (connecting to production Redis):**

```bash
# Terminal 1: Set env and run worker
export REDIS_URL="redis://default:xxx@xxx.upstash.io:6379"
export GOOGLE_AI_STUDIO_API_KEY="your-gemini-api-key"
export GEMINI_RPM="60"

cd services/ai-worker
yarn build
node dist/index.js
```

---

## Step 6: Test the Full Flow

```bash
# 1. Start local platform (Terminal 1)
cd apps/epox-platform && yarn dev

# 2. Start local worker (Terminal 2)
export REDIS_URL="redis://default:xxx@xxx.upstash.io:6379"
export GOOGLE_AI_STUDIO_API_KEY="your-key"
node services/ai-worker/dist/index.js

# 3. Trigger image generation (Terminal 3)
curl -X POST http://localhost:3000/api/generate-images \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "productIds": ["product-1"],
    "promptTags": {
      "style": "Modern minimalist",
      "mood": "Bright and airy",
      "object": "sofa"
    },
    "settings": {
      "aspectRatio": "16:9",
      "variants": 2
    }
  }'

# 4. Check job status
curl http://localhost:3000/api/jobs/{jobId}
```

---

## Configuration Reference

### Environment Variables

| Variable                   | Description           | Required     | Example            |
| -------------------------- | --------------------- | ------------ | ------------------ |
| `DATABASE_URL`             | PostgreSQL connection | ✅           | `postgresql://...` |
| `GOOGLE_AI_STUDIO_API_KEY` | Gemini API key        | ✅           | `AIza...`          |
| `REDIS_URL`                | Redis connection      | ✅ for queue | `redis://...`      |
| `GEMINI_RPM`               | Rate limit (req/min)  | ❌           | `60`               |
| `WORKER_CONCURRENCY`       | Parallel jobs         | ❌           | `5`                |
| `STORAGE_DRIVER`           | `r2` or `filesystem`  | ❌           | `filesystem`       |

### Gemini API Tiers

| Tier          | RPM   | Cost           |
| ------------- | ----- | -------------- |
| Free          | 15    | $0             |
| Pay-as-you-go | 360   | ~$0.0025/image |
| Scale         | 1000+ | Volume pricing |

---

## Troubleshooting

### Worker not processing jobs

```bash
# Check worker logs
gcloud run services logs read ai-worker --region us-central1

# Verify Redis connection
redis-cli -u "$REDIS_URL" ping

# Check queue status
redis-cli -u "$REDIS_URL" keys "bull:*"
```

### Jobs stuck in queue

```bash
# List waiting jobs
redis-cli -u "$REDIS_URL" lrange "bull:ai-jobs:wait" 0 -1

# Check failed jobs
redis-cli -u "$REDIS_URL" zrange "bull:ai-jobs:failed" 0 -1
```

### Clear all jobs (development only!)

```bash
redis-cli -u "$REDIS_URL" --scan --pattern "bull:*" | xargs redis-cli -u "$REDIS_URL" del
```

---

## Quick Reference Commands

```bash
# Deploy worker
gcloud builds submit --config services/ai-worker/cloudbuild.yaml

# View worker logs
gcloud run services logs read ai-worker --region us-central1 --limit 100

# Scale worker
gcloud run services update ai-worker --region us-central1 --max-instances 20

# Update secrets
echo -n "new-value" | gcloud secrets versions add redis-url --data-file=-

# Redeploy with new secrets
gcloud run services update ai-worker --region us-central1 --update-secrets REDIS_URL=redis-url:latest
```
