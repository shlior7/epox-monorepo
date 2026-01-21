---
name: Queue & Monitoring Packages
overview: AI job processing with BullMQ for heavy operations, Redis-based job status for polling, and full persistence (R2 + PostgreSQL).
todos: []
---

# Scenergy Queue Architecture

## Overview

Two-lane architecture for AI operations:

- **Lane A (Fast)**: Direct API calls with rate limiting (product analysis, prompts)
- **Lane B (Heavy)**: Queue-based processing with persistence (image/video generation)

```mermaid
flowchart TB
    subgraph vercel [Vercel API Routes]
        Request[Incoming Request]
        Router{Heavy Job?}
        RateCheck{Rate Limit OK?}
        Direct[visualizer-services]
        Enqueue[scenergy-queue Client]
        Poll[GET /api/jobs/:id]
    end

    subgraph redis [Redis/Upstash]
        RateLimiter[Rate Limit State]
        BullQueues[BullMQ Queues]
        JobStatus[Job Status Cache]
    end

    subgraph workers [Cloud Run]
        Worker[AI Worker]
    end

    subgraph storage [Persistence]
        R2[R2 Storage]
        DB[(PostgreSQL)]
    end

    Request --> Router
    Router -->|No: analysis| RateCheck
    Router -->|Yes: images| Enqueue
    RateCheck -->|Yes| Direct --> Response1[Return Result]
    RateCheck -->|No| BusyResponse[503 Busy]

    Enqueue --> BullQueues
    BullQueues --> Worker
    Worker --> R2
    Worker --> DB
    Worker --> JobStatus

    Poll --> JobStatus
    JobStatus --> Frontend[Frontend Updates]
```

---

## Design Decisions

### 1. Polling over Pusher/WebSockets

**Decision**: Use Redis-based job status cache with frontend polling instead of Pusher.**Rationale**:

- Image generation takes 30-100+ seconds; 1-5s polling latency is negligible
- Zero additional cost ($0 vs $49-99/mo for Pusher)
- No external dependency to manage
- Simpler architecture - uses existing Redis

**Implementation**:

- Worker saves status to Redis with 1-hour TTL
- Frontend polls `/api/jobs/:id` with exponential backoff (1s → 5s)
- Auto-stops on completion/failure

### 2. Worker Persists to R2 + Database

**Decision**: Worker saves images directly to R2 and creates DB records.**Rationale**:

- Jobs take 30-100s; high chance of frontend disconnect
- Atomic operation - either fully succeeds or fails
- Works for batch jobs with no active frontend
- No large base64 payloads bouncing between services

**Trade-off**: Worker needs DB credentials (mitigated by internal-only Cloud Run access)

### 3. Multi-API Key Rotation

**Decision**: API key pool with round-robin rotation and auto-disable on rate limit errors.**Rationale**:

- Single key limited to 60 RPM for image generation
- 3 keys = 180 RPM effective capacity
- Auto-cooldown prevents cascading failures

---

## Package Structure

### scenergy-queue

```javascript
packages/scenergy-queue/
├── src/
│   ├── index.ts              # Public exports
│   ├── types.ts              # Job types, payloads, results
│   ├── queue/
│   │   ├── client.ts         # QueueClient (Vercel)
│   │   └── worker.ts         # QueueWorker (Cloud Run)
│   ├── persistence/
│   │   └── index.ts          # R2 + DB operations
│   └── job-status/
│       └── index.ts          # Redis status cache
```

**Dependencies**:

- `bullmq` - Job queue
- `ioredis` - Redis client
- `visualizer-db` - Database access
- `visualizer-storage` - R2 storage
- `visualizer-services` - Gemini API

### scenergy-monitoring

```javascript
packages/scenergy-monitoring/
├── src/
│   ├── index.ts
│   ├── dashboard/            # Bull Board
│   ├── alerts/               # Webhook alerts
│   └── logging/              # Structured JSON logs
```

### services/ai-worker

```javascript
services/ai-worker/
├── src/index.ts              # Express + Worker
├── Dockerfile                # Multi-stage build
└── cloudbuild.yaml           # Cloud Run deployment
```

---

## Job Flow (Image Generation)

