# Design Log #007: API Design & Specifications

**Status**: Draft
**Created**: 2026-01-10
**Updated**: 2026-01-18
**Author**: Claude
**Related**: Design Log #001 (Architecture), Design Log #002 (Authentication), Design Log #003 (Data Model), Design Log #004 (User Flows)

---

## Background

The `visualizer-client` platform needs a comprehensive REST API to support:

- Client user authentication and authorization
- Product browsing and filtering (1000+ products)
- Studio session management with multi-flow support
- Flow creation and configuration (multiple flows per session)
- AI-powered product and scene analysis
- Image uploads and inspiration management
- Real-time generation progress tracking per flow
- Generated image management (download, pin, delete, regenerate)

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
8. **Integrates with external services** - Unsplash, Gemini AI, R2

## Questions and Answers

### Q1: Should we use REST, GraphQL, or tRPC?

**A**: REST with OpenAPI specs:

- REST: Familiar, well-supported, easy to document
- OpenAPI: Auto-generate TypeScript types, API docs
- Future: Can add GraphQL layer for complex queries if needed

**Rationale**: REST is simpler for MVP, widely understood, excellent tooling.

### Q2: How do we handle API versioning?

**A**: URL versioning initially, header-based later:

- MVP: `/api/v1/studioSessions` (explicit version in path)
- Future: Accept header versioning for backward compatibility
- Deprecation policy: 6-month notice before removing old versions

### Q3: What's our pagination strategy?

**A**: Hybrid approach:

- **Cursor-based**: For real-time data (generated images, studioSessions)
- **Offset-based**: For stable data (products, with limit of 10k results)
- Always include `total`, `hasMore`, `nextCursor` in responses

### Q4: How do we handle file uploads?

**A**: Multipart upload with streaming:

- Direct upload to API → stream to R2
- Max 10MB per image
- Support multiple file upload (up to 5 images)
- Return R2 URL immediately after upload

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
   - Plural for studioSessions: `/studioSessions`, `/products`
   - Nested resources: `/studioSessions/{id}/images`

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
    rememberMe: true,
  }),
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
  order: 'asc',
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

### 3. Studio Sessions (`/api/sessions/*`)

#### 3.1 Create Studio Session

```typescript
POST /api/sessions

Request:
{
  name: string;
  productIds: string[];  // Min: 1, products for this session
}

Response 201:
{
  data: {
    id: string;
    clientId: string;
    name: string;
    productIds: string[];
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
const response = await fetch('/api/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Modern Furniture StudioSession',
    selectedProductIds: ['prod_123', 'prod_456', 'prod_789'],
  }),
});

const { data: studioSession } = await response.json();
console.log(`Created studioSession: ${studioSession.id}`);
```

#### 3.2 List StudioSessions

```typescript
GET /api/sessions?page=1&limit=20&status=completed&sort=createdAt&order=desc

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
    status: StudioSessionStatus;
    selectedProductIds: string[];
    productCount: number;
    generatedImageCount: number;
    completedImageCount: number;
    failedImageCount: number;
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

#### 3.3 Get StudioSession by ID

```typescript
GET /api/sessions/{studioSessionId}

