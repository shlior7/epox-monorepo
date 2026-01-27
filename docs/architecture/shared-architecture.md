# Shared Architecture Guide

Guide for building new client apps using the visualizer platform's shared packages.

## Overview

The visualizer platform is built as a monorepo with shared packages that provide data access, business logic, authentication, and storage. New client apps can leverage these packages to quickly build feature-rich applications without reimplementing core functionality.

## Shared Packages

### visualizer-db (Data Access Layer)

Database access using Drizzle ORM with Neon PostgreSQL.

**Key Features:**

- Repository pattern for type-safe data access
- Transaction support
- Optimistic locking for concurrent updates
- Schema migrations

**Usage:**

```typescript
import { db } from 'visualizer-db';

// Access repositories via facade
const client = await db.clients.getById('client-123');
const products = await db.products.listByClient('client-123');
const flows = await db.generationFlows.listByClient('client-123');

// Use transactions
await db.transaction(async (tx) => {
  const flow = await tx.generationFlows.create('client-123', {...});
  const asset = await tx.generatedAssets.create({...});
});
```

**Available Repositories:**

- `clients` - Client management
- `products` - Product catalog
- `generationFlows` - Generation workflows
- `generatedAssets` - AI-generated images/assets
- `collectionSessions` - Multi-product collections
- `messages` - Chat/conversation history
- `users`, `members`, `accounts` - User management
- `favoriteImages` - User favorites

**Environment Required:**

```bash
DATABASE_URL=postgresql://user:pass@host/db
```

### visualizer-types (Domain Types)

Shared TypeScript types for domain entities and DTOs.

**Key Exports:**

```typescript
import type {
  Client,
  Product,
  GenerationFlow,
  GeneratedAsset,
  CollectionSession,
  Message,
  ClientCreate,
  ProductCreate,
  GenerationFlowCreate,
} from 'visualizer-types';
```

### visualizer-auth (Authentication)

Auth.js (NextAuth.js) integration with multi-tenancy support.

**Features:**

- Email/password authentication
- Multi-tenant client isolation
- Session management
- Protected API routes

**Usage:**

```typescript
import { auth, signIn, signOut } from 'visualizer-auth';

// In API routes
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ...
}

// Client-side
import { useAuthInfo } from 'visualizer-auth/client';

function MyComponent() {
  const { session, isLoading } = useAuthInfo();
  // ...
}
```

**Environment Required:**

```bash
AUTH_SECRET=your-secret-key
AUTH_URL=http://localhost:3000
```

**Note:** Currently uses "organization" terminology internally - this is a known naming mismatch with the "client" terminology in other packages.

### visualizer-storage (Storage Layer)

Cloudflare R2 (S3-compatible) storage with filesystem adapter for local development.

**Features:**

- R2/S3 upload and download
- Filesystem adapter for local dev
- Pre-signed URLs for secure access
- Path utilities for consistent key naming

**Usage:**

```typescript
import { uploadFile, downloadFile, getSignedUrl } from 'visualizer-storage';

// Upload
await uploadFile('clients/123/products/456/image.jpg', imageBlob);

// Download
const blob = await downloadFile('clients/123/products/456/image.jpg');

// Get signed URL (7 day expiry)
const url = await getSignedUrl('clients/123/products/456/image.jpg');
```

**Environment Required:**

```bash
# For R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=your-bucket

# For local filesystem (dev)
NEXT_PUBLIC_S3_DRIVER=fs
NEXT_PUBLIC_LOCAL_S3_DIR=./.local-s3
```

### visualizer-services (Business Logic)

AI-powered services for image generation, analysis, and visualization.

**Key Services:**

- **GeminiService**: Image generation and editing with Google Gemini
- **VisualizationService**: Product visualization orchestration
- **Smart Model Selection**: Auto-select best AI model for task

**Usage:**

```typescript
import { getGeminiService, selectBestModel } from 'visualizer-services';

const gemini = getGeminiService();

// Generate images
const response = await gemini.generateImages({
  prompt: 'Modern living room setup',
  productImages: [productImageFile],
  aspectRatio: '16:9',
  imageQuality: '2K',
});

// Edit images
const edited = await gemini.editImage({
  baseImageDataUrl: existingImage,
  prompt: 'Brighten the lighting',
});
```

**Environment Required:**

```bash
GOOGLE_AI_STUDIO_API_KEY=your-api-key
# Or for Vertex AI
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=your-project
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## Building a New Client App

### 1. App Structure

```
apps/your-app/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── [clientId]/        # Client-scoped pages
│   └── layout.tsx
├── lib/
│   ├── queue/             # App-specific job queue (if needed)
│   ├── prompts/           # App-specific prompt templates
│   └── utils/
└── package.json
```

### 2. Package Dependencies

```json
{
  "dependencies": {
    "visualizer-db": "1.0.0",
    "visualizer-types": "1.0.0",
    "visualizer-auth": "1.0.0",
    "visualizer-storage": "1.0.0",
    "visualizer-services": "1.0.0",
    "next": "^16.1.1",
    "react": "^19.1.0"
  }
}
```

### 3. Environment Setup

Create `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Auth
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_URL=http://localhost:3000

# Storage (local dev)
NEXT_PUBLIC_S3_DRIVER=fs
NEXT_PUBLIC_LOCAL_S3_DIR=./.local-s3

# Or for production (R2)
# R2_ACCOUNT_ID=...
# R2_ACCESS_KEY_ID=...
# R2_SECRET_ACCESS_KEY=...
# R2_BUCKET_NAME=...

# AI Services
GOOGLE_AI_STUDIO_API_KEY=your-key
```

### 4. Authentication Setup

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from 'visualizer-auth';

export const { GET, POST } = handlers;
```

