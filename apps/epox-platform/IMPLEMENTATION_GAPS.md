# Epox Platform Implementation Gaps Analysis

**Date:** 2026-01-14
**Status:** Mock data → Production integration needed

---

## Executive Summary

The **epox-platform** app is a beautifully designed Next.js application with **95% complete frontend** but runs entirely on **mock data**. This document analyzes gaps compared to **scenergy-visualizer** (the reference implementation) and provides a roadmap for connecting real services.

**Key Finding:** All UI/UX is production-ready. All API endpoints exist. Zero database/storage/auth integration.

---

## Critical Missing Integrations

### 1. Authentication & Authorization ❌

#### Current State (epox-platform)

```typescript
// apps/epox-platform/app/(auth)/login/page.tsx:21
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  await new Promise((resolve) => setTimeout(resolve, 1000)); // ❌ FAKE DELAY
  router.push('/dashboard'); // ❌ NO AUTH CHECK
};
```

#### Required Implementation (from scenergy-visualizer)

```typescript
// Pattern 1: Admin Routes
import { requireAdmin } from '@/lib/auth/admin-route';

export const GET = requireAdmin(async (request: Request, { params }) => {
  const { clientId } = await params;
  const data = await db.clients.getById(clientId);
  return NextResponse.json({ data });
});

// Pattern 2: User Routes
import { withAuth } from 'visualizer-auth';

export const GET = withAuth(async (_request, { session }) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = await getUserRole(session);
  return NextResponse.json({ session, role });
});
```

#### Files to Create

1. **`apps/epox-platform/lib/auth/admin-route.ts`** - Admin HOF wrapper
2. **`apps/epox-platform/lib/auth/access.ts`** - getUserRole, ensureAdmin, ensureClientAccess
3. **`apps/epox-platform/middleware.ts`** - Route protection

#### API Routes to Update

- ✅ `/api/auth/[...nextauth]/route.ts` - Exists but not integrated
- ❌ `/api/auth/me/route.ts` - CREATE: Get current user
- ❌ `/api/auth/signup/route.ts` - CREATE: User registration
- ❌ `/api/auth/login/route.ts` - CREATE: User login

#### Pages to Update

- `app/(auth)/login/page.tsx` - Connect to `/api/auth/login`
- `app/(auth)/signup/page.tsx` - Connect to `/api/auth/signup`
- All dashboard pages - Add session checks

**Dependencies:**

- `visualizer-auth` package (already in package.json ✅)
- Cookie handling for sessions
- Password hashing (bcrypt/argon2)

---

### 2. Database Integration ❌

#### Current State

**All routes return hardcoded arrays:**

```typescript
// apps/epox-platform/app/api/products/route.ts:16-115
const MOCK_PRODUCTS = [
  { id: '1', name: 'Modern Sofa', ... }, // 8 hardcoded products
  { id: '2', name: 'Dining Table', ... },
  // ...
];

export async function GET(request: Request) {
  return NextResponse.json({
    products: MOCK_PRODUCTS,
    total: MOCK_PRODUCTS.length,
    page: 1,
  });
}
```

#### Required Implementation (from scenergy-visualizer)

```typescript
import { db } from 'visualizer-db';

export const GET = withAuth(async (request, { session }) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;

  const { products, total } = await db.products.list({
    userId: session.userId,
    page,
    limit,
    search,
    category,
  });

  return NextResponse.json({ products, total, page });
});

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();

  const product = await db.products.create({
    userId: session.userId,
    name: body.name,
    category: body.category,
    description: body.description,
    // ... all required fields
  });

  return NextResponse.json({ product }, { status: 201 });
});
```

#### Database Schema Needed

Based on epox-platform mock data structure:

**Tables to Create/Use:**

1. **users** - User accounts
2. **products** - Product catalog (name, category, sku, price, images)
3. **collections** - Product collections (name, description, productIds)
4. **generated_images** - AI-generated assets (productId, prompt, status, url)
5. **studio_sessions** - Generation sessions (userId, collectionId, settings)
6. **user_settings** - User preferences

**Repository Methods Needed:**

