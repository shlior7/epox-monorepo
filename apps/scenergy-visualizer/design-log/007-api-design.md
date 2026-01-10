# Design Log #007: API Design & Specifications

**Status**: Draft
**Created**: 2026-01-10
**Author**: Claude
**Related**: Design Log #001 (Architecture), Design Log #002 (Authentication), Design Log #003 (Data Model), Design Log #004 (User Flows)

---

## Background

The `visualizer-client` platform needs a comprehensive REST API to support:
- Client user authentication and authorization
- Product browsing and filtering (1000+ products)
- Collection-based bulk generation workflow
- AI-powered product and scene analysis
- Image uploads and inspiration management
- Real-time generation progress tracking
- Asset management (download, pin, delete)

The API must be:
- **Secure** - All routes scoped to authenticated user's clientId
- **Fast** - Optimized queries, pagination, caching
- **Reliable** - Graceful error handling, retry logic
- **Scalable** - Handle 100+ concurrent generations per client
- **Well-documented** - OpenAPI/Swagger specs for all endpoints

## Problem

We need to design a complete REST API that:
1. **Follows consistent patterns** - Naming, responses, errors, versioning
2. **Enforces authorization** - All data scoped to user's clientId
3. **Handles errors gracefully** - RFC 7807 Problem Details format
4. **Supports pagination** - Cursor-based for large datasets
5. **Enables real-time updates** - Polling for generation progress
6. **Prevents abuse** - Rate limiting per endpoint
7. **Validates input** - Request validation with clear error messages
8. **Integrates with external services** - Unsplash, Gemini AI, S3

## Questions and Answers

### Q1: Should we use REST, GraphQL, or tRPC?
**A**: REST with OpenAPI specs:
- REST: Familiar, well-supported, easy to document
- OpenAPI: Auto-generate TypeScript types, API docs
- Future: Can add GraphQL layer for complex queries if needed

**Rationale**: REST is simpler for MVP, widely understood, excellent tooling.

### Q2: How do we handle API versioning?
**A**: URL versioning initially, header-based later:
- MVP: `/api/v1/collections` (explicit version in path)
- Future: Accept header versioning for backward compatibility
- Deprecation policy: 6-month notice before removing old versions

### Q3: What's our pagination strategy?
**A**: Hybrid approach:
- **Cursor-based**: For real-time data (generated assets, collections)
- **Offset-based**: For stable data (products, with limit of 10k results)
- Always include `total`, `hasMore`, `nextCursor` in responses

### Q4: How do we handle file uploads?
**A**: Multipart upload with streaming:
- Direct upload to API → stream to S3
- Max 10MB per image
- Support multiple file upload (up to 5 images)
- Return S3 URL immediately after upload

### Q5: Should we expose WebSockets or polling for progress?
**A**: Polling (MVP), WebSocket (future):
- Polling: Every 5 seconds while `status = 'generating'`
- Exponential backoff if no changes
- Future: Upgrade to WebSocket for real-time push

### Q6: How do we prevent SQL injection and XSS?
**A**: Multiple layers:
- Drizzle ORM: Parameterized queries (prevents SQL injection)
- Zod schemas: Input validation before processing
- DOMPurify: Sanitize any HTML content (minimal use case)
- CORS: Whitelist allowed origins

---

## Design

### API Design Principles

1. **RESTful Resource Naming**
   - Nouns, not verbs: `/products` not `/getProducts`
   - Plural for collections: `/collections`, `/products`
   - Nested resources: `/collections/{id}/generated-assets`

2. **HTTP Methods**
   - `GET`: Retrieve (idempotent, cacheable)
   - `POST`: Create new resource
   - `PATCH`: Partial update
   - `PUT`: Full replacement (rarely used)
   - `DELETE`: Remove resource

3. **Response Format**
   - Success (2xx): `{ data: T, meta?: {} }`
   - Error (4xx, 5xx): RFC 7807 Problem Details
   - Always JSON, UTF-8 encoding

4. **Status Codes**
   - `200 OK`: Successful GET, PATCH, DELETE
   - `201 Created`: Successful POST
   - `204 No Content`: Successful DELETE with no response
   - `400 Bad Request`: Invalid input
   - `401 Unauthorized`: Missing or invalid auth
   - `403 Forbidden`: Authenticated but not authorized
   - `404 Not Found`: Resource doesn't exist
   - `409 Conflict`: Resource state conflict
   - `422 Unprocessable Entity`: Validation failed
   - `429 Too Many Requests`: Rate limit exceeded
   - `500 Internal Server Error`: Unexpected server error
   - `503 Service Unavailable`: Temporary downtime

---

## API Endpoints

### 1. Authentication (`/api/auth/*`)

#### 1.1 Sign Up (Invitation-based)

```typescript
POST /api/auth/signup

Request:
{
  token: string;          // Invitation token (JWT)
  name: string;           // Full name
  password: string;       // Min 8 chars
  confirmPassword: string;
}

Response 201:
{
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    createdAt: string;
  };
  session: {
    token: string;
    expiresAt: string;
  };
  client: {
    id: string;
    name: string;
    slug: string;
  };
}

Errors:
- 400: Invalid token (expired, malformed)
- 409: Email already registered
- 422: Validation failed (weak password, etc.)
```

**Example Request:**
```bash
curl -X POST https://api.example.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "name": "John Doe",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }'
```

#### 1.2 Login

```typescript
POST /api/auth/login

Request:
{
  email: string;
  password: string;
  rememberMe?: boolean;   // Default: false (7-day session)
}

Response 200:
{
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
  session: {
    token: string;
    expiresAt: string;
  };
  client: {
    id: string;
    name: string;
  };
  member: {
    role: 'owner' | 'editor' | 'viewer';
  };
}

Errors:
- 401: Invalid credentials
- 403: User account suspended
- 422: Missing email or password
```

**Example Request:**
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePass123!',
    rememberMe: true
  })
});

const { user, session, client } = await response.json();
```

#### 1.3 Logout

```typescript
POST /api/auth/logout

Request: (no body)

Response 204: No Content

Errors:
- 401: Not authenticated
```

#### 1.4 Get Current User

```typescript
GET /api/auth/me

Response 200:
{
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string;
    createdAt: string;
  };
  client: {
    id: string;
    name: string;
    slug: string;
    settings: ClientSettings;
  };
  member: {
    role: 'owner' | 'editor' | 'viewer';
    status: 'active';
    joinedAt: string;
  };
}

Errors:
- 401: Not authenticated
```

#### 1.5 Password Reset Request

```typescript
POST /api/auth/password-reset/request

Request:
{
  email: string;
}

Response 200:
{
  success: true;
  message: "Password reset email sent";
}

Note: Always returns 200 (prevents email enumeration)
```

#### 1.6 Password Reset Confirm

```typescript
POST /api/auth/password-reset/confirm

Request:
{
  token: string;          // From reset email
  password: string;
  confirmPassword: string;
}

Response 200:
{
  success: true;
  message: "Password updated successfully";
}