```typescript
// lib/auth.ts
export { auth, signIn, signOut } from 'visualizer-auth';
```

### 5. Data Access Example

```typescript
// app/api/clients/[clientId]/products/route.ts
import { db } from 'visualizer-db';
import { auth } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { clientId: string } }) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const products = await db.products.listByClient(params.clientId);
  return Response.json({ products });
}
```

### 6. Image Generation Example

```typescript
// app/api/generate/route.ts
import { getGeminiService } from 'visualizer-services';
import { uploadFile } from 'visualizer-storage';
import { db } from 'visualizer-db';

export async function POST(request: Request) {
  const { clientId, prompt, productIds } = await request.json();

  const gemini = getGeminiService();
  const response = await gemini.generateImages({
    prompt,
    count: 1,
    aspectRatio: '16:9',
  });

  // Save to storage
  const blob = await fetch(response.images[0].url).then((r) => r.blob());
  const key = `clients/${clientId}/generated/${Date.now()}.jpg`;
  await uploadFile(key, blob);

  // Save to database
  const asset = await db.generatedAssets.create({
    clientId,
    assetUrl: key,
    prompt,
    status: 'completed',
  });

  return Response.json({ asset });
}
```

## App-Specific Implementation Needed

### Job Queue (Optional)

For async image generation, implement a Redis-based queue:

```typescript
// lib/queue/image-generation.ts
import { Redis } from '@upstash/redis';
import { getGeminiService } from 'visualizer-services';
import { uploadFile } from 'visualizer-storage';
import { db } from 'visualizer-db';

const redis = Redis.fromEnv();

export async function enqueueGeneration(request: {...}) {
  const jobId = `job_${Date.now()}`;
  await redis.set(`job:${jobId}`, JSON.stringify({
    status: 'pending',
    request,
  }));

  // Process in background
  processJob(jobId);
  return { jobId };
}

async function processJob(jobId: string) {
  // Update status
  await redis.set(`job:${jobId}`, JSON.stringify({
    status: 'generating',
  }));

  // Generate
  const gemini = getGeminiService();
  const response = await gemini.generateImages({...});

  // Upload and save
  // ...

  // Mark complete
  await redis.set(`job:${jobId}`, JSON.stringify({
    status: 'completed',
    imageIds: [...],
  }));
}
```

### Prompt Templates

Create app-specific prompt builders:

```typescript
// lib/prompts/product-visualization.ts
export function buildProductPrompt(product: Product, settings: Settings): string {
  return `Product: ${product.name}
Scene: ${settings.scene}
Style: ${settings.style}
Lighting: ${settings.lighting}
...`;
}
```

## Data Model Reference

### Key Entities

- **Client**: Tenant/organization
- **Product**: Product catalog item
- **GenerationFlow**: Workflow for generating product visualizations
- **GeneratedAsset**: AI-generated image/video/3D asset
- **CollectionSession**: Multi-product collection workspace
- **Message**: Chat/conversation message

### Relationships

```
Client
  ├── Products
  │     └── GenerationFlows
  │           └── GeneratedAssets
  ├── CollectionSessions
  │     ├── GenerationFlows
  │     │     └── GeneratedAssets
  │     └── Messages
  └── Users (Members)
```

## Best Practices

1. **Use Repository Pattern**: Always access data through `db.repositories` rather than raw queries
2. **Handle Transactions**: Use `db.transaction()` for multi-step operations
3. **Validate Auth**: Always check `await auth()` in API routes
4. **Type Safety**: Import types from `visualizer-types` for consistency
5. **Error Handling**: Repositories throw `NotFoundError`, `OptimisticLockError` - handle appropriately
6. **Storage Keys**: Use consistent path structure (`clients/{id}/products/{id}/...`)
7. **Cost Optimization**: Use smart model selection from visualizer-services

## Migration from Admin App

If migrating features from `apps/scenergy-visualizer`:

1. **Authentication**: Already using `visualizer-auth` - just import
2. **Data Access**: Replace app-local S3 logic with repository pattern
3. **Services**: Import from `visualizer-services` instead of local lib
4. **Queue**: Copy queue implementation from `lib/services/image-generation/queue.ts` and adapt
5. **UI Components**: Copy from `components/` but update to use shared packages for data

## Testing

```typescript
// Example test using shared packages
import { createDatabaseFacade } from 'visualizer-db';
import { getGeminiService } from 'visualizer-services';

describe('Product Visualization', () => {
  it('generates product image', async () => {
    const gemini = getGeminiService();
    const response = await gemini.generateImages({
      prompt: 'Test prompt',
      count: 1,
    });

    expect(response.images).toHaveLength(1);
  });
});
```

## Deployment

### Environment Variables Checklist

- [ ] `DATABASE_URL` - Neon PostgreSQL connection string
- [ ] `AUTH_SECRET` - Random secret for auth
- [ ] `AUTH_URL` - Public URL of your app
- [ ] `R2_*` variables - Cloudflare R2 credentials
- [ ] `GOOGLE_AI_STUDIO_API_KEY` - Google AI API key
- [ ] Optional: `GOOGLE_SERVICE_ACCOUNT_KEY` for Vertex AI

### Database Migrations

Run migrations before deployment:

```bash
yarn workspace visualizer-db db:push
```

## Support

- Design docs: `/apps/{app-name}/design-log/`
- API reference: TypeScript definitions in each package's `src/`
- Examples: `apps/scenergy-visualizer` (reference implementation)

## Roadmap

Future shared packages:

- `visualizer-ui` - Shared React components
- `visualizer-analytics` - Analytics and tracking
- `visualizer-queue` - Standardized job queue (currently app-specific)
- `visualizer-pricing` - Credits and billing (currently in planning)