```typescript
db.products.list({ userId, page, limit, search, category });
db.products.getById(id, userId);
db.products.create({ userId, ...data });
db.products.update(id, userId, data);
db.products.delete(id, userId);

db.collections.list({ userId, page, limit, search });
db.collections.getById(id, userId);
db.collections.create({ userId, ...data });
db.collections.update(id, userId, data);
db.collections.delete(id, userId);

db.generatedImages.list({ userId, productId, status, page, limit });
db.generatedImages.create({ userId, productId, ...data });
db.generatedImages.updateStatus(id, status);

db.studioSessions.create({ userId, collectionId, settings });
db.studioSessions.getById(id, userId);
```

#### Files to Update

**API Routes (11 files):**

1. `app/api/dashboard/route.ts` - Replace hardcoded stats with DB queries
2. `app/api/products/route.ts` - GET/POST with db.products
3. `app/api/products/[id]/route.ts` - GET/PUT/DELETE with db.products
4. `app/api/collections/route.ts` - GET/POST with db.collections
5. `app/api/collections/[id]/route.ts` - GET/PUT/DELETE with db.collections
6. `app/api/generated-images/route.ts` - GET with db.generatedImages
7. `app/api/studio/route.ts` - GET/POST with db.studioSessions
8. `app/api/generate-images/route.ts` - Create job in db.generationJobs
9. `app/api/analyze-products/route.ts` - Store analysis in db
10. `app/api/analyze-image/route.ts` - Store analysis in db
11. `app/api/upload/route.ts` - Store file metadata in db

**Dependencies:**

- `visualizer-db` package (already in package.json ✅)
- Database migration scripts
- Seed data for development

---

### 3. File Storage (S3/R2) ❌

#### Current State

```typescript
// apps/epox-platform/app/api/upload/route.ts:29
const mockUrl = `https://images.unsplash.com/photo-${Date.now()}?w=800`;
return NextResponse.json({ url: mockUrl }); // ❌ FILE NOT STORED
```

#### Required Implementation (from scenergy-visualizer)

**Service Layer:**

```typescript
// apps/epox-platform/lib/services/storage/media-service.ts - CREATE THIS FILE
import {
  uploadFile,
  uploadProductImage,
  uploadProductImagePreview,
  deleteProductImage,
  getProductImageUrl,
  StoragePaths as MediaPaths,
} from 'visualizer-storage';

export {
  MediaPaths,
  uploadFile,
  uploadProductImage,
  uploadProductImagePreview,
  deleteProductImage,
  getProductImageUrl,
};
```

**API Route Update:**

```typescript
// apps/epox-platform/app/api/upload/route.ts
import { uploadFile, MediaPaths } from '@/lib/services/storage/media-service';
import { db } from 'visualizer-db';
import { withAuth } from 'visualizer-auth';

export const POST = withAuth(async (request, { session }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const type = formData.get('type') as string; // 'product' | 'collection' | 'generated'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Upload to R2/S3
  const fileKey = MediaPaths.getProductImagePath(session.userId, Date.now().toString());
  const url = await uploadFile(fileKey, file);

  // Store metadata in database
  const fileRecord = await db.files.create({
    userId: session.userId,
    key: fileKey,
    url,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
    type,
  });

  return NextResponse.json({
    url,
    fileId: fileRecord.id,
    key: fileKey,
  });
});
```

**Storage Paths Pattern:**

```typescript
MediaPaths.getProductImagePath(userId, productId);
// → users/{userId}/products/{productId}/image.jpg

MediaPaths.getGeneratedImagePath(userId, sessionId, imageId);
// → users/{userId}/sessions/{sessionId}/generated/{imageId}.png

MediaPaths.getCollectionImagePath(userId, collectionId);
// → users/{userId}/collections/{collectionId}/cover.jpg
```

#### Files to Create/Update

1. **CREATE:** `apps/epox-platform/lib/services/storage/media-service.ts`
2. **UPDATE:** `app/api/upload/route.ts` - Real R2 uploads
3. **UPDATE:** `app/api/products/route.ts` - Handle image URLs from storage
4. **UPDATE:** `app/api/generate-images/route.ts` - Store generated images to R2

**Environment Variables Needed:**

```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=epox-platform-storage
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**Dependencies:**