Errors:
- 400: Invalid or expired token
- 422: Passwords don't match or too weak
```

---

### 2. Products (`/api/products/*`)

#### 2.1 List Products

```typescript
GET /api/products?page=1&limit=50&search=desk&category=furniture&roomType=office&sort=name&order=asc

Query Parameters:
- page: number (default: 1, min: 1)
- limit: number (default: 50, min: 1, max: 100)
- search: string (searches name, sku, description)
- category: string (exact match)
- roomType: string (array match, e.g., contains 'office')
- sort: 'name' | 'sku' | 'category' | 'createdAt' (default: 'createdAt')
- order: 'asc' | 'desc' (default: 'desc')

Response 200:
{
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

Product Type:
{
  id: string;
  clientId: string;
  name: string;
  sku: string;
  category: string;
  roomTypes: string[];
  primaryImage?: {
    id: string;
    url: string;
    width: number;
    height: number;
  };
  metadata: {
    dimensions?: { width: number; height: number; depth: number; unit: string };
    materials?: string[];
    colors?: string[];
    tags?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

Errors:
- 400: Invalid query parameters
- 401: Not authenticated
```

**Example Request:**
```javascript
const params = new URLSearchParams({
  page: '1',
  limit: '50',
  search: 'modern desk',
  category: 'furniture',
  roomType: 'office',
  sort: 'name',
  order: 'asc'
});

const response = await fetch(`/api/products?${params}`);
const { data: products, meta } = await response.json();

console.log(`Showing ${products.length} of ${meta.total} products`);
```

#### 2.2 Get Product by ID

```typescript
GET /api/products/{productId}

Response 200:
{
  data: Product;  // Full product object with all images
}

Errors:
- 401: Not authenticated
- 403: Product belongs to different client
- 404: Product not found
```

#### 2.3 Get Product Categories

```typescript
GET /api/products/categories

Response 200:
{
  data: Array<{
    category: string;
    count: number;
  }>;
}

Example Response:
{
  "data": [
    { "category": "Furniture", "count": 245 },
    { "category": "Lighting", "count": 89 },
    { "category": "Decor", "count": 156 }
  ]
}
```

#### 2.4 Get Room Types

```typescript
GET /api/products/room-types

Response 200:
{
  data: Array<{
    roomType: string;
    count: number;
  }>;
}

Example Response:
{
  "data": [
    { "roomType": "Living Room", "count": 312 },
    { "roomType": "Bedroom", "count": 189 },
    { "roomType": "Office", "count": 156 }
  ]
}
```

---

### 3. Collections (`/api/collections/*`)

#### 3.1 Create Collection

```typescript
POST /api/collections

Request:
{
  name: string;
  selectedProductIds: string[];  // Min: 1, Max: 500
}

Response 201:
{
  data: {
    id: string;
    clientId: string;
    name: string;
    status: 'draft';
    selectedProductIds: string[];
    createdAt: string;
    updatedAt: string;
  };
}

Errors:
- 400: Invalid product IDs
- 401: Not authenticated
- 422: Validation failed (empty name, no products, etc.)
```

**Example Request:**
```javascript
const response = await fetch('/api/collections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Modern Furniture Collection',
    selectedProductIds: [
      'prod_123',
      'prod_456',
      'prod_789'
    ]
  })
});

const { data: collection } = await response.json();
console.log(`Created collection: ${collection.id}`);
```

#### 3.2 List Collections

```typescript
GET /api/collections?page=1&limit=20&status=completed&sort=createdAt&order=desc

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- status: 'draft' | 'analyzing' | 'ready' | 'generating' | 'completed' | 'error'
- sort: 'name' | 'createdAt' | 'updatedAt' | 'completedAt'
- order: 'asc' | 'desc' (default: 'desc')

Response 200:
{
  data: Array<{
    id: string;
    name: string;
    status: CollectionStatus;
    selectedProductIds: string[];
    productCount: number;
    generatedAssetCount: number;
    completedAssetCount: number;
    failedAssetCount: number;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

Errors:
- 401: Not authenticated
```

#### 3.3 Get Collection by ID

```typescript
GET /api/collections/{collectionId}

Response 200:
{
  data: {
    id: string;
    clientId: string;
    name: string;
    status: CollectionStatus;
    selectedProductIds: string[];
    productAnalysis?: ProductAnalysisResult;
    baseSettings?: Partial<FlowGenerationSettings>;
    inspirationImages: Array<{
      id: string;
      imageId: string;
      url: string;
      source: 'upload' | 'unsplash' | 'library';
      analysis?: SceneAnalysis;
      displayOrder: number;
    }>;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
  };
}

Errors:
- 401: Not authenticated
- 403: Collection belongs to different client
- 404: Collection not found
```

#### 3.4 Update Collection

```typescript
PATCH /api/collections/{collectionId}

Request:
{
  name?: string;
  selectedProductIds?: string[];
  baseSettings?: Partial<FlowGenerationSettings>;
}

Response 200:
{
  data: Collection;  // Updated collection
}

Errors:
- 400: Invalid update (can't modify generating collection)
- 401: Not authenticated
- 403: Not authorized
- 404: Collection not found
- 422: Validation failed
```

#### 3.5 Delete Collection

```typescript
DELETE /api/collections/{collectionId}

Response 204: No Content

Note: Soft-deletes collection and all associated generated assets

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: Collection not found
```

#### 3.6 Analyze Collection Products

```typescript
POST /api/collections/{collectionId}/analyze

Request: (no body, uses selectedProductIds from collection)

Response 200:
{
  data: {
    roomTypeDistribution: Record<string, number>;
    productTypes: string[];
    dominantCategory: string;
    suggestedStyles: string[];
    recommendedInspirationKeywords: string[];
    productRoomAssignments: Record<string, string>;  // productId → roomType
    analyzedAt: string;
  };
}

Example Response:
{
  "data": {
    "roomTypeDistribution": {
      "Office": 1,
      "Living Room": 1,
      "Bedroom": 1
    },
    "productTypes": ["Desk", "Sofa", "Bed"],
    "dominantCategory": "Furniture",
    "suggestedStyles": ["Modern", "Contemporary", "Minimalist"],
    "recommendedInspirationKeywords": [
      "modern home office",
      "contemporary living room",
      "minimalist bedroom"
    ],
    "productRoomAssignments": {
      "prod_123": "Office",
      "prod_456": "Living Room",
      "prod_789": "Bedroom"
    },
    "analyzedAt": "2026-01-10T14:30:52Z"
  }
}

Errors:
- 401: Not authenticated
- 404: Collection not found
- 422: No products selected
- 503: AI service unavailable (fallback to metadata-only)
```

**Example Request:**
```bash
curl -X POST https://api.example.com/api/collections/coll_abc123/analyze \
  -H "Authorization: Bearer <session_token>"
```

#### 3.7 Add Inspiration Images

```typescript
POST /api/collections/{collectionId}/inspirations

Request:
{
  images: Array<{
    imageId: string;        // Reference to uploaded image
    source: 'upload' | 'unsplash' | 'library';
    displayOrder: number;
  }>;
}

Response 200:
{
  data: Array<{
    id: string;
    collectionId: string;
    imageId: string;
    url: string;
    source: string;
    analysis?: SceneAnalysis;
    displayOrder: number;
  }>;
}

Errors:
- 400: Too many images (max 5)
- 401: Not authenticated
- 404: Collection or image not found
```

#### 3.8 Analyze Inspiration Image

```typescript
POST /api/collections/{collectionId}/inspirations/{inspirationId}/analyze

Response 200:
{
  data: {
    environment: 'indoor' | 'outdoor' | 'mixed';
    suggestedRoomTypes: string[];
    style: string;
    lighting: string;
    colorPalette: string[];
    materials: {
      floor?: string;
      walls?: string;
      ceiling?: string;
    };
    props: string[];
    mood: string;
  };
}

Example Response:
{
  "data": {
    "environment": "indoor",
    "suggestedRoomTypes": ["Living Room", "Office"],
    "style": "Modern Minimalist",
    "lighting": "Natural Light",
    "colorPalette": ["#FFFFFF", "#F5F5F5", "#8B7355", "#2C3E50"],
    "materials": {
      "floor": "Light Oak Hardwood",
      "walls": "White Paint",
      "ceiling": "White"
    },
    "props": ["Indoor Plants", "Books", "Decorative Vase"],
    "mood": "Calm and Professional"
  }
}

Errors:
- 401: Not authenticated
- 404: Inspiration image not found
- 503: AI analysis unavailable
```

#### 3.9 Generate Collection

```typescript
POST /api/collections/{collectionId}/generate

Request:
{
  overrideSettings?: Partial<FlowGenerationSettings>;
}

Response 202:  // Accepted (async processing)
{
  data: {
    collectionId: string;
    status: 'generating';
    assets: Array<{
      id: string;
      productId: string;
      status: 'pending';
      jobId: string;
    }>;
  };
  meta: {
    totalAssets: number;
    estimatedCompletionTime: string;  // ISO 8601 duration (e.g., "PT5M")
  };
}

Example Response:
{
  "data": {
    "collectionId": "coll_abc123",
    "status": "generating",
    "assets": [
      {
        "id": "asset_001",
        "productId": "prod_123",
        "status": "pending",
        "jobId": "job_xyz789"
      },
      {
        "id": "asset_002",
        "productId": "prod_456",
        "status": "pending",
        "jobId": "job_xyz790"
      }
    ]
  },
  "meta": {
    "totalAssets": 3,
    "estimatedCompletionTime": "PT3M"  // 3 minutes
  }
}

Errors:
- 400: Collection not ready (missing analysis or inspirations)
- 401: Not authenticated
- 404: Collection not found
- 409: Collection already generating
- 429: Monthly quota exceeded
```

**Example Request:**
```javascript
const response = await fetch(`/api/collections/${collectionId}/generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  },
  body: JSON.stringify({
    overrideSettings: {
      aspectRatio: '16:9',
      varietyLevel: 7
    }
  })
});

const { data, meta } = await response.json();
console.log(`Generating ${meta.totalAssets} assets...`);
```

#### 3.10 Get Collection Generation Status

```typescript
GET /api/collections/{collectionId}/status

Response 200:
{
  data: {
    collectionId: string;
    status: 'generating' | 'completed' | 'error';
    progress: {
      total: number;
      pending: number;
      generating: number;
      completed: number;
      failed: number;
      percentage: number;  // 0-100
    };
    assets: Array<{
      id: string;
      productId: string;
      status: AssetStatus;
      progress: number;   // 0-100
      imageUrl?: string;
      errorMessage?: string;
    }>;
    startedAt: string;
    completedAt?: string;
  };
}

Example Response:
{
  "data": {
    "collectionId": "coll_abc123",
    "status": "generating",
    "progress": {
      "total": 3,
      "pending": 0,
      "generating": 1,
      "completed": 2,
      "failed": 0,
      "percentage": 66.7
    },
    "assets": [
      {
        "id": "asset_001",
        "productId": "prod_123",
        "status": "completed",
        "progress": 100,
        "imageUrl": "https://s3.../asset_001.jpg"
      },
      {
        "id": "asset_002",
        "productId": "prod_456",
        "status": "generating",
        "progress": 60
      },
      {
        "id": "asset_003",
        "productId": "prod_789",
        "status": "completed",
        "progress": 100,
        "imageUrl": "https://s3.../asset_003.jpg"
      }
    ],
    "startedAt": "2026-01-10T14:35:00Z"
  }
}

Errors:
- 401: Not authenticated
- 404: Collection not found
```

**Polling Example:**
```javascript
// Poll every 5 seconds while generating
async function pollCollectionStatus(collectionId) {
  const response = await fetch(`/api/collections/${collectionId}/status`);
  const { data } = await response.json();

  console.log(`Progress: ${data.progress.percentage}%`);

  if (data.status === 'generating') {
    setTimeout(() => pollCollectionStatus(collectionId), 5000);
  } else {
    console.log('Generation complete!');
  }
}

pollCollectionStatus('coll_abc123');
```

---

### 4. Generated Assets (`/api/generated-assets/*`)

#### 4.1 List Generated Assets

```typescript
GET /api/generated-assets?collectionId=coll_123&status=completed&roomType=office&pinned=true&page=1&limit=50

Query Parameters:
- collectionId: string (filter by collection)
- productId: string (filter by product)
- status: AssetStatus (filter by status)
- roomType: string (from settings.roomType)
- pinned: boolean (only pinned assets)
- page: number (default: 1)
- limit: number (default: 50, max: 100)
- sort: 'createdAt' | 'completedAt' | 'productName'
- order: 'asc' | 'desc' (default: 'desc')

Response 200:
{
  data: Array<{
    id: string;
    collectionId?: string;
    productId: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
    type: 'image';
    status: AssetStatus;
    settings: FlowGenerationSettings;
    image?: {
      id: string;
      url: string;
      width: number;
      height: number;
    };
    errorMessage?: string;
    progress: number;
    pinned: boolean;
    createdAt: string;
    completedAt?: string;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

Errors:
- 401: Not authenticated
```

#### 4.2 Get Generated Asset

```typescript
GET /api/generated-assets/{assetId}

Response 200:
{
  data: GeneratedAsset;  // Full asset with all details
}

Errors:
- 401: Not authenticated
- 403: Asset belongs to different client
- 404: Asset not found
```

#### 4.3 Update Generated Asset

```typescript
PATCH /api/generated-assets/{assetId}

Request:
{
  pinned?: boolean;
}

Response 200:
{
  data: GeneratedAsset;  // Updated asset
}

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: Asset not found
```

**Example - Pin Asset:**
```javascript
const response = await fetch(`/api/generated-assets/${assetId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pinned: true })
});

const { data: asset } = await response.json();
console.log(`Asset ${asset.id} pinned: ${asset.pinned}`);
```

#### 4.4 Delete Generated Asset

```typescript
DELETE /api/generated-assets/{assetId}

Response 204: No Content

Note: Soft-deletes asset (sets deletedAt)
S3 object marked for deletion after 30 days

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: Asset not found
```

#### 4.5 Restore Deleted Asset

```typescript
POST /api/generated-assets/{assetId}/restore

Response 200:
{
  data: GeneratedAsset;  // Restored asset
}

Errors:
- 400: Asset not deleted
- 401: Not authenticated
- 404: Asset not found
```

#### 4.6 Regenerate Asset

```typescript
POST /api/generated-assets/{assetId}/regenerate

Request:
{
  settings?: Partial<FlowGenerationSettings>;  // Override settings
}

Response 201:
{
  data: {
    id: string;           // New asset ID
    productId: string;
    status: 'pending';
    settings: FlowGenerationSettings;
    jobId: string;
    createdAt: string;
  };
  meta: {
    originalAssetId: string;
  };
}

Note: Creates new asset, original remains

Errors:
- 401: Not authenticated
- 404: Original asset not found
- 429: Rate limit exceeded
```

#### 4.7 Download Asset

```typescript
GET /api/generated-assets/{assetId}/download

Response 302: Redirect to S3 signed URL

Headers:
Content-Disposition: attachment; filename="modern_desk_office_20260110.jpg"

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: Asset not found or not completed
```

**Example:**
```javascript
// Trigger browser download
window.location.href = `/api/generated-assets/${assetId}/download`;
```

#### 4.8 Bulk Download (ZIP)

```typescript
POST /api/generated-assets/bulk-download

Request:
{
  assetIds: string[];    // Max 100 assets
}

Response 202:  // Accepted (async ZIP creation)
{
  data: {
    jobId: string;
    status: 'processing';
    totalAssets: number;
  };
}

Then poll:
GET /api/download-jobs/{jobId}

Response 200:
{
  data: {
    jobId: string;
    status: 'processing' | 'completed' | 'error';
    progress: number;   // 0-100
    downloadUrl?: string;  // Available when status = 'completed'
    expiresAt?: string;    // URL expires in 24 hours
  };
}

Errors:
- 400: Too many assets (max 100)
- 401: Not authenticated
```

**Full Example - Bulk Download:**
```javascript
// Step 1: Request ZIP creation
const createResponse = await fetch('/api/generated-assets/bulk-download', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assetIds: ['asset_001', 'asset_002', 'asset_003']
  })
});

const { data: { jobId } } = await createResponse.json();

// Step 2: Poll for completion
async function pollDownloadJob(jobId) {
  const response = await fetch(`/api/download-jobs/${jobId}`);
  const { data } = await response.json();

  if (data.status === 'processing') {
    console.log(`Progress: ${data.progress}%`);
    setTimeout(() => pollDownloadJob(jobId), 2000);
  } else if (data.status === 'completed') {
    console.log('ZIP ready!');
    window.location.href = data.downloadUrl;  // Trigger download
  } else {
    console.error('ZIP creation failed');
  }
}

pollDownloadJob(jobId);
```

---

### 5. Images/Upload (`/api/images/*`)

#### 5.1 Upload Image

```typescript
POST /api/images/upload

Request: multipart/form-data
{
  file: File;              // Max 10MB
  purpose: 'inspiration' | 'product';
}

Response 201:
{
  data: {
    id: string;
    clientId: string;
    url: string;
    s3Key: string;
    width: number;
    height: number;
    fileSize: number;
    mimeType: string;
    metadata: {
      source: 'upload';
      originalFilename: string;
    };
    createdAt: string;
  };
}

Errors:
- 400: Invalid file type (only JPG, PNG, WebP)
- 413: File too large (max 10MB)
- 415: Unsupported media type
- 422: Missing file or purpose
```

**Example - Upload with FormData:**
```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('purpose', 'inspiration');

const response = await fetch('/api/images/upload', {
  method: 'POST',
  body: formData
  // Note: Don't set Content-Type, browser sets it with boundary
});

const { data: image } = await response.json();
console.log(`Uploaded: ${image.url}`);
```

#### 5.2 Upload Multiple Images

```typescript
POST /api/images/upload-multiple

Request: multipart/form-data
{
  files: File[];           // Max 5 files, 10MB each
  purpose: 'inspiration';
}

Response 201:
{
  data: Array<{
    id: string;
    url: string;
    width: number;
    height: number;
    fileSize: number;
  }>;
}

Errors:
- 400: Too many files (max 5)
- 413: One or more files too large
```

#### 5.3 Get Image

```typescript
GET /api/images/{imageId}

Response 200:
{
  data: Image;  // Full image object
}

Errors:
- 401: Not authenticated
- 403: Image belongs to different client
- 404: Image not found
```

#### 5.4 Delete Image

```typescript
DELETE /api/images/{imageId}

Response 204: No Content

Note: Soft-deletes image record
S3 object marked for deletion after 30 days

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: Image not found
- 409: Image in use by collection/asset
```

---

### 6. Analysis Services (`/api/analyze/*`)

#### 6.1 Analyze Scene

```typescript
POST /api/analyze/scene

Request:
{
  imageUrl: string;      // S3 URL or public URL
}

Response 200:
{
  data: {
    environment: 'indoor' | 'outdoor' | 'mixed';
    suggestedRoomTypes: string[];
    style: string;
    lighting: string;
    colorPalette: string[];
    materials: {
      floor?: string;
      walls?: string;
      ceiling?: string;
    };
    props: string[];
    mood: string;
  };
}

Errors:
- 400: Invalid or inaccessible image URL
- 401: Not authenticated
- 503: AI service unavailable
```

**Example:**
```bash
curl -X POST https://api.example.com/api/analyze/scene \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "imageUrl": "https://s3.amazonaws.com/.../inspiration.jpg"
  }'
```

#### 6.2 Analyze Product

```typescript
POST /api/analyze/product

Request:
{
  productId: string;
}

Response 200:
{
  data: {
    productType: string;
    category: string;
    suggestedRoomTypes: string[];
    dominantColors: string[];
    materials: string[];
    style: string;
  };
}

Errors:
- 401: Not authenticated
- 404: Product not found
- 503: AI service unavailable
```

#### 6.3 Analyze Products (Batch)

```typescript
POST /api/analyze/products

Request:
{
  productIds: string[];   // Max 100 products
}

Response 200:
{
  data: {
    roomTypeDistribution: Record<string, number>;
    productTypes: string[];
    dominantCategory: string;
    suggestedStyles: string[];
    recommendedInspirationKeywords: string[];
    productRoomAssignments: Record<string, string>;
    analyzedAt: string;
  };
}

Errors:
- 400: Too many products (max 100)
- 401: Not authenticated
- 503: AI service unavailable
```

---

### 7. Unsplash Integration (`/api/unsplash/*`)

#### 7.1 Search Unsplash

```typescript
GET /api/unsplash/search?query=modern+office&page=1&perPage=30

Query Parameters:
- query: string (required)
- page: number (default: 1)
- perPage: number (default: 30, max: 30)
- orientation: 'landscape' | 'portrait' | 'squarish' (default: 'landscape')

Response 200:
{
  data: {
    results: Array<{
      id: string;
      urls: {
        small: string;
        regular: string;
        full: string;
      };
      alt_description: string;
      user: {
        name: string;
        links: { html: string };
      };
      links: {
        html: string;
        download_location: string;
      };
    }>;
    total: number;
    total_pages: number;
  };
}

Errors:
- 400: Missing query parameter
- 401: Not authenticated
- 429: Unsplash rate limit exceeded
- 503: Unsplash API unavailable
```

**Example:**
```javascript
const query = encodeURIComponent('modern home office');
const response = await fetch(`/api/unsplash/search?query=${query}&page=1&perPage=30`);
const { data } = await response.json();

data.results.forEach(photo => {
  console.log(`${photo.alt_description} by ${photo.user.name}`);
});
```

#### 7.2 Download Unsplash Image

```typescript
POST /api/unsplash/download

Request:
{
  photoId: string;
  downloadLocation: string;  // From search result links.download_location
}

Response 200:
{
  data: {
    id: string;          // Our image ID
    url: string;         // S3 URL
    unsplashId: string;  // Original Unsplash photo ID
    attribution: {
      photographerName: string;
      photographerUrl: string;
      unsplashUrl: string;
    };
  };
}

Note: Triggers Unsplash download tracking (required by Unsplash API)

Errors:
- 400: Invalid photoId or downloadLocation
- 401: Not authenticated
- 503: Download failed
```

---

### 8. User Settings (`/api/user/*`)

#### 8.1 Update Profile

```typescript
PATCH /api/user/profile

Request:
{
  name?: string;
  image?: string;  // Image ID from upload
}

Response 200:
{
  data: {
    id: string;
    email: string;
    name: string;
    image?: string;
    updatedAt: string;
  };
}

Errors:
- 401: Not authenticated
- 422: Validation failed
```

#### 8.2 Update Password

```typescript
POST /api/user/password

Request:
{
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

Response 200:
{
  success: true;
  message: "Password updated successfully";
}

Errors:
- 401: Current password incorrect
- 422: Validation failed (passwords don't match, too weak)
```

#### 8.3 Update Notification Settings

```typescript
PATCH /api/user/notifications

Request:
{
  email?: {
    generationCompleted?: boolean;
    generationFailed?: boolean;
    weeklyUsageSummary?: boolean;
  };
  browser?: {
    generationCompleted?: boolean;
    lowQuotaWarning?: boolean;
  };
  frequency?: 'realtime' | 'daily' | 'never';
}

Response 200:
{
  data: NotificationSettings;
}

Errors:
- 401: Not authenticated
```

#### 8.4 Get Usage & Quota

```typescript
GET /api/user/usage

Response 200:
{
  data: {
    plan: 'free' | 'pro' | 'enterprise';
    quota: {
      monthlyGenerations: number;
      used: number;
      remaining: number;
      resetDate: string;
    };
    storage: {
      used: number;        // Bytes
      limit: number;       // Bytes
      percentage: number;  // 0-100
    };
  };
}

Example Response:
{
  "data": {
    "plan": "free",
    "quota": {
      "monthlyGenerations": 100,
      "used": 45,
      "remaining": 55,
      "resetDate": "2026-02-01T00:00:00Z"
    },
    "storage": {
      "used": 524288000,     // 500 MB
      "limit": 5368709120,   // 5 GB
      "percentage": 9.8
    }
  }
}

Errors:
- 401: Not authenticated
```

#### 8.5 Delete Account

```typescript
DELETE /api/user/account

Request:
{
  confirmation: "DELETE";  // Must type exactly "DELETE"
  password: string;
}

Response 204: No Content

Note: Soft-deletes user, member, and all associated data
30-day recovery window before hard deletion

Errors:
- 400: Incorrect confirmation text
- 401: Incorrect password
```

---

## API Design Patterns

### Pagination Strategy

#### Offset-based (for stable data)
```typescript
// Products, Categories (data doesn't change frequently)
GET /api/products?page=1&limit=50

Response:
{
  data: Product[];
  meta: {
    total: 1247;
    page: 1;
    limit: 50;
    totalPages: 25;
    hasMore: true;
  }
}
```

#### Cursor-based (for real-time data)
```typescript
// Generated Assets, Collections (data updates frequently)
GET /api/generated-assets?cursor=eyJpZCI6ImFzc2V0XzEyMyJ9&limit=50

Response:
{
  data: GeneratedAsset[];
  meta: {
    nextCursor: "eyJpZCI6ImFzc2V0XzE3MyJ9";
    hasMore: true;
    total: 523;  // Approximate
  }
}
```

### Filtering and Sorting

**URL Pattern:**
```
GET /api/products?category=furniture&roomType=office&minPrice=100&sort=name&order=asc
```

**Query Parameters:**
- Filters: Use field names directly (`category`, `roomType`, `status`)
- Ranges: Prefix with `min`/`max` (`minPrice`, `maxPrice`)
- Arrays: Comma-separated (`tags=modern,minimal`) or multiple (`tags=modern&tags=minimal`)
- Sort: `sort=field&order=asc|desc`
- Full-text search: `search=query` (searches across multiple fields)

### Status Polling Pattern

For long-running operations (generation, ZIP creation):

```typescript
// Step 1: Initiate operation
POST /api/collections/{id}/generate
Response 202: { jobId: "xyz" }

// Step 2: Poll for status
GET /api/collections/{id}/status

// Poll every 5 seconds with exponential backoff
const pollInterval = (attempts) => Math.min(5000 * Math.pow(1.5, attempts), 30000);

async function poll(collectionId, attempts = 0) {
  const response = await fetch(`/api/collections/${collectionId}/status`);
  const { data } = await response.json();

  if (data.status === 'generating') {
    setTimeout(() => poll(collectionId, attempts + 1), pollInterval(attempts));
  }

  return data;
}
```

### Batch Operations

**Pattern:** Accept array of IDs, return array of results

```typescript
POST /api/generated-assets/bulk-delete
Request: { assetIds: string[] }

POST /api/generated-assets/bulk-pin
Request: { assetIds: string[], pinned: boolean }

Response:
{
  data: {
    successful: string[];    // Asset IDs that succeeded
    failed: Array<{
      assetId: string;
      error: string;
    }>;
  };
  meta: {
    totalRequested: number;
    successCount: number;
    failureCount: number;
  };
}
```

### File Upload Pattern

**Single file:**
```typescript
POST /api/images/upload
Content-Type: multipart/form-data

const formData = new FormData();
formData.append('file', fileBlob);
formData.append('purpose', 'inspiration');

const response = await fetch('/api/images/upload', {
  method: 'POST',
  body: formData
});
```

**Multiple files:**
```typescript
POST /api/images/upload-multiple
Content-Type: multipart/form-data

const formData = new FormData();
files.forEach(file => formData.append('files', file));
formData.append('purpose', 'inspiration');

const response = await fetch('/api/images/upload-multiple', {
  method: 'POST',
  body: formData
});
```

### Error Handling (RFC 7807 Problem Details)

All error responses follow RFC 7807 format:

```typescript
interface ProblemDetails {
  type: string;         // URI reference identifying the problem type
  title: string;        // Short, human-readable summary
  status: number;       // HTTP status code
  detail: string;       // Human-readable explanation
  instance?: string;    // URI reference identifying this occurrence
  [key: string]: any;   // Additional problem-specific fields
}
```

**Example Error Responses:**

**Validation Error (422):**
```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Failed",
  "status": 422,
  "detail": "The request body contains invalid fields",
  "instance": "/api/collections",
  "errors": [
    {
      "field": "name",
      "message": "Collection name is required"
    },
    {
      "field": "selectedProductIds",
      "message": "Must select at least 1 product"
    }
  ]
}
```

**Authentication Error (401):**
```json
{
  "type": "https://api.example.com/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Session expired. Please log in again.",
  "instance": "/api/collections/coll_123"
}
```

**Rate Limit Error (429):**
```json
{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "You have exceeded your monthly generation quota",
  "instance": "/api/collections/coll_123/generate",
  "quota": {
    "limit": 100,
    "used": 100,
    "resetDate": "2026-02-01T00:00:00Z"
  },
  "retryAfter": 2592000  // Seconds until reset
}
```

**Not Found (404):**
```json
{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Collection with ID 'coll_xyz' not found",
  "instance": "/api/collections/coll_xyz"
}
```

**Server Error (500):**
```json
{
  "type": "https://api.example.com/errors/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred. Our team has been notified.",
  "instance": "/api/collections/coll_123/generate",
  "errorId": "err_20260110143052abc",
  "timestamp": "2026-01-10T14:30:52Z"
}
```

### Error Handler Implementation

```typescript
// lib/api/error-handler.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail: string,
    public type: string = 'https://api.example.com/errors/generic',
    public additionalFields: Record<string, any> = {}
  ) {
    super(detail);
    this.name = 'ApiError';
  }

  toJSON(): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      ...this.additionalFields
    };
  }
}

// Usage in API route
export async function POST(request: Request) {
  try {
    // ... route logic
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }

    // Unknown error - log and return generic 500
    console.error('Unexpected error:', error);
    return NextResponse.json({
      type: 'https://api.example.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
      errorId: generateErrorId(),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
```

### Versioning Strategy

**MVP: URL Versioning**
```
/api/v1/collections
/api/v1/products
/api/v1/generated-assets
```

**Future: Header Versioning**
```
GET /api/collections
Accept: application/vnd.epox.v2+json
```

**Deprecation Policy:**
1. Announce deprecation 6 months in advance
2. Return `Deprecation` header: `Deprecation: Sun, 01 Feb 2027 00:00:00 GMT`
3. Return `Sunset` header: `Sunset: Sun, 01 Aug 2027 00:00:00 GMT`
4. Include migration guide link in response headers
5. Remove deprecated version after sunset date

---

## Security

### CORS Configuration

```typescript
// middleware.ts
const allowedOrigins = [
  'https://app.example.com',
  'https://visualizer.example.com',
  process.env.NODE_ENV === 'development' && 'http://localhost:3000'
].filter(Boolean);

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  const response = NextResponse.next();

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');  // 24 hours
  }

  return response;
}
```

### Rate Limiting

**Per-Endpoint Limits:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/login` | 5 requests | 15 minutes |
| `POST /api/auth/signup` | 3 requests | 1 hour |
| `POST /api/auth/password-reset/*` | 5 requests | 1 hour |
| `GET /api/products` | 100 requests | 1 minute |
| `GET /api/collections` | 100 requests | 1 minute |
| `POST /api/collections/*/generate` | 10 requests | 1 hour |
| `POST /api/images/upload` | 30 requests | 1 hour |
| `GET /api/unsplash/search` | 50 requests | 1 hour |
| Default | 1000 requests | 1 hour |

**Implementation:**
```typescript
// lib/middleware/rate-limit.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function rateLimit(
  identifier: string,  // User ID or IP address
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rate_limit:${endpoint}:${identifier}`;
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);

  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count requests in window
  const requestCount = await redis.zcard(key);

  if (requestCount >= maxRequests) {
    const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = parseInt(oldestRequest[1]) + (windowSeconds * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt
    };
  }

  // Add current request
  await redis.zadd(key, now, `${now}:${Math.random()}`);
  await redis.expire(key, windowSeconds);

  return {
    allowed: true,
    remaining: maxRequests - requestCount - 1,
    resetAt: now + (windowSeconds * 1000)
  };
}

// Usage in API route
export async function POST(request: Request) {
  const session = await getSession(request);

  const { allowed, remaining, resetAt } = await rateLimit(
    session.userId,
    'POST:/api/collections/:id/generate',
    10,
    3600  // 1 hour
  );

  if (!allowed) {
    return NextResponse.json({
      type: 'https://api.example.com/errors/rate-limit-exceeded',
      title: 'Too Many Requests',
      status: 429,
      detail: 'You have exceeded the rate limit for this endpoint',
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000)
    }, {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetAt.toString(),
        'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString()
      }
    });
  }

  // Add rate limit headers to success response
  const response = NextResponse.json({ /* ... */ });
  response.headers.set('X-RateLimit-Limit', '10');
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetAt.toString());

  return response;
}
```