Response 200:
{
  data: {
    id: string;
    clientId: string;
    name: string;
    status: StudioSessionStatus;
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
- 403: StudioSession belongs to different client
- 404: StudioSession not found
```

#### 3.4 Update StudioSession

````typescript
PATCH /api/sessions/{studioSessionId}

Request:
{
  name?: string;
  selectedProductIds?: string[];
  baseSettings?: Partial<FlowGenerationSettings>;
  promptTags?: PromptTags;  // User-customized prompt tags from Q&A form
}

// PromptTags interface
interface PromptTags {
  roomType: string[];    // Selected room types
  mood: string[];        // Selected moods (cozy, minimalist, elegant, etc.)
  lighting: string[];    // Selected lighting (natural, warm, dramatic, etc.)
  style: string[];       // Selected styles (scandinavian, modern, industrial, etc.)
  custom: string[];      // User-defined custom tags
}

Response 200:
{
  data: StudioSession;  // Updated studioSession
}

Example Request (saving prompt tags from Q&A form):
```json
{
  "promptTags": {
    "roomType": ["living room", "bedroom"],
    "mood": ["elegant", "minimalist"],
    "lighting": ["natural"],
    "style": ["scandinavian", "modern"],
    "custom": ["high ceilings", "wooden floors"]
  }
}
````

Errors:

- 400: Invalid update (can't modify generating studioSession)
- 401: Not authenticated
- 403: Not authorized
- 404: StudioSession not found
- 422: Validation failed

````

#### 3.5 Delete StudioSession

```typescript
DELETE /api/sessions/{studioSessionId}

Response 204: No Content

Note: Soft-deletes studioSession and all associated generated images

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: StudioSession not found
````

#### 3.6 Analyze StudioSession Products

```typescript
POST /api/sessions/{studioSessionId}/analyze

Request: (no body, uses selectedProductIds from studioSession)

Response 200:
{
  data: {
    roomTypeDistribution: Record<string, number>;
    productTypes: string[];
    dominantCategory: string;
    suggestedStyles: string[];
    recommendedInspirationKeywords: string[];
    productRoomAssignments: Record<string, string>;  // productId → roomType
    suggestedPromptTags: PromptTags;  // AI-suggested prompt tags for Q&A form
    analyzedAt: string;
  };
}

// PromptTags interface (for Q&A form customization)
interface PromptTags {
  roomType: string[];    // Suggested room types from product analysis
  mood: string[];        // Mood suggestions (cozy, minimalist, elegant, etc.)
  lighting: string[];    // Lighting suggestions (natural, warm, dramatic, etc.)
  style: string[];       // Style suggestions (scandinavian, modern, industrial, etc.)
  custom: string[];      // Empty by default, user can add custom tags
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
    "suggestedPromptTags": {
      "roomType": ["living room", "bedroom", "office"],
      "mood": ["cozy", "minimalist", "elegant"],
      "lighting": ["natural", "warm", "soft"],
      "style": ["modern", "contemporary", "scandinavian"],
      "custom": []
    },
    "analyzedAt": "2026-01-10T14:30:52Z"
  }
}

Errors:
- 401: Not authenticated
- 404: StudioSession not found
- 422: No products selected
- 503: AI service unavailable (fallback to metadata-only)
```

**Example Request:**

```bash
curl -X POST https://api.example.com/api/sessions/coll_abc123/analyze \
  -H "Authorization: Bearer <session_token>"
```

#### 3.7 Add Inspiration Images

```typescript
POST /api/sessions/{studioSessionId}/inspirations

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
    studioSessionId: string;
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
- 404: StudioSession or image not found
```

#### 3.8 Analyze Inspiration Image

```typescript
POST /api/sessions/{studioSessionId}/inspirations/{inspirationId}/analyze

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

#### 3.9 Generate StudioSession

```typescript
POST /api/sessions/{studioSessionId}/generate

// Note: When generating, the system automatically converts promptTags to a
// comma-separated prompt string that guides the AI generation.
// Example: { roomType: ["living room"], mood: ["cozy"], style: ["modern"] }
// Becomes: "living room, cozy, modern" in the generation prompt.

Request:
{
  overrideSettings?: Partial<FlowGenerationSettings>;
}

Response 202:  // Accepted (async processing)
{
  data: {
    studioSessionId: string;
    status: 'generating';
    images: Array<{
      id: string;
      productId: string;
      status: 'pending';
      jobId: string;
    }>;
  };
  meta: {
    totalImages: number;
    estimatedCompletionTime: string;  // ISO 8601 duration (e.g., "PT5M")
  };
}

Example Response:
{
  "data": {
    "studioSessionId": "coll_abc123",
    "status": "generating",
    "images": [
      {
        "id": "image_001",
        "productId": "prod_123",
        "status": "pending",
        "jobId": "job_xyz789"
      },
      {
        "id": "image_002",
        "productId": "prod_456",
        "status": "pending",
        "jobId": "job_xyz790"
      }
    ]
  },
  "meta": {
    "totalImages": 3,
    "estimatedCompletionTime": "PT3M"  // 3 minutes
  }
}

Errors:
- 400: StudioSession not ready (missing analysis or inspirations)
- 401: Not authenticated
- 404: StudioSession not found
- 409: StudioSession already generating
- 429: Monthly quota exceeded
```

**Example Request:**

```javascript
const response = await fetch(`/api/sessions/${studioSessionId}/generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionToken}`,
  },
  body: JSON.stringify({
    overrideSettings: {
      aspectRatio: '16:9',
      varietyLevel: 7,
    },
  }),
});

const { data, meta } = await response.json();
console.log(`Generating ${meta.totalImages} images...`);
```

#### 3.10 Get StudioSession Generation Status

```typescript
GET /api/sessions/{studioSessionId}/status

Response 200:
{
  data: {
    studioSessionId: string;
    status: 'generating' | 'completed' | 'error';
    progress: {
      total: number;
      pending: number;
      generating: number;
      completed: number;
      failed: number;
      percentage: number;  // 0-100
    };
    images: Array<{
      id: string;
      productId: string;
      status: ImageStatus;
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
    "studioSessionId": "coll_abc123",
    "status": "generating",
    "progress": {
      "total": 3,
      "pending": 0,
      "generating": 1,
      "completed": 2,
      "failed": 0,
      "percentage": 66.7
    },
    "images": [
      {
        "id": "image_001",
        "productId": "prod_123",
        "status": "completed",
        "progress": 100,
        "imageUrl": "https://s3.../image_001.jpg"
      },
      {
        "id": "image_002",
        "productId": "prod_456",
        "status": "generating",
        "progress": 60
      },
      {
        "id": "image_003",
        "productId": "prod_789",
        "status": "completed",
        "progress": 100,
        "imageUrl": "https://s3.../image_003.jpg"
      }
    ],
    "startedAt": "2026-01-10T14:35:00Z"
  }
}

Errors:
- 401: Not authenticated
- 404: StudioSession not found
```

**Polling Example:**

```javascript
// Poll every 5 seconds while generating
async function pollStudioSessionStatus(studioSessionId) {
  const response = await fetch(`/api/sessions/${studioSessionId}/status`);
  const { data } = await response.json();

  console.log(`Progress: ${data.progress.percentage}%`);

  if (data.status === 'generating') {
    setTimeout(() => pollStudioSessionStatus(studioSessionId), 5000);
  } else {
    console.log('Generation complete!');
  }
}

pollStudioSessionStatus('coll_abc123');
```

---

### 4. Flows (`/api/flows/*`)

#### 4.1 Create Flow

```typescript
POST /api/sessions/{sessionId}/flows

Request:
{
  name: string;
  productIds: string[];  // Subset of session's products
  settings: FlowGenerationSettings;
  inspirationImages?: string[];  // Image IDs
}

Response 201:
{
  data: {
    id: string;
    sessionId: string;
    clientId: string;
    name: string;
    productIds: string[];
    settings: FlowGenerationSettings;
    status: 'draft';
    createdAt: string;
    updatedAt: string;
  };
}

Errors:
- 400: Invalid product IDs (must be in session)
- 401: Not authenticated
- 404: Session not found
- 422: Validation failed
```

#### 4.2 Get Flow

```typescript
GET /api/flows/{flowId}

Response 200:
{
  data: {
    id: string;
    sessionId: string;
    clientId: string;
    name: string;
    productIds: string[];
    settings: FlowGenerationSettings;
    status: FlowStatus;
    inspirationImages: Image[];
    createdAt: string;
    updatedAt: string;
  };
}

Errors:
- 401: Not authenticated
- 403: Flow belongs to different client
- 404: Flow not found
```

#### 4.3 Update Flow

```typescript
PUT /api/flows/{flowId}

Request:
{
  name?: string;
  productIds?: string[];
  settings?: Partial<FlowGenerationSettings>;
}

Response 200:
{
  data: Flow;  // Updated flow
}

Errors:
- 400: Invalid update (can't modify generating flow)
- 401: Not authenticated
- 403: Not authorized
- 404: Flow not found
- 422: Validation failed
```

#### 4.4 Generate Flow

```typescript
POST /api/flows/{flowId}/generate

Request: (no body, uses flow's settings)

Response 202:  // Accepted (async processing)
{
  data: {
    flowId: string;
    status: 'generating';
    generatedImages: Array<{
      id: string;
      productId: string;
      status: 'pending';
      jobId: string;
    }>;
  };
  meta: {
    totalImages: number;
    estimatedCompletionTime: string;  // ISO 8601 duration
  };
}

Errors:
- 401: Not authenticated
- 404: Flow not found
- 409: Flow already generating
- 429: Monthly quota exceeded
```

#### 4.5 Get Flow Status

```typescript
GET /api/flows/{flowId}/status

Response 200:
{
  data: {
    flowId: string;
    status: 'generating' | 'completed' | 'error';
    progress: {
      total: number;
      pending: number;
      generating: number;
      completed: number;
      failed: number;
      percentage: number;  // 0-100
    };
    generatedImages: Array<{
      id: string;
      productId: string;
      status: GeneratedImageStatus;
      progress: number;
      imageUrl?: string;
      errorMessage?: string;
    }>;
    startedAt: string;
    completedAt?: string;
  };
}

Errors:
- 401: Not authenticated
- 404: Flow not found
```

#### 4.6 Get Flow Images

```typescript
GET /api/flows/{flowId}/images?page=1&limit=50

Response 200:
{
  data: GeneratedImage[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

Errors:
- 401: Not authenticated
- 404: Flow not found
```

#### 4.7 Delete Flow

```typescript
DELETE /api/flows/{flowId}

Response 204: No Content

Note: Soft-deletes flow and all associated generated images

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: Flow not found
```

---

### 5. Generated Images (`/api/images/*`)

#### 5.1 List Generated Images

```typescript
GET /api/images?flowId=flow_123&status=completed&roomType=office&pinned=true&page=1&limit=50

Query Parameters:
- flowId: string (filter by flow)
- sessionId: string (filter by session - returns images from all flows in session)
- productId: string (filter by product)
- status: ImageStatus (filter by status)
- roomType: string (from settings.roomType)
- pinned: boolean (only pinned images)
- page: number (default: 1)
- limit: number (default: 50, max: 100)
- sort: 'createdAt' | 'completedAt' | 'productName'
- order: 'asc' | 'desc' (default: 'desc')

Response 200:
{
  data: Array<{
    id: string;
    flowId: string;
    sessionId: string;
    productId: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
    type: 'image';
    status: ImageStatus;
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

#### 5.2 Get Generated Image

```typescript
GET /api/images/{imageId}

Response 200:
{
  data: GeneratedImage;  // Full image with all details
}

Errors:
- 401: Not authenticated
- 403: Image belongs to different client
- 404: Image not found
```

#### 5.3 Update Generated Image

```typescript
PATCH /api/images/{imageId}

Request:
{
  pinned?: boolean;
}

Response 200:
{
  data: GeneratedImage;  // Updated image
}

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: Image not found
```

**Example - Pin Image:**

```javascript
const response = await fetch(`/api/images/${imageId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pinned: true }),
});

const { data: image } = await response.json();
console.log(`Image ${image.id} pinned: ${image.pinned}`);
```

#### 5.4 Delete Generated Image

```typescript
DELETE /api/images/{imageId}

Response 204: No Content

Note: Soft-deletes image (sets deletedAt)
R2 object marked for deletion after 30 days

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: Image not found
```

#### 5.5 Restore Deleted Image

```typescript
POST /api/images/{imageId}/restore

Response 200:
{
  data: GeneratedImage;  // Restored image
}

Errors:
- 400: Image not deleted
- 401: Not authenticated
- 404: Image not found
```

#### 5.6 Regenerate Image

```typescript
POST /api/images/{imageId}/regenerate

Request:
{
  settings?: Partial<FlowGenerationSettings>;  // Override settings
}

Response 201:
{
  data: {
    id: string;           // New image ID
    productId: string;
    status: 'pending';
    settings: FlowGenerationSettings;
    jobId: string;
    createdAt: string;
  };
  meta: {
    originalImageId: string;
  };
}

Note: Creates new image, original remains

Errors:
- 401: Not authenticated
- 404: Original image not found
- 429: Rate limit exceeded
```

#### 5.7 Download Image

```typescript
GET /api/images/{imageId}/download

Response 302: Redirect to R2 signed URL

Headers:
Content-Disposition: attachment; filename="modern_desk_office_20260110.jpg"

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: Image not found or not completed
```

**Example:**

```javascript
// Trigger browser download
window.location.href = `/api/images/${imageId}/download`;
```

#### 5.8 Bulk Download (ZIP)

```typescript
POST /api/images/bulk-download

Request:
{
  imageIds: string[];    // Max 100 images
}

Response 202:  // Accepted (async ZIP creation)
{
  data: {
    jobId: string;
    status: 'processing';
    totalImages: number;
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
- 400: Too many images (max 100)
- 401: Not authenticated
```

**Full Example - Bulk Download:**

```javascript
// Step 1: Request ZIP creation
const createResponse = await fetch('/api/images/bulk-download', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageIds: ['image_001', 'image_002', 'image_003'],
  }),
});

const {
  data: { jobId },
} = await createResponse.json();

// Step 2: Poll for completion
async function pollDownloadJob(jobId) {
  const response = await fetch(`/api/download-jobs/${jobId}`);
  const { data } = await response.json();

  if (data.status === 'processing') {
    console.log(`Progress: ${data.progress}%`);
    setTimeout(() => pollDownloadJob(jobId), 2000);
  } else if (data.status === 'completed') {
    console.log('ZIP ready!');
    window.location.href = data.downloadUrl; // Trigger download
  } else {
    console.error('ZIP creation failed');
  }
}

pollDownloadJob(jobId);
```

---

### 6. Images/Upload (`/api/upload/*`)

#### 6.1 Upload Image

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
  body: formData,
  // Note: Don't set Content-Type, browser sets it with boundary
});

