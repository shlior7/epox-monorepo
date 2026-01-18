# scenergy-queue

AI job queue for heavy operations that would timeout on Vercel (image generation, video, edits).

## Architecture

```
Vercel API ──▶ Redis Queue ──▶ Cloud Run Worker ──▶ R2 + DB
                                      │
                                      ▼
                              Redis Job Status ◀── Frontend Polling
```

## Features

- **BullMQ-based queue** with priorities and retries
- **Full persistence** - Images saved to R2, records created in PostgreSQL
- **Polling-based status** - No external WebSocket dependencies
- **Multi-API key support** - Rotate between keys for higher throughput

## Installation

```bash
yarn add scenergy-queue
```

## Usage

### Enqueue a Job (from Vercel API)

```typescript
import { getQueueClient } from 'scenergy-queue';

export async function POST(request: NextRequest) {
  const queue = getQueueClient();
  
  const { jobId } = await queue.enqueue('image_generation', {
    clientId: 'client-123',
    productIds: ['prod-1'],
    prompt: 'Modern living room with sofa',
    settings: { aspectRatio: '16:9' },
  }, {
    priority: 'normal', // urgent | normal | batch
  });

  return NextResponse.json({ jobId, status: 'queued' });
}
```

### Poll Job Status (from API route)

```typescript
import { getJobStatus } from 'scenergy-queue';

export async function GET(request, { params }) {
  const status = await getJobStatus(params.id);
  
  if (!status) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  return NextResponse.json(status);
}
```

### Run the Worker (Cloud Run)

```typescript
import { QueueWorker } from 'scenergy-queue';

const worker = new QueueWorker({
  redisUrl: process.env.REDIS_URL,
  concurrency: 5,
  maxJobsPerMinute: 60, // Matches Gemini's RPM limit
});

// Graceful shutdown
process.on('SIGTERM', () => worker.close());
```

## Job Types

| Type | Description | Payload |
|------|-------------|---------|
| `image_generation` | Generate images from prompt | `productIds`, `prompt`, `settings` |
| `image_edit` | Edit existing image | `sourceImageUrl`, `editPrompt` |

## Job Status

```typescript
interface JobStatus {
  id: string;
  type: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress: number;       // 0-100
  result?: {
    imageUrls: string[];
    imageIds: string[];
  };
  error?: string;
  updatedAt: number;
}
```

## Environment Variables

```bash
# Required
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://...
GOOGLE_AI_STUDIO_API_KEY=xxx

# Storage
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=assets
R2_PUBLIC_URL=https://cdn.example.com

# Optional
WORKER_CONCURRENCY=5
MAX_JOBS_PER_SECOND=10
```

## Exports

```typescript
// Queue operations
export { QueueClient, getQueueClient } from './queue/client';
export { QueueWorker } from './queue/worker';

// Job status (polling)
export { getJobStatus, getJobStatuses, setJobStatus } from './job-status';

// Persistence
export { saveGeneratedImage } from './persistence';

// Types
export type { JobStatus, ImageGenerationPayload, ImageGenerationResult } from './types';
```