### Input Validation

**Use Zod for request validation:**

```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

export const createCollectionSchema = z.object({
  name: z.string()
    .min(1, 'Collection name is required')
    .max(100, 'Collection name must be less than 100 characters'),
  selectedProductIds: z.array(z.string().uuid())
    .min(1, 'Must select at least 1 product')
    .max(500, 'Maximum 500 products per collection')
});

export const generateCollectionSchema = z.object({
  overrideSettings: z.object({
    aspectRatio: z.enum(['1:1', '16:9', '9:16']).optional(),
    varietyLevel: z.number().min(1).max(10).optional(),
    matchProductColors: z.boolean().optional()
  }).optional()
});

// Usage in API route
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = createCollectionSchema.parse(body);

    // ... use validatedData (fully typed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        type: 'https://api.example.com/errors/validation-error',
        title: 'Validation Failed',
        status: 422,
        detail: 'The request body contains invalid fields',
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }, { status: 422 });
    }

    throw error;
  }
}
```

### SQL Injection Prevention

**Drizzle ORM automatically prevents SQL injection:**

```typescript
// ✅ Safe - Parameterized query
const products = await db.products.findMany({
  where: eq(products.clientId, clientId),
  limit: 50
});

// ✅ Safe - Even with user input
const searchTerm = request.url.searchParams.get('search');
const products = await db.products.findMany({
  where: and(
    eq(products.clientId, clientId),
    like(products.name, `%${searchTerm}%`)  // Still safe!
  )
});

// ❌ Never use raw SQL with user input
// Don't do this:
const results = await db.execute(sql`SELECT * FROM products WHERE name = '${searchTerm}'`);
```