```javascript
1. API Route receives request
   └── Validates input, builds prompt

2. QueueClient.enqueue()
   └── Adds job to BullMQ with priority
   └── Returns jobId immediately

3. Worker picks up job
   └── setJobStatus({ status: 'active', progress: 0 })

4. For each product × variant:
   └── Call Gemini API
   └── Save image to R2
   └── Create DB record (generated_asset)
   └── Update progress in Redis

5. Job completes
   └── setJobStatus({ status: 'completed', result: {...} })

6. Frontend polls /api/jobs/:id
   └── Receives status, progress, result
   └── Updates UI accordingly
```

---

## Configuration

### Environment Variables

```bash
# Required
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@host:5432/db
GOOGLE_AI_STUDIO_API_KEY=xxx

# Storage (R2)
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=epox-assets
R2_PUBLIC_URL=https://assets.yourdomain.com

# Optional: Additional API keys for higher throughput
GOOGLE_AI_STUDIO_API_KEY_2=xxx
GOOGLE_AI_STUDIO_API_KEY_3=xxx

# Worker settings
WORKER_CONCURRENCY=5          # Jobs per worker instance
MAX_JOBS_PER_SECOND=10        # Rate limit safety net

# Rate limiting (Lane A)
AI_RATE_LIMIT_TEXT=50         # Requests per minute
AI_RATE_LIMIT_VISION=30
AI_RATE_LIMIT_IMAGE=20
```

### Cloud Run Settings

```yaml
min-instances: 0 # Scale to zero when idle
max-instances: 10 # Max 50 concurrent jobs (10 × 5)
cpu: 2
memory: 2Gi
cpu-throttling: true
ingress: internal # No public access
```

---

## API Reference

### Enqueue Job (Vercel)

```typescript
import { getQueueClient } from 'scenergy-queue';

const queue = getQueueClient();
const { jobId } = await queue.enqueue(
  'image_generation',
  {
    clientId: 'client-123',
    sessionId: 'session-456',
    productIds: ['prod-1', 'prod-2'],
    prompt: 'Modern living room...',
    settings: { aspectRatio: '16:9', imageQuality: '2k' },
  },
  {
    priority: 'normal', // urgent | normal | batch
  }
);
```

### Poll Job Status (Frontend)

```typescript
import { useJobStatus } from '@/lib/hooks/use-job-status';

function GenerationProgress({ jobId }) {
  const { status, isPolling } = useJobStatus(jobId, {
    onComplete: (result) => router.push(`/images/${result.imageIds[0]}`),
    onError: (error) => toast.error(error),
  });

  return <Progress value={status?.progress ?? 0} />;
}
```

### Direct API Call with Rate Limiting (Lane A)

```typescript
import { withRateLimit, getProductAnalysisService } from 'visualizer-services';

const result = await withRateLimit('gemini-text', () => getProductAnalysisService().analyzeProductsBatchWithAI(products));

if (!result.success) {
  return NextResponse.json({ retryAfter: result.retryAfter }, { status: 503 });
}
```

---

## Capacity Planning

| Metric | Value |

|--------|-------|

| Jobs per worker | 5 concurrent |

| Max workers | 10 instances |

| Max concurrent jobs | 50 |

| Gemini RPM (1 key) | 60 |

| Gemini RPM (3 keys) | 180 |

| Job duration | 30-100s |

| 100 images (50 concurrent) | ~3-4 minutes |---

## Monitoring

### Bull Board Dashboard

Enable with `ENABLE_BULL_BOARD=true`, access at `/admin/queues`.

### Job Status in Redis

```bash
# Check job status
redis-cli GET "job-status:abc123"

# List all active jobs
redis-cli KEYS "job-status:*"
```

### Structured Logs

```json
{
  "timestamp": "2026-01-15T10:30:00Z",
  "level": "info",
  "service": "ai-worker",
  "message": "Job completed",
  "jobId": "abc123",
  "duration": 45000
}
```

---

## Running the Worker

### Local Development

```bash
# Start Redis (if not using Upstash)
docker run -p 6379:6379 redis

# Run worker with hot reload
cd services/ai-worker
yarn dev
```

### Production Deployment

```bash
# Deploy to Cloud Run
gcloud builds submit --config services/ai-worker/cloudbuild.yaml

```