const { data: image } = await response.json();
console.log(`Uploaded: ${image.url}`);
```

#### 6.2 Upload Multiple Images

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

#### 6.3 Get Image

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

#### 6.4 Delete Image

```typescript
DELETE /api/images/{imageId}

Response 204: No Content

Note: Soft-deletes image record
R2 object marked for deletion after 30 days

Errors:
- 401: Not authenticated
- 403: Not authorized
- 404: Image not found
- 409: Image in use by studioSession/image
```

---

### 7. Analysis Services (`/api/analyze/*`)

#### 7.1 Analyze Scene

```typescript
POST /api/analyze/scene

Request:
{
  imageUrl: string;      // R2 URL or public URL
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

#### 7.2 Analyze Product

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

#### 7.3 Analyze Products (Batch)

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

### 8. Unsplash Integration (`/api/unsplash/*`)

#### 8.1 Search Unsplash

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

data.results.forEach((photo) => {
  console.log(`${photo.alt_description} by ${photo.user.name}`);
});
```

#### 8.2 Download Unsplash Image

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
    url: string;         // R2 URL
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

### 9. User Settings (`/api/user/*`)

#### 9.1 Update Profile

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

#### 9.2 Update Password

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

#### 9.3 Update Notification Settings

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

#### 9.4 Get Usage & Quota

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

#### 9.5 Delete Account

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
// Generated Images, StudioSessions (data updates frequently)
GET /api/images?cursor=eyJpZCI6ImFzc2V0XzEyMyJ9&limit=50

Response:
{
  data: GeneratedImage[];
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
POST /api/sessions/{id}/generate
Response 202: { jobId: "xyz" }

// Step 2: Poll for status
GET /api/sessions/{id}/status

// Poll every 5 seconds with exponential backoff
const pollInterval = (attempts) => Math.min(5000 * Math.pow(1.5, attempts), 30000);

async function poll(studioSessionId, attempts = 0) {
  const response = await fetch(`/api/sessions/${studioSessionId}/status`);
  const { data } = await response.json();

  if (data.status === 'generating') {
    setTimeout(() => poll(studioSessionId, attempts + 1), pollInterval(attempts));
  }

  return data;
}
```

### Batch Operations

**Pattern:** Accept array of IDs, return array of results

```typescript
POST /api/images/bulk-delete
Request: { imageIds: string[] }

POST /api/images/bulk-pin
Request: { imageIds: string[], pinned: boolean }

Response:
{
  data: {
    successful: string[];    // Image IDs that succeeded
    failed: Array<{
      imageId: string;
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
  type: string; // URI reference identifying the problem type
  title: string; // Short, human-readable summary
  status: number; // HTTP status code
  detail: string; // Human-readable explanation
  instance?: string; // URI reference identifying this occurrence
  [key: string]: any; // Additional problem-specific fields
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
  "instance": "/api/sessions",
  "errors": [
    {
      "field": "name",
      "message": "StudioSession name is required"
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
  "instance": "/api/sessions/coll_123"
}
```

**Rate Limit Error (429):**

```json
{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "You have exceeded your monthly generation quota",
  "instance": "/api/sessions/coll_123/generate",
  "quota": {
    "limit": 100,
    "used": 100,
    "resetDate": "2026-02-01T00:00:00Z"
  },
  "retryAfter": 2592000 // Seconds until reset
}
```

**Not Found (404):**

```json
{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "StudioSession with ID 'coll_xyz' not found",
  "instance": "/api/sessions/coll_xyz"
}
```

**Server Error (500):**

```json
{
  "type": "https://api.example.com/errors/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred. Our team has been notified.",
  "instance": "/api/sessions/coll_123/generate",
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
      ...this.additionalFields,
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
    return NextResponse.json(
      {
        type: 'https://api.example.com/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
        errorId: generateErrorId(),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
```

### Versioning Strategy

**MVP: URL Versioning**

```
/api/v1/studioSessions
/api/v1/products
/api/v1/images
```

**Future: Header Versioning**

```
GET /api/sessions
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
  process.env.NODE_ENV === 'development' && 'http://localhost:3000',
].filter(Boolean);

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  const response = NextResponse.next();

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  return response;
}
```

### Rate Limiting

**Per-Endpoint Limits:**

| Endpoint                          | Limit         | Window     |
| --------------------------------- | ------------- | ---------- |
| `POST /api/auth/login`            | 5 requests    | 15 minutes |
| `POST /api/auth/signup`           | 3 requests    | 1 hour     |
| `POST /api/auth/password-reset/*` | 5 requests    | 1 hour     |
| `GET /api/products`               | 100 requests  | 1 minute   |
| `GET /api/sessions`               | 100 requests  | 1 minute   |
| `POST /api/sessions/*/generate`   | 10 requests   | 1 hour     |
| `POST /api/images/upload`         | 30 requests   | 1 hour     |
| `GET /api/unsplash/search`        | 50 requests   | 1 hour     |
| Default                           | 1000 requests | 1 hour     |

**Implementation:**

```typescript
// lib/middleware/rate-limit.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function rateLimit(
  identifier: string, // User ID or IP address
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rate_limit:${endpoint}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count requests in window
  const requestCount = await redis.zcard(key);

  if (requestCount >= maxRequests) {
    const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = parseInt(oldestRequest[1]) + windowSeconds * 1000;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Add current request
  await redis.zadd(key, now, `${now}:${Math.random()}`);
  await redis.expire(key, windowSeconds);

  return {
    allowed: true,
    remaining: maxRequests - requestCount - 1,
    resetAt: now + windowSeconds * 1000,
  };
}