### File Upload Security

```typescript
// lib/validation/file-upload.ts
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function validateImageUpload(file: File) {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ApiError(
      415,
      'Unsupported Media Type',
      `Only JPG, PNG, and WebP images are supported. Received: ${file.type}`,
      'https://api.example.com/errors/unsupported-media-type'
    );
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new ApiError(
      413,
      'Payload Too Large',
      `File size must be under 10MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      'https://api.example.com/errors/payload-too-large'
    );
  }

  // Validate file signature (magic bytes)
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const isValidJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  const isValidPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  const isValidWebP = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  if (!isValidJPEG && !isValidPNG && !isValidWebP) {
    throw new ApiError(
      415,
      'Invalid Image File',
      'File does not appear to be a valid image (signature mismatch)',
      'https://api.example.com/errors/invalid-image'
    );
  }

  return true;
}
```

---

## Documentation

### OpenAPI/Swagger Specification

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: Epox Visualizer Client API
  version: 1.0.0
  description: REST API for the Epox Visualizer client platform
  contact:
    name: API Support
    email: support@example.com

servers:
  - url: https://api.example.com/api/v1
    description: Production
  - url: https://staging-api.example.com/api/v1
    description: Staging
  - url: http://localhost:3000/api/v1
    description: Development

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Product:
      type: object
      properties:
        id:
          type: string
          format: uuid
        clientId:
          type: string
          format: uuid
        name:
          type: string
          example: Modern Desk
        sku:
          type: string
          example: DSK-001
        category:
          type: string
          example: Furniture
        roomTypes:
          type: array
          items:
            type: string
          example: [Office, Study]
        primaryImage:
          $ref: '#/components/schemas/Image'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Collection:
      type: object
      properties:
        id:
          type: string
          format: uuid
        clientId:
          type: string
          format: uuid
        name:
          type: string
          example: Modern Furniture Set
        status:
          type: string
          enum: [draft, analyzing, ready, generating, completed, error]
        selectedProductIds:
          type: array
          items:
            type: string
            format: uuid
        productAnalysis:
          $ref: '#/components/schemas/ProductAnalysisResult'
        baseSettings:
          $ref: '#/components/schemas/FlowGenerationSettings'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    ProblemDetails:
      type: object
      properties:
        type:
          type: string
          format: uri
          example: https://api.example.com/errors/validation-error
        title:
          type: string
          example: Validation Failed
        status:
          type: integer
          example: 422
        detail:
          type: string
          example: The request body contains invalid fields
        instance:
          type: string
          format: uri
          example: /api/collections
      required:
        - type
        - title
        - status
        - detail

security:
  - BearerAuth: []

paths:
  /products:
    get:
      summary: List products
      tags: [Products]
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
            maximum: 100
        - name: search
          in: query
          schema:
            type: string
        - name: category
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Product'
                  meta:
                    type: object
                    properties:
                      total:
                        type: integer
                      page:
                        type: integer
                      limit:
                        type: integer
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProblemDetails'

  /collections:
    post:
      summary: Create collection
      tags: [Collections]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                selectedProductIds:
                  type: array
                  items:
                    type: string
                    format: uuid
              required:
                - name
                - selectedProductIds
      responses:
        '201':
          description: Collection created
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Collection'
        '422':
          description: Validation failed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProblemDetails'
```