- `visualizer-storage` package (already in package.json ✅)
- Cloudflare R2 or AWS S3 bucket setup

---

### 4. Image Generation Queue ❌

#### Current State

```typescript
// apps/epox-platform/app/api/generate-images/route.ts:56-61
// In production, this would:
// 1. Create a job record in visualizer-db
// 2. Enqueue to Redis for async processing
// 3. Worker would call visualizer-services GeminiService
// 4. Results stored via visualizer-storage
// For now, return the job ID immediately

const jobId = `job_${Date.now()}`; // ❌ FAKE JOB ID
return NextResponse.json({ jobId, status: 'queued' });
```

#### Required Implementation (from scenergy-visualizer)

**Queue Service:**

```typescript
// apps/epox-platform/lib/services/image-generation/queue.ts - CREATE THIS FILE
import { db } from 'visualizer-db';
import { getGeminiService } from 'visualizer-services';
import { uploadGeneratedImage } from '@/lib/services/storage/media-service';

interface GenerationJob {
  userId: string;
  productId?: string;
  collectionId?: string;
  prompt: string;
  settings: {
    model?: string;
    size?: string;
    quality?: string;
    numImages?: number;
  };
  inspirationImageUrl?: string;
}

export async function enqueueGeneration(job: GenerationJob) {
  // 1. Create job record
  const jobRecord = await db.generationJobs.create({
    userId: job.userId,
    productId: job.productId,
    collectionId: job.collectionId,
    prompt: job.prompt,
    settings: job.settings,
    status: 'queued',
  });

  // 2. Enqueue to Redis/BullMQ (or process immediately for MVP)
  // For MVP, process synchronously:
  await processGeneration(jobRecord.id, job);

  return {
    jobId: jobRecord.id,
    expectedImageIds: [], // Will be populated as images generate
  };
}

async function processGeneration(jobId: string, job: GenerationJob) {
  try {
    // Update status
    await db.generationJobs.updateStatus(jobId, 'processing');

    // Call Gemini service
    const gemini = getGeminiService();
    const result = await gemini.generateImage({
      prompt: job.prompt,
      numImages: job.settings.numImages || 1,
      model: job.settings.model,
      inspirationImageUrl: job.inspirationImageUrl,
    });

    // Upload results to storage
    for (const imageData of result.images) {
      const imageId = `img_${Date.now()}_${Math.random()}`;
      const url = await uploadGeneratedImage(job.userId, jobId, imageId, imageData);

      // Store in database
      await db.generatedImages.create({
        userId: job.userId,
        jobId,
        productId: job.productId,
        url,
        prompt: job.prompt,
        status: 'completed',
      });
    }

    // Mark job complete
    await db.generationJobs.updateStatus(jobId, 'completed');
  } catch (error) {
    console.error('❌ Generation failed:', error);
    await db.generationJobs.updateStatus(jobId, 'failed', error.message);
  }
}

export async function getJobStatus(jobId: string, userId: string) {
  const job = await db.generationJobs.getById(jobId, userId);
  if (!job) {
    throw new Error('Job not found');
  }

  const images = await db.generatedImages.listByJob(jobId);

  return {
    jobId,
    status: job.status,
    prompt: job.prompt,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    images,
  };
}
```

**API Route Update:**

```typescript
// apps/epox-platform/app/api/generate-images/route.ts
import { enqueueGeneration } from '@/lib/services/image-generation/queue';
import { withAuth } from 'visualizer-auth';

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();

  const { jobId, expectedImageIds } = await enqueueGeneration({
    userId: session.userId,
    productId: body.productId,
    collectionId: body.collectionId,
    prompt: body.prompt,
    settings: body.settings || {},
    inspirationImageUrl: body.inspirationImageUrl,
  });

  return NextResponse.json({ jobId, expectedImageIds });
});

// New endpoint: GET /api/generate-images/[jobId]
export const GET = withAuth(async (request, { session, params }) => {
  const { jobId } = await params;
  const status = await getJobStatus(jobId, session.userId);
  return NextResponse.json(status);
});
```