// Usage in API route
export async function POST(request: Request) {
  const session = await getSession(request);

  const { allowed, remaining, resetAt } = await rateLimit(
    session.userId,
    'POST:/api/sessions/:id/generate',
    10,
    3600 // 1 hour
  );

  if (!allowed) {
    return NextResponse.json(
      {
        type: 'https://api.example.com/errors/rate-limit-exceeded',
        title: 'Too Many Requests',
        status: 429,
        detail: 'You have exceeded the rate limit for this endpoint',
        retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetAt.toString(),
          'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Add rate limit headers to success response
  const response = NextResponse.json({
    /* ... */
  });
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

export const createStudioSessionSchema = z.object({
  name: z.string().min(1, 'StudioSession name is required').max(100, 'StudioSession name must be less than 100 characters'),
  selectedProductIds: z
    .array(z.string().uuid())
    .min(1, 'Must select at least 1 product')
    .max(500, 'Maximum 500 products per studioSession'),
});

export const generateStudioSessionSchema = z.object({
  overrideSettings: z
    .object({
      aspectRatio: z.enum(['1:1', '16:9', '9:16']).optional(),
      varietyLevel: z.number().min(1).max(10).optional(),
      matchProductColors: z.boolean().optional(),
    })
    .optional(),
});

// Usage in API route
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = createStudioSessionSchema.parse(body);

    // ... use validatedData (fully typed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          type: 'https://api.example.com/errors/validation-error',
          title: 'Validation Failed',
          status: 422,
          detail: 'The request body contains invalid fields',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 422 }
      );
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
  limit: 50,
});

