# 🧪 Local Testing Guide

Complete guide to test the AI image generation queue locally.

## Prerequisites

- ✅ Redis running (you already have this on port 6399)
- ✅ Gemini API key
- ✅ Database URL (PostgreSQL)
- ✅ Storage credentials (R2 or local filesystem)

## Quick Start (3 Steps)

### Step 1: Set Environment

```bash
# Required
export REDIS_URL="redis://localhost:6399"
export GEMINI_API_KEY="your-gemini-api-key-here"
export DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Optional (for R2 storage, or use local filesystem)
export R2_ACCOUNT_ID="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
export R2_BUCKET="..."

# Optional tuning
export GEMINI_RPM="60"        # Your Gemini tier limit
export WORKER_CONCURRENCY="3" # Parallel jobs
```

### Step 2: Run the Test Script

```bash
cd /Users/liorsht/MyThings/MyProjects/epox-monorepo

# This will:
# - Check Redis
# - Build worker if needed
# - Start worker in background
# - Show you how to test
./services/ai-worker/scripts/test-local.sh
```

### Step 3: Test with Real API Calls

**Terminal 1** (keep worker running from Step 2)

**Terminal 2** (start Next.js):
```bash
cd apps/epox-platform
yarn dev
```

**Terminal 3** (make API calls):
```bash
# Enqueue a job
curl -X POST http://localhost:3000/api/generate-images \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "productIds": ["prod-1", "prod-2"],
    "promptTags": {
      "style": "Modern minimalist",
      "mood": "Bright and airy",
      "setting": "Living room"
    }
  }'

# Response: {"jobId":"1","status":"queued","queueType":"redis"...}

# Poll for status (replace {jobId} with actual ID)
curl http://localhost:3000/api/jobs/1

# Watch it progress:
# {"status":"active","progress":25...}
# {"status":"active","progress":50...}
# {"status":"completed","progress":100,"result":{...}}
```

## Manual Method (More Control)

If you prefer to run things manually:

### 1. Start Worker

```bash
cd /Users/liorsht/MyThings/MyProjects/epox-monorepo

# Set environment
export REDIS_URL="redis://localhost:6399"
export GEMINI_API_KEY="your-key"
export DATABASE_URL="..."
export GEMINI_RPM="60"
export WORKER_CONCURRENCY="3"

# Run
cd services/ai-worker
node dist/index.js
```

You should see:
```
[ai-worker] Starting AI Worker {"concurrency":3,"maxJobsPerMinute":60}
[ai-worker] Listening on port 8080
```

### 2. Start Platform (separate terminal)

```bash
cd apps/epox-platform
yarn dev
```

### 3. Test Queue (separate terminal)

```bash
# Health check
curl http://localhost:8080/health
# {"status":"healthy"}

# Test with platform API
curl -X POST http://localhost:3000/api/generate-images \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","productIds":["prod-1"],"promptTags":{"style":"Modern"}}'
```

## What You'll See

### Worker Terminal
```
🚀 [1] image_generation
✅ [1] Done in 2847ms
```

### API Response
```json
{
  "jobId": "1",
  "status": "queued",
  "expectedImageCount": 4,
  "queueType": "redis",
  "message": "Generation queued for 2 products"
}
```

### Job Status Polling
```bash
# Pending
curl http://localhost:3000/api/jobs/1
{"id":"1","type":"image_generation","status":"pending","progress":0}

# Active
{"id":"1","type":"image_generation","status":"active","progress":50}

# Completed
{
  "id":"1",
  "type":"image_generation",
  "status":"completed",
  "progress":100,
  "result":{
    "success":true,
    "imageUrls":["https://..."],
    "imageIds":["asset-123"]
  }
}
```

## Troubleshooting

### "Connection refused" to Redis
```bash
# Check Redis is running
docker ps --filter "name=redis"

# Start if needed
docker start scenergy-queue-redis-test
# Or create new:
docker run -d --name redis -p 6399:6379 redis:7
```

### "GEMINI_API_KEY not set"
```bash
export GEMINI_API_KEY="your-actual-key"
# Or set in .env.local (platform will read it)
```

### Worker not processing jobs
```bash
# 1. Check worker is running
curl http://localhost:8080/health

# 2. Check Redis has the job
docker exec scenergy-queue-redis-test redis-cli KEYS "bull:ai-jobs:*"

# 3. Check worker logs for errors
```

### Jobs stuck in "waiting"
This is normal if you hit the RPM limit. The queue will automatically retry when the rate limit window resets.

Check your rate limit:
```bash
# Free tier
export GEMINI_RPM="10"

# Pay-as-you-go
export GEMINI_RPM="60"
```

## Testing Different Scenarios

### Test Priority Queue
```bash
# Normal priority
curl -X POST http://localhost:3000/api/generate-images \
  -d '{"sessionId":"test","productIds":["prod-1"],"promptTags":{}}'

# Urgent priority (processed first)
curl -X POST http://localhost:3000/api/generate-images \
  -d '{"sessionId":"test","productIds":["prod-2"],"promptTags":{},"urgent":true}'
```

### Test Multiple Products
```bash
# Generate image combining 3 products
curl -X POST http://localhost:3000/api/generate-images \
  -d '{
    "sessionId":"multi-test",
    "productIds":["mattress","bed-frame","pillow"],
    "promptTags":{"style":"Cozy bedroom"}
  }'
```

### Test Rate Limiting
```bash
# Set low limit
export GEMINI_RPM="10"

# Restart worker
# Then enqueue 15 jobs quickly - watch them queue and process slowly
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/generate-images \
    -d "{\"sessionId\":\"rate-test\",\"productIds\":[\"prod-$i\"],\"promptTags\":{}}" &
done
```

## Clean Up

```bash
# Stop worker: Ctrl+C in worker terminal

# Or if running in background:
pkill -f "node dist/index.js"

# Keep Redis running for next time
# Or stop it:
docker stop scenergy-queue-redis-test
```

## Next Steps

Once local testing works:
1. Deploy to Cloud Run (see `services/ai-worker/README.md`)
2. Add Upstash Redis for production
3. Monitor with Bull Board dashboard
4. Scale with multiple workers if needed