#### Files to Create/Update

1. **CREATE:** `apps/epox-platform/lib/services/image-generation/queue.ts`
2. **UPDATE:** `app/api/generate-images/route.ts` - Use queue service
3. **CREATE:** `app/api/generate-images/[jobId]/route.ts` - Job status endpoint

**Database Tables Needed:**

```typescript
// generation_jobs table
{
  id: string;
  userId: string;
  productId?: string;
  collectionId?: string;
  prompt: string;
  settings: json;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: timestamp;
  completedAt?: timestamp;
}

// generated_images table (already planned above)
```

**Dependencies:**

- `visualizer-services` package (Gemini integration)
- Optional: Redis + BullMQ for production queue

---

### 5. AI Services Integration ❌

#### Current State

**Multiple AI endpoints are stubs:**

- `app/api/analyze-products/route.ts` - Incomplete
- `app/api/analyze-image/route.ts` - Stub
- `app/api/edit-image/route.ts` - Placeholder
- `app/api/remove-background/route.ts` - Placeholder
- `app/api/upscale-image/route.ts` - Placeholder

#### Required Implementation (from scenergy-visualizer)

**Gemini Service Layer:**

```typescript
// apps/epox-platform/lib/services/gemini/index.ts - CREATE THIS FILE
import { getGeminiService as getVisualizerGemini } from 'visualizer-services';

export function getGeminiService() {
  return getVisualizerGemini();
}

// Re-export types
export type {
  GeminiService,
  ImageGenerationRequest,
  ImageAnalysisRequest,
} from 'visualizer-services';
```

**Implementation Example:**

```typescript
// apps/epox-platform/app/api/analyze-products/route.ts
import { getGeminiService } from '@/lib/services/gemini';
import { withAuth } from 'visualizer-auth';
import { db } from 'visualizer-db';

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();
  const { productIds } = body;

  if (!productIds?.length) {
    return NextResponse.json({ error: 'No products provided' }, { status: 400 });
  }

  const gemini = getGeminiService();
  const results = [];

  for (const productId of productIds) {
    const product = await db.products.getById(productId, session.userId);
    if (!product) continue;

    // Analyze product images
    const analysis = await gemini.analyzeProduct({
      productName: product.name,
      category: product.category,
      imageUrls: product.images,
    });

    // Store analysis
    await db.productAnalyses.create({
      userId: session.userId,
      productId,
      tags: analysis.tags,
      description: analysis.description,
      styleKeywords: analysis.styleKeywords,
    });

    results.push({
      productId,
      analysis,
    });
  }

  return NextResponse.json({ results });
});
```

**Image Editing:**

```typescript
// apps/epox-platform/app/api/edit-image/route.ts
import { getGeminiService } from '@/lib/services/gemini';
import { uploadEditedImage } from '@/lib/services/storage/media-service';
import { withAuth } from 'visualizer-auth';

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();
  const { imageUrl, editPrompt, maskUrl } = body;

  const gemini = getGeminiService();
  const result = await gemini.editImage({
    imageUrl,
    prompt: editPrompt,
    maskUrl,
  });

  // Upload edited image
  const editedUrl = await uploadEditedImage(
    session.userId,
    `edited_${Date.now()}`,
    result.imageData
  );

  return NextResponse.json({ editedUrl });
});
```

#### Files to Create/Update

1. **CREATE:** `apps/epox-platform/lib/services/gemini/index.ts`
2. **UPDATE:** `app/api/analyze-products/route.ts` - Full implementation
3. **UPDATE:** `app/api/analyze-image/route.ts` - Full implementation
4. **UPDATE:** `app/api/edit-image/route.ts` - Full implementation
5. **UPDATE:** `app/api/remove-background/route.ts` - Full implementation
6. **UPDATE:** `app/api/upscale-image/route.ts` - Full implementation

**Environment Variables Needed:**

```env
GEMINI_API_KEY=your_google_ai_api_key
```

**Dependencies:**

- `visualizer-services` package (already in package.json ✅)
- Google AI Studio API key

---

### 6. Unsplash Integration ❌

#### Current State