// ✅ Safe - Even with user input
const searchTerm = request.url.searchParams.get('search');
const products = await db.products.findMany({
  where: and(
    eq(products.clientId, clientId),
    like(products.name, `%${searchTerm}%`) // Still safe!
  ),
});

// ❌ Never use raw SQL with user input
// Don't do this:
const results = await db.execute(sql`SELECT * FROM products WHERE name = '${searchTerm}'`);
```

### File Upload Security

```typescript
// lib/validation/file-upload.ts
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

  const isValidJPEG = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isValidPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
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

    PromptTags:
      type: object
      description: User-customizable prompt tags for AI generation (Q&A form)
      properties:
        roomType:
          type: array
          items:
            type: string
          example: ['living room', 'bedroom']
        mood:
          type: array
          items:
            type: string
          example: ['cozy', 'minimalist', 'elegant']
        lighting:
          type: array
          items:
            type: string
          example: ['natural', 'warm', 'soft']
        style:
          type: array
          items:
            type: string
          example: ['scandinavian', 'modern', 'contemporary']
        custom:
          type: array
          items:
            type: string
          example: ['high ceilings', 'wooden floors']

    StudioSession:
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
        promptTags:
          $ref: '#/components/schemas/PromptTags'
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
          example: /api/sessions
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

  /studioSessions:
    post:
      summary: Create studioSession
      tags: [StudioSessions]
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
          description: StudioSession created
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/StudioSession'
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

  private async request<T>(path: string, options: RequestInit = {}): Promise<{ data: T; meta?: any }> {
    const token = await this.getToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error);
    }

    return response.json();
  }

  // Products
  products = {
    list: (params?: ProductListParams) => this.request<Product[]>('/products?' + new URLSearchParams(params)),

    get: (id: string) => this.request<Product>(`/products/${id}`),

    categories: () => this.request<Array<{ category: string; count: number }>>('/products/categories'),
  };

  // StudioSessions
  studioSessions = {
    list: (params?: StudioSessionListParams) => this.request<StudioSession[]>('/studioSessions?' + new URLSearchParams(params)),

    create: (data: CreateStudioSessionRequest) =>
      this.request<StudioSession>('/studioSessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    get: (id: string) => this.request<StudioSession>(`/studioSessions/${id}`),

    analyze: (id: string) =>
      this.request<ProductAnalysisResult>(`/studioSessions/${id}/analyze`, {
        method: 'POST',
      }),

    generate: (id: string, overrides?: Partial<FlowGenerationSettings>) =>
      this.request(`/studioSessions/${id}/generate`, {
        method: 'POST',
        body: JSON.stringify({ overrideSettings: overrides }),
      }),

    status: (id: string) => this.request<StudioSessionStatus>(`/studioSessions/${id}/status`),
  };

  // Generated Images
  generatedImages = {
    list: (params?: ImageListParams) => this.request<GeneratedImage[]>('/images?' + new URLSearchParams(params)),

    get: (id: string) => this.request<GeneratedImage>(`/images/${id}`),

    update: (id: string, data: UpdateImageRequest) =>
      this.request<GeneratedImage>(`/images/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) => this.request(`/images/${id}`, { method: 'DELETE' }),

    regenerate: (id: string, settings?: Partial<FlowGenerationSettings>) =>
      this.request<GeneratedImage>(`/images/${id}/regenerate`, {
        method: 'POST',
        body: JSON.stringify({ settings }),
      }),
  };
}

// Usage
const client = new ApiClient('https://api.example.com/api/v1', async () => localStorage.getItem('session_token'));

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

### Phase 4: StudioSession CRUD (Week 2)

1. Create studioSession creation endpoint
2. Implement studioSession list with filters
3. Add studioSession detail endpoint
4. Build studioSession update endpoint
5. Create studioSession delete endpoint (soft-delete)
6. Test studioSession workflows

### Phase 5: Analysis Services (Week 3)

1. Implement product analysis endpoint (single)
2. Create batch product analysis endpoint
3. Add scene analysis endpoint
4. Build inspiration image analysis
5. Integrate Gemini AI service
6. Add fallback logic for AI failures

### Phase 6: Generation Endpoints (Week 3)

1. Create studioSession generation trigger endpoint
2. Implement generation status polling endpoint
3. Build generated image CRUD endpoints
4. Add image regeneration endpoint
5. Create download endpoints (single & bulk ZIP)
6. Test generation workflows end-to-end

### Phase 7: Image Upload & Management (Week 4)

1. Implement single image upload endpoint
2. Create multiple image upload endpoint
3. Add image detail endpoint
4. Build image delete endpoint
5. Integrate R2 streaming upload
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
      limit: 50,
    },
  });
}
```

### ✅ Good: Proper Error Handling

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createStudioSessionSchema.parse(body);

    const studioSession = await db.studioSessions.create(validated);

    return NextResponse.json({ data: studioSession }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          type: 'https://api.example.com/errors/validation-error',
          title: 'Validation Failed',
          status: 422,
          detail: 'Invalid request body',
          errors: error.errors,
        },
        { status: 422 }
      );
    }

    throw error; // Caught by global error handler
  }
}
```

### ✅ Good: Client-Scoped Queries

```typescript
export async function GET(request: Request) {
  const session = await getSession(request);

  // Always scope to user's client
  const products = await db.products.findMany({
    where: eq(products.clientId, session.clientId),
  });

  return NextResponse.json({ data: products });
}
```

### ❌ Bad: Missing Authorization

```typescript
// ❌ No auth check - anyone can access
export async function GET(request: Request) {
  const products = await db.products.findMany(); // Returns ALL products
  return NextResponse.json(products);
}