**Auto-generate TypeScript types:**
```bash
npx openapi-typescript openapi.yaml --output src/types/api.ts
```

### API Client SDK

```typescript
// lib/api/client.ts
export class ApiClient {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string | null>
  ) {}

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data: T; meta?: any }> {
    const token = await this.getToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error);
    }

    return response.json();
  }

  // Products
  products = {
    list: (params?: ProductListParams) =>
      this.request<Product[]>('/products?' + new URLSearchParams(params)),

    get: (id: string) =>
      this.request<Product>(`/products/${id}`),

    categories: () =>
      this.request<Array<{ category: string; count: number }>>('/products/categories')
  };

  // Collections
  collections = {
    list: (params?: CollectionListParams) =>
      this.request<Collection[]>('/collections?' + new URLSearchParams(params)),

    create: (data: CreateCollectionRequest) =>
      this.request<Collection>('/collections', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    get: (id: string) =>
      this.request<Collection>(`/collections/${id}`),

    analyze: (id: string) =>
      this.request<ProductAnalysisResult>(`/collections/${id}/analyze`, {
        method: 'POST'
      }),

    generate: (id: string, overrides?: Partial<FlowGenerationSettings>) =>
      this.request(`/collections/${id}/generate`, {
        method: 'POST',
        body: JSON.stringify({ overrideSettings: overrides })
      }),

    status: (id: string) =>
      this.request<CollectionStatus>(`/collections/${id}/status`)
  };

  // Generated Assets
  generatedAssets = {
    list: (params?: AssetListParams) =>
      this.request<GeneratedAsset[]>('/generated-assets?' + new URLSearchParams(params)),

    get: (id: string) =>
      this.request<GeneratedAsset>(`/generated-assets/${id}`),

    update: (id: string, data: UpdateAssetRequest) =>
      this.request<GeneratedAsset>(`/generated-assets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    delete: (id: string) =>
      this.request(`/generated-assets/${id}`, { method: 'DELETE' }),

    regenerate: (id: string, settings?: Partial<FlowGenerationSettings>) =>
      this.request<GeneratedAsset>(`/generated-assets/${id}/regenerate`, {
        method: 'POST',
        body: JSON.stringify({ settings })
      })
  };
}