```typescript
// apps/epox-platform/app/api/unsplash/search/route.ts:70-74
// In production, you would call the Unsplash API:
// const response = await fetch(
//   `https://api.unsplash.com/search/photos?query=${query}...`,
//   { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
// );
// For now, return mock data with some filtering

const MOCK_IMAGES = [
  /* 8 hardcoded images */
];
```

#### Required Implementation

```typescript
// apps/epox-platform/app/api/unsplash/search/route.ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || 'furniture';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      results: data.results.map((photo: any) => ({
        id: photo.id,
        url: photo.urls.regular,
        thumbnail: photo.urls.thumb,
        width: photo.width,
        height: photo.height,
        description: photo.description || photo.alt_description,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
      })),
      total: data.total,
      totalPages: data.total_pages,
    });
  } catch (error) {
    console.error('❌ Unsplash search failed:', error);
    return NextResponse.json({ error: 'Failed to search images' }, { status: 500 });
  }
}
```

#### Files to Update

1. `app/api/unsplash/search/route.ts` - Replace mock with real API

**Environment Variables Needed:**

```env
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

**Dependencies:**

- Unsplash Developer account
- Rate limits: 50 requests/hour (demo), 5000 requests/hour (production)

---

## Summary: Files to Create/Update

### Files to CREATE (7 new files)

| File Path                                  | Purpose                                      |
| ------------------------------------------ | -------------------------------------------- |
| `lib/auth/admin-route.ts`                  | Admin authentication HOF                     |
| `lib/auth/access.ts`                       | getUserRole, ensureAdmin, ensureClientAccess |
| `lib/services/storage/media-service.ts`    | Storage service wrapper                      |
| `lib/services/gemini/index.ts`             | Gemini AI service wrapper                    |
| `lib/services/image-generation/queue.ts`   | Image generation queue                       |
| `app/api/auth/me/route.ts`                 | Current user endpoint                        |
| `app/api/generate-images/[jobId]/route.ts` | Job status endpoint                          |

### Files to UPDATE (18 existing files)

**Auth (3 files):**

1. `app/(auth)/login/page.tsx` - Real login API call
2. `app/(auth)/signup/page.tsx` - Real signup API call
3. `middleware.ts` - Route protection (if exists, else create)

**API Routes (15 files):** 4. `app/api/dashboard/route.ts` - DB queries for stats 5. `app/api/products/route.ts` - db.products CRUD 6. `app/api/products/[id]/route.ts` - db.products CRUD 7. `app/api/collections/route.ts` - db.collections CRUD 8. `app/api/collections/[id]/route.ts` - db.collections CRUD 9. `app/api/generated-images/route.ts` - db.generatedImages queries 10. `app/api/studio/route.ts` - db.studioSessions CRUD 11. `app/api/generate-images/route.ts` - Queue integration 12. `app/api/analyze-products/route.ts` - Gemini integration 13. `app/api/analyze-image/route.ts` - Gemini integration 14. `app/api/edit-image/route.ts` - Gemini integration 15. `app/api/remove-background/route.ts` - AI integration 16. `app/api/upscale-image/route.ts` - AI integration 17. `app/api/upload/route.ts` - Real storage 18. `app/api/unsplash/search/route.ts` - Real API

---

## Database Schema Additions Needed

**New tables to create in `visualizer-db`:**

1. **products** (if not exists)
   - id, userId, name, sku, category, description, price, images[], tags[], createdAt, updatedAt

2. **collections** (if not exists)
   - id, userId, name, description, productIds[], coverImage, createdAt, updatedAt

3. **generation_jobs**
   - id, userId, productId, collectionId, prompt, settings, status, errorMessage, createdAt, completedAt

4. **product_analyses**
   - id, userId, productId, tags[], description, styleKeywords[], createdAt

5. **files** (file metadata)
   - id, userId, key, url, filename, size, mimeType, type, createdAt

**New repository methods:**

```typescript
// visualizer-db package needs:
db.products.*
db.collections.*
db.generationJobs.*
db.productAnalyses.*
db.files.*
```

---

## Environment Variables Required