// ✅ Proper auth and scoping
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const products = await db.products.findMany({
    where: eq(products.clientId, session.clientId),
  });

  return NextResponse.json({ data: products });
}
```

### ❌ Bad: Inconsistent Response Format

```typescript
// ❌ Mixing response formats
export async function GET() {
  return NextResponse.json(products); // Just array
}

export async function POST() {
  return NextResponse.json({ success: true, data: product }); // Different shape
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

- ✅ Cursor: Handles real-time data (generated images)
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

## New API Endpoints (2026-01-18)

The following new endpoint sections have been added based on design decisions.

### Store Connection Endpoints

```typescript
// Connect Store (OAuth initiation)
POST /api/v1/store/connect
Request: { storeType: 'woocommerce' | 'shopify' | 'bigcommerce', storeUrl: string }
Response: { authUrl: string, state: string }

// OAuth Callback
GET /api/v1/store/callback
Query: { code: string, state: string }
Response: Redirect to /settings/store

// Get Store Connection
GET /api/v1/store
Response: {
  data: {
    id: string,
    storeType: string,
    storeUrl: string,
    storeName: string,
    status: 'active' | 'disconnected' | 'error',
    lastSyncAt: string,
    productCount: number
  } | null
}

// Disconnect Store
DELETE /api/v1/store
Response: { success: true }

// Sync Status
GET /api/v1/store/sync-status
Response: {
  data: {
    totalProducts: number,
    productsWithGenerations: number,
    approvedAssets: number,
    syncedAssets: number,
    pendingSync: number,
    lastSyncAt: string
  }
}
```

### Product Import Endpoints

```typescript
// Import from Store
POST /api/v1/import/store
Request: {
  method: 'by_ids' | 'by_category' | 'all',
  productIds?: string[],
  categoryIds?: string[]
}
Response: {
  data: { jobId: string, expectedCount: number }
}

// Import from CSV
POST /api/v1/import/csv
Content-Type: multipart/form-data
Request: { file: File }
Response: {
  data: {
    parsedRows: number,
    detectedColumns: string[],
    preview: Array<Record<string, string>>
  }
}

// Confirm CSV Import
POST /api/v1/import/csv/confirm
Request: {
  columnMapping: Record<string, string>,
  skipRows: number[]
}
Response: {
  data: { jobId: string, expectedCount: number }
}

// Import Job Status
GET /api/v1/import/jobs/{jobId}
Response: {
  data: {
    status: 'pending' | 'processing' | 'completed' | 'failed',
    progress: number,
    imported: number,
    failed: number,
    errors: Array<{ row: number, error: string }>
  }
}
```

### Store Sync Endpoints

```typescript
// List Products with Sync Status
GET /api/v1/store/products
Query: { status?: 'synced' | 'pending' | 'not_generated', search?: string }
Response: {
  data: Array<{
    productId: string,
    name: string,
    sku: string,
    generatedCount: number,
    approvedCount: number,
    syncedCount: number,
    pendingCount: number
  }>,
  pagination: { ... }
}

// Get Product Sync Detail
GET /api/v1/store/products/{productId}/sync
Response: {
  data: {
    product: { id, name, sku },
    assets: Array<{
      id: string,
      thumbnailUrl: string,
      status: 'not_approved' | 'approved' | 'synced' | 'removed',
      syncedAt?: string,
      storeImageId?: string,
      canRemoveFromStore: boolean
    }>
  }
}

// Sync Approved Assets
POST /api/v1/store/sync
Request: { assetIds?: string[], syncAll?: boolean }
Response: {
  data: { jobId: string, assetsToSync: number }
}

// Remove from Store
DELETE /api/v1/store/assets/{assetId}
Response: {
  data: { success: true, removedAt: string }
}

// Sync History
GET /api/v1/store/history
Query: { productId?: string, limit?: number }
Response: {
  data: Array<{
    id: string,
    assetId: string,
    productId: string,
    action: 'upload' | 'update' | 'delete',
    status: 'success' | 'failed',
    timestamp: string,
    error?: string
  }>
}
```

### Credit Endpoints

```typescript
// Get Credit Balance
GET /api/v1/credits
Response: {
  data: {
    balance: number,
    subscription: {
      plan: string,
      includedCredits: number,
      periodEnd: string
    }
  }
}

// Get Credit Packages
GET /api/v1/credits/packages
Response: {
  data: Array<{
    id: string,
    name: string,
    credits: number,
    price: number,
    pricePer: number
  }>
}

// Purchase Credits
POST /api/v1/credits/purchase
Request: { packageId: string }
Response: {
  data: { checkoutUrl: string, sessionId: string }
}

// Credit History
GET /api/v1/credits/history
Query: { limit?: number }
Response: {
  data: Array<{
    id: string,
    amount: number,
    type: 'subscription_grant' | 'purchase' | 'generation' | 'refund',
    reason: string,
    createdAt: string
  }>,
  pagination: { ... }
}
```

### Preset Endpoints

```typescript
// List Presets
GET /api/v1/presets
Response: {
  data: Array<{
    id: string,
    name: string,
    description?: string,
    settings: GenerationFlowSettings,
    thumbnailUrl?: string,
    isDefault: boolean,
    createdAt: string
  }>
}

// Create Preset
POST /api/v1/presets
Request: {
  name: string,
  description?: string,
  settings: GenerationFlowSettings,
  isDefault?: boolean
}
Response: { data: Preset }

// Update Preset
PATCH /api/v1/presets/{id}
Request: { name?: string, description?: string, settings?: GenerationFlowSettings, isDefault?: boolean }
Response: { data: Preset }

// Delete Preset
DELETE /api/v1/presets/{id}
Response: { success: true }

// Get Remembered Settings
GET /api/v1/settings/remembered
Query: { contextType: 'scene_type' | 'product' | 'category' | 'collection', contextId: string }
Response: {
  data: GenerationFlowSettings | null,
  meta: { context: string, lastUsed: string }
}
```

### Notification Endpoints

```typescript
// List Notifications
GET /api/v1/notifications
Query: { unreadOnly?: boolean, limit?: number }
Response: {
  data: Array<{
    id: string,
    type: string,
    title: string,
    message: string,
    data?: any,
    read: boolean,
    createdAt: string
  }>,
  meta: { unreadCount: number }
}

// Mark as Read
PATCH /api/v1/notifications/{id}/read
Response: { success: true }

// Mark All as Read
POST /api/v1/notifications/read-all
Response: { success: true, markedCount: number }

// Notification Preferences
GET /api/v1/notifications/preferences
Response: {
  data: {
    emailEnabled: boolean,
    generationComplete: boolean,
    syncComplete: boolean,
    creditsLow: boolean,
    weeklyDigest: boolean
  }
}

// Update Notification Preferences
PATCH /api/v1/notifications/preferences
Request: { [key: string]: boolean }
Response: { data: NotificationPreferences }
```

### Analytics Endpoints

```typescript
// Get Dashboard Stats
GET /api/v1/analytics/dashboard
Response: {
  data: {
    totalProducts: number,
    totalGenerations: number,
    creditsUsedThisMonth: number,
    creditsRemaining: number
  }
}

// Get Usage Over Time
GET /api/v1/analytics/usage
Query: { period: '7d' | '30d' | '90d' }
Response: {
  data: {
    generationsByDay: Array<{ date: string, count: number }>,
    creditsByDay: Array<{ date: string, amount: number }>
  }
}

// Get Top Performing Assets
GET /api/v1/analytics/top-assets
Query: { period: '7d' | '30d' | '90d', limit?: number }
Response: {
  data: Array<{
    assetId: string,
    productId: string,
    productName: string,
    thumbnailUrl: string,
    viewCount: number,
    uniqueVisitors: number
  }>
}
```

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