// Usage
const client = new ApiClient(
  'https://api.example.com/api/v1',
  async () => localStorage.getItem('session_token')
);

const { data: products } = await client.products.list({ category: 'furniture' });
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
1. Set up API versioning structure (`/api/v1/`)
2. Create error handler with RFC 7807 format
3. Implement rate limiting middleware
4. Set up CORS configuration
5. Create input validation helpers (Zod schemas)

### Phase 2: Authentication Endpoints (Week 1)
1. Implement signup endpoint with invitation validation
2. Create login endpoint with session management
3. Add logout endpoint
4. Build password reset flow
5. Create "Get Current User" endpoint
6. Test auth flows end-to-end

### Phase 3: Product Endpoints (Week 2)
1. Implement product list with pagination
2. Add filtering (category, room type, search)
3. Create product detail endpoint
4. Build category aggregation endpoint
5. Add room type aggregation endpoint
6. Optimize queries with indexes

### Phase 4: Collection CRUD (Week 2)
1. Create collection creation endpoint
2. Implement collection list with filters
3. Add collection detail endpoint
4. Build collection update endpoint
5. Create collection delete endpoint (soft-delete)
6. Test collection workflows

### Phase 5: Analysis Services (Week 3)
1. Implement product analysis endpoint (single)
2. Create batch product analysis endpoint
3. Add scene analysis endpoint
4. Build inspiration image analysis
5. Integrate Gemini AI service
6. Add fallback logic for AI failures