**Create `.env.local` in `apps/epox-platform/`:**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/epox_platform

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=epox-platform-storage
R2_PUBLIC_URL=https://your-bucket.r2.dev

# AI Services
GEMINI_API_KEY=your_google_ai_api_key

# Third-party APIs
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Optional: Queue (for production)
REDIS_URL=redis://localhost:6379
```

---

## Implementation Phases

### Phase 1: Foundation (Critical) - Week 1

1. ✅ Setup environment variables
2. ✅ Create database tables/migrations
3. ✅ Implement auth system (login/signup)
4. ✅ Add route protection middleware
5. ✅ Connect db.products CRUD
6. ✅ Connect db.collections CRUD

**Deliverable:** Users can sign up, log in, create/view products and collections

### Phase 2: Storage & Generation - Week 2

1. ✅ Integrate R2/S3 storage
2. ✅ Implement file upload endpoint
3. ✅ Create image generation queue
4. ✅ Connect Gemini service
5. ✅ Implement generation job tracking

**Deliverable:** Users can upload files and generate images (async)

### Phase 3: AI Features - Week 3

1. ✅ Product analysis endpoint
2. ✅ Image analysis endpoint
3. ✅ Image editing features
4. ✅ Unsplash integration
5. ✅ Background removal/upscaling

**Deliverable:** All AI features functional

### Phase 4: Polish & Optimization - Week 4

1. ✅ Error handling improvements
2. ✅ Loading states for async operations
3. ✅ WebSocket for real-time updates (optional)
4. ✅ Caching strategy
5. ✅ Performance optimization
6. ✅ Testing

**Deliverable:** Production-ready application

---

## Quick Start Checklist

- [ ] Copy environment variables template above to `.env.local`
- [ ] Run database migrations in `visualizer-db` package
- [ ] Create auth HOF files (`lib/auth/admin-route.ts`, `lib/auth/access.ts`)
- [ ] Update login/signup pages to call real APIs
- [ ] Replace `MOCK_PRODUCTS` in `app/api/products/route.ts` with `db.products.list()`
- [ ] Replace `MOCK_COLLECTIONS` in `app/api/collections/route.ts` with `db.collections.list()`
- [ ] Create storage service wrapper (`lib/services/storage/media-service.ts`)
- [ ] Update `/api/upload` to use real storage
- [ ] Create Gemini service wrapper (`lib/services/gemini/index.ts`)
- [ ] Implement generation queue (`lib/services/image-generation/queue.ts`)
- [ ] Update `/api/generate-images` to use queue
- [ ] Test end-to-end flow: signup → create product → generate image

---

## Reference Files (from scenergy-visualizer)

**Auth patterns:**

- `/Users/liorsht/MyThings/MyProjects/epox-monorepo/apps/scenergy-visualizer/lib/auth/admin-route.ts`
- `/Users/liorsht/MyThings/MyProjects/epox-monorepo/apps/scenergy-visualizer/lib/auth/access.ts`

**Storage patterns:**

- `/Users/liorsht/MyThings/MyProjects/epox-monorepo/apps/scenergy-visualizer/lib/services/r2/media-service.ts`
- `/Users/liorsht/MyThings/MyProjects/epox-monorepo/apps/scenergy-visualizer/lib/services/s3/storage-service.ts`

**API route examples:**

- `/Users/liorsht/MyThings/MyProjects/epox-monorepo/apps/scenergy-visualizer/app/api/clients/route.ts` (CRUD)
- `/Users/liorsht/MyThings/MyProjects/epox-monorepo/apps/scenergy-visualizer/app/api/generate-images/route.ts` (Queue)
- `/Users/liorsht/MyThings/MyProjects/epox-monorepo/apps/scenergy-visualizer/app/api/analyze-scene/route.ts` (AI)

---

## Notes

- Frontend is **production-ready** - no UI changes needed
- All React Query hooks are correctly set up - just need real endpoints
- Form validations already work client-side
- Error handling structure is in place, just needs real error cases
- TypeScript types are already defined in `lib/types.ts`

**Total estimated effort:** 2-4 weeks for full implementation (1 developer)

---

**Last Updated:** 2026-01-14