### Phase 6: Generation Endpoints (Week 3)
1. Create collection generation trigger endpoint
2. Implement generation status polling endpoint
3. Build generated asset CRUD endpoints
4. Add asset regeneration endpoint
5. Create download endpoints (single & bulk ZIP)
6. Test generation workflows end-to-end

### Phase 7: Image Upload & Management (Week 4)
1. Implement single image upload endpoint
2. Create multiple image upload endpoint
3. Add image detail endpoint
4. Build image delete endpoint
5. Integrate S3 streaming upload
6. Add file validation (MIME type, size, signature)

### Phase 8: Unsplash Integration (Week 4)
1. Create Unsplash search endpoint
2. Implement Unsplash download endpoint
3. Add attribution tracking
4. Test Unsplash API integration
5. Add fallback mock data

### Phase 9: User Settings (Week 5)
1. Implement profile update endpoint
2. Create password change endpoint
3. Add notification settings endpoint
4. Build usage & quota endpoint
5. Create account deletion endpoint

### Phase 10: Documentation & Testing (Week 5-6)
1. Write OpenAPI/Swagger specification
2. Auto-generate TypeScript types
3. Create API client SDK
4. Write integration tests for all endpoints
5. Add API documentation site (Swagger UI)
6. Performance testing and optimization

---

## Examples

### ✅ Good: Consistent Response Format

```typescript
// All success responses have same structure
export async function GET(request: Request) {
  const products = await db.products.findMany();

  return NextResponse.json({
    data: products,
    meta: {
      total: products.length,
      page: 1,
      limit: 50
    }
  });
}
```

### ✅ Good: Proper Error Handling

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createCollectionSchema.parse(body);

    const collection = await db.collections.create(validated);

    return NextResponse.json({ data: collection }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        type: 'https://api.example.com/errors/validation-error',
        title: 'Validation Failed',
        status: 422,
        detail: 'Invalid request body',
        errors: error.errors
      }, { status: 422 });
    }

    throw error;  // Caught by global error handler
  }
}
```

### ✅ Good: Client-Scoped Queries

```typescript
export async function GET(request: Request) {
  const session = await getSession(request);

  // Always scope to user's client
  const products = await db.products.findMany({
    where: eq(products.clientId, session.clientId)
  });

  return NextResponse.json({ data: products });
}
```

### ❌ Bad: Missing Authorization

```typescript
// ❌ No auth check - anyone can access
export async function GET(request: Request) {
  const products = await db.products.findMany();  // Returns ALL products
  return NextResponse.json(products);
}

// ✅ Proper auth and scoping
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const products = await db.products.findMany({
    where: eq(products.clientId, session.clientId)
  });

  return NextResponse.json({ data: products });
}
```

### ❌ Bad: Inconsistent Response Format

```typescript
// ❌ Mixing response formats
export async function GET() {
  return NextResponse.json(products);  // Just array
}

export async function POST() {
  return NextResponse.json({ success: true, data: product });  // Different shape
}

// ✅ Consistent format
export async function GET() {
  return NextResponse.json({ data: products, meta: {} });
}

export async function POST() {
  return NextResponse.json({ data: product }, { status: 201 });
}
```

---

## Trade-offs

### REST vs. GraphQL
**Chosen**: REST
**Rationale**:
- ✅ Simpler to implement and understand
- ✅ Better caching (HTTP-level)
- ✅ Excellent tooling (OpenAPI, Swagger)
- ✅ Easier to version and deprecate
- ❌ More endpoints to maintain
- ❌ Over-fetching data in some cases

Future: Add GraphQL layer for complex queries

### Cursor vs. Offset Pagination
**Chosen**: Hybrid (cursor for real-time, offset for stable)
**Rationale**:
- ✅ Cursor: Handles real-time data (generated assets)
- ✅ Offset: Simpler for stable data (products, categories)
- ✅ Can switch per-endpoint based on use case
- ❌ Need to maintain both implementations

### Polling vs. WebSockets
**Chosen**: Polling (MVP), WebSocket (future)
**Rationale**:
- ✅ Polling: Simpler, works with serverless
- ✅ No connection management needed
- ✅ Easier to debug
- ❌ More API requests
- ❌ 5-second delay in updates

Future: Upgrade to WebSocket for real-time push

### API Versioning in URL vs. Header
**Chosen**: URL versioning (`/api/v1/`)
**Rationale**:
- ✅ Explicit and visible
- ✅ Easier to test and document
- ✅ Can serve different versions simultaneously
- ❌ URL changes when version changes
- ❌ Harder to gradually migrate

Future: Support header-based versioning for gradual migration

### Soft-Delete vs. Hard-Delete
**Chosen**: Soft-delete for user data
**Rationale**:
- ✅ Prevents accidental data loss
- ✅ 30-day recovery window
- ✅ Audit trail
- ❌ Need to filter `WHERE deletedAt IS NULL`
- ❌ Database grows (mitigated by cron cleanup)

### Synchronous vs. Asynchronous Processing
**Chosen**: Async for generation, sync for CRUD
**Rationale**:
- ✅ Generation: Async (long-running, 1-5 minutes)
- ✅ CRUD: Sync (fast, <100ms)
- ✅ Return 202 Accepted for async operations
- ❌ Need polling mechanism for status

---

## Open Questions

1. **API Gateway**: Should we use an API gateway (Kong, Tyk) or handle everything in Next.js?
   - Proposal: Next.js for MVP, evaluate gateway for scale

2. **GraphQL Layer**: When should we add GraphQL support?
   - Proposal: Phase 2, after REST is stable

3. **Webhook Support**: Should we allow webhooks for generation completion?
   - Proposal: Phase 3 feature, not MVP

4. **API Key Authentication**: Support API keys for programmatic access?
   - Proposal: Phase 2, for integrations

5. **Batch Endpoints**: Should we support batch operations (bulk create, update)?
   - Proposal: Add as needed (bulk delete already planned)

---

## Success Criteria

- [ ] All endpoints follow consistent naming and response format
- [ ] 100% of endpoints have OpenAPI documentation
- [ ] Input validation on all POST/PATCH endpoints
- [ ] Rate limiting implemented on all endpoints
- [ ] All errors follow RFC 7807 Problem Details format
- [ ] Client-scoped authorization on all data access
- [ ] No SQL injection vulnerabilities (Drizzle ORM)
- [ ] File upload validation (MIME type, size, signature)
- [ ] Pagination works correctly (offset and cursor)
- [ ] Polling endpoints support exponential backoff
- [ ] TypeScript types auto-generated from OpenAPI spec
- [ ] API client SDK fully functional
- [ ] All endpoints tested (unit + integration)
- [ ] API response time <200ms (p95, excluding AI calls)
- [ ] 99.9% uptime SLA
