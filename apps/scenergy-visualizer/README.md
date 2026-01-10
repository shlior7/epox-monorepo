# Scenergy Visualizer

A Next.js application for AI-powered product visualization using Google Gemini. Create professional product scenes with intelligent prompt building, multi-product batch generation, and organized asset management.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Entity Hierarchy](#entity-hierarchy)
- [S3 Folder Structure](#s3-folder-structure)
- [Features](#features)
- [Setup](#setup)
- [API Routes](#api-routes)
- [Services](#services)
- [Development](#development)
- [Testing](#testing)

---

## Overview

Scenergy Visualizer enables teams to generate AI product visualizations at scale. Key capabilities:

- **AI Image Generation**: Google Gemini integration for text-to-image generation
- **Product Analysis**: Automatic extraction of materials, colors, and style from product images
- **Chat-Based Workflow**: Conversational interface for iterative generation
- **Multi-Product Sessions**: Bulk generation across multiple products simultaneously
- **Organized Storage**: Hierarchical S3 storage with clients, products, and sessions
- **Favorites System**: Star and organize generated images per product

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 |
| UI | React 19, Radix UI, SCSS Modules |
| State | React Context (DataContext) |
| Storage | AWS S3 (or local filesystem) |
| AI | Google Gemini (gemini-2.5-flash-image) |
| Queue | In-memory + Redis (Upstash) |
| 3D | Babylon.js (GLB rendering) |

### Directory Structure

```text
apps/scenergy-visualizer/
├── app/                          # Next.js App Router
│   ├── api/                      # REST API routes
│   │   ├── visualization/        # Generation endpoints
│   │   ├── clients/              # Client CRUD
│   │   ├── upload/               # File uploads
│   │   └── download-image/       # Image downloads
│   ├── [clientId]/               # Client routes
│   │   ├── settings/             # Client settings page
│   │   ├── [productId]/          # Product routes
│   │   │   ├── settings/         # Product settings
│   │   │   └── [sessionId]/      # Chat view (main UI)
│   │   └── client-session/       # Multi-product sessions
│   ├── layout.tsx                # Root layout
│   └── AppProviders.tsx          # Context providers
│
├── components/
│   ├── ChatView/                 # Main chat interface
│   │   ├── ChatView.tsx          # Core chat component
│   │   ├── ChatInput.tsx         # Prompt input
│   │   ├── MessageBubble/        # Message rendering
│   │   └── GeneratedImage/       # Image display & actions
│   ├── NavigationDrawer/         # Sidebar navigation
│   │   ├── core/                 # Navigation state
│   │   └── views/                # Client/product/session lists
│   ├── modals/                   # Dialog components
│   └── PromptBuilder/            # Generation settings panel
│
├── lib/
│   ├── services/
│   │   ├── gemini/               # Google Gemini integration
│   │   ├── s3/                   # S3 storage operations
│   │   ├── visualization/        # Generation orchestration
│   │   └── redis/                # Job persistence
│   ├── contexts/
│   │   └── DataContext.tsx       # Global state management
│   ├── hooks/                    # Custom React hooks
│   └── types/                    # TypeScript definitions
│
└── public/
    └── uploads/                  # Temporary file uploads
```

### Data Flow

```text
User Input → ChatView → API Route → Visualization Service → Gemini AI
                                          ↓
                            Job Queue (Redis) ← Polling
                                          ↓
                                    S3 Storage
                                          ↓
                              DataContext Update → UI
```

---

## Entity Hierarchy

The application organizes data in a hierarchical structure:

```text
Client
├── name, description
├── createdAt, updatedAt
├── products[]
│   ├── Product
│   │   ├── name, description
│   │   ├── productImageIds[]        # Base product images
│   │   ├── modelFilename            # Optional GLB model
│   │   ├── favoriteGeneratedImages[]
│   │   │   └── { imageId, sessionId }
│   │   └── sessions[]
│   │       └── Session
│   │           ├── name
│   │           ├── selectedBaseImageId
│   │           └── messages[]
│   │               └── Message
│   │                   ├── role: "user" | "assistant"
│   │                   ├── parts[]
│   │                   │   ├── TextPart { type: "text", content }
│   │                   │   ├── ImagePart { type: "image", imageIds[], status }
│   │                   │   └── PromptSettingsPart { type: "prompt-settings", settings }
│   │                   ├── inspirationImageId (optional)
│   │                   └── timestamp
│   │
└── clientSessions[]               # Multi-product sessions
    └── ClientSession
        ├── name
        ├── productIds[]           # Products included
        ├── selectedBaseImages     # Map<productId, imageId>
        └── messages[]
```

### Key Types

```typescript
interface Client {
  id: string;
  name: string;
  description?: string;
  products: Product[];
  clientSessions: ClientSession[];
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  name: string;
  productImageIds: string[];
  modelFilename?: string;
  favoriteGeneratedImages: FavoriteImage[];
  sessions: Session[];
}

interface FavoriteImage {
  imageId: string;
  sessionId: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  timestamp: string;
  inspirationImageId?: string;
  baseImageId?: string;
}

interface ImageMessagePart {
  type: "image";
  imageIds: string[];
  status: "pending" | "generating" | "completed" | "error";
  progress?: number;
  metadata?: {
    prompt: string;
    settings: PromptSettings;
    productName: string;
  };
  jobId?: string;
}
```

---

## S3 Folder Structure

All data is stored in S3 with a consistent hierarchical structure:

```text
s3://{bucket}/
└── clients/
    └── {clientId}/
        ├── client.json                           # Client metadata (denormalized tree)
        │
        ├── products/
        │   └── {productId}/
        │       ├── product.json                  # Product metadata
        │       │
        │       ├── media/
        │       │   ├── images/
        │       │   │   ├── base/
        │       │   │   │   └── {imageId}.png     # Original product images
        │       │   │   └── preview/
        │       │   │       └── {imageId}.jpg     # Thumbnail previews
        │       │   └── models/
        │       │       └── {filename}.glb        # 3D models
        │       │
        │       └── sessions/
        │           └── {sessionId}/
        │               ├── chat.json             # Session messages
        │               └── media/
        │                   ├── generated-{uuid}.jpg    # Generated images
        │                   └── inspiration-{uuid}.jpg  # Inspiration images
        │
        └── sessions/                             # Client-level sessions (multi-product)
            └── {sessionId}/
                ├── chat.json                     # Multi-product chat messages
                └── media/
                    ├── generated-{uuid}.jpg
                    └── inspiration-{uuid}.jpg
```

### File Formats

| File | Format | Purpose |
|------|--------|---------|
| `client.json` | JSON | Full client tree with products and sessions |
| `product.json` | JSON | Product metadata and favorite images |
| `chat.json` | JSON | Array of session messages |
| Base images | PNG | Original uploaded product images |
| Previews | JPEG | Compressed thumbnails for fast loading |
| Generated | JPEG | AI-generated visualization images |
| Models | GLB | 3D product models |

### Path Generation

All S3 paths are generated through `lib/services/s3/paths.ts`:

```typescript
getClientPath(clientId)                    // clients/{clientId}/
getProductPath(clientId, productId)        // clients/{clientId}/products/{productId}/
getSessionPath(clientId, productId, sessionId)  // .../sessions/{sessionId}/
getProductImageBasePath(...)               // .../media/images/base/
getProductImagePreviewPath(...)            // .../media/images/preview/
getSessionMediaPath(...)                   // .../sessions/{sessionId}/media/
```

---

## Features

### Core Features

#### AI Image Generation
- **Gemini Integration**: Uses `gemini-2.5-flash-image` for high-quality generation
- **Product Analysis**: Extracts materials, colors, and style from product images
- **Multimodal Prompts**: Combines product images with inspiration references
- **Variant Generation**: Create multiple variations per prompt

#### Chat-Based Workflow
- **Conversational Interface**: Iterative generation through chat
- **Prompt Builder**: Configure scene, style, lighting, camera, props, mood
- **Real-time Status**: Progress tracking with 15-second polling
- **Base Image Selection**: Choose which product image to reference

#### Session Management
- **Single-Product Sessions**: Focused generation per product
- **Multi-Product Sessions**: Bulk generation across products
- **Message History**: Persistent chat with all generated images
- **Metadata Tracking**: Stores prompts and settings per generation

### Advanced Features

#### Favorites System
- Star any generated image from any session
- Favorites stored per product with session reference
- Browse favorites in gallery modal
- Batch download favorite images

#### Bulk Operations
- Multi-select products for batch generation
- Multi-select images for batch actions
- Bulk favorite/unfavorite
- Bulk download as ZIP

#### Multi-Product Sessions (Client Sessions)
- Generate images for multiple products with same prompt
- Each product uses its own base image
- Independent job tracking per product
- Results organized by product in chat

#### Navigation & Organization
- Hierarchical sidebar: Clients → Products → Sessions
- Multi-select toolbar for bulk actions
- Settings pages at client and product levels
- Quick navigation between sessions

#### 3D Model Support
- Upload GLB files for products
- Babylon.js-powered rendering
- Use 3D renders as base images

#### Local Development Mode
- Filesystem-based S3 mock (`NEXT_PUBLIC_S3_DRIVER=fs`)
- Auto-cleanup of temporary files
- No AWS credentials needed for testing

---

## Setup

### 1. Environment Configuration

Copy the environment template:

```bash
cp .env.example .env.local
```

Configure required variables:

```env
# Google Gemini AI (required)
GOOGLE_AI_STUDIO_API_KEY=your_api_key

# AWS S3 (required for production)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
NEXT_PUBLIC_S3_BUCKET_NAME=your-bucket-name
NEXT_PUBLIC_AWS_REGION=us-east-1

# Redis for job persistence (optional, uses Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 2. Get API Keys

#### Google AI Studio
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add to `.env.local` as `GOOGLE_AI_STUDIO_API_KEY`

### 3. Install Dependencies

```bash
yarn install
```

### 4. Run Development Server

```bash
yarn dev
```

### 5. Local S3 Mode (Testing)

For local development without AWS:

```env
NEXT_PUBLIC_S3_DRIVER=fs
NEXT_PUBLIC_LOCAL_S3_DIR=.local-s3
```

Each process gets an isolated folder, auto-cleaned on exit. Set `S3_FS_DISABLE_CLEANUP=true` to inspect files after runs.

---

## API Routes

### Visualization

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/visualization` | Queue a generation job |
| GET | `/api/visualization/[jobId]` | Poll job status |

### Image Generation

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/generate-images` | Single-product generation |
| GET | `/api/generate-images/[jobId]` | Poll generation status |
| POST | `/api/batch-generate-images` | Multi-product batch generation |

### File Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/upload` | Upload files (temp storage) |
| POST | `/api/download-image` | Download from S3 |
| POST | `/api/process-glb` | Validate GLB models |

### Client/Product/Session CRUD

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/clients` | List all clients |
| POST | `/api/clients/create` | Create client |
| GET/PUT/DELETE | `/api/clients/[clientId]` | Client operations |
| POST | `/api/clients/[clientId]/products` | Add product |
| DELETE | `/api/clients/[clientId]/products/[productId]` | Delete product |
| POST/PUT | `/api/clients/[clientId]/products/[productId]/sessions` | Session operations |
| POST | `/api/clients/[clientId]/sessions` | Create client session |

---

## Services

### GeminiService (`lib/services/gemini/`)

Handles all Google Gemini AI interactions:

- **Image Generation**: Text-to-image with product context
- **Product Analysis**: Extract materials, colors, style from images
- **Multimodal Prompts**: Combine images and text
- **Cost Optimization**: Token usage estimation

### S3 Service (`lib/services/s3/`)

Storage operations:

- **adapter.ts**: S3/filesystem abstraction
- **paths.ts**: Centralized path generation
- **storage-service.ts**: High-level CRUD operations
- **browser.ts**: Client-side URL utilities

### VisualizationService (`lib/services/visualization/`)

Generation orchestration:

- **service.ts**: Full pipeline coordination
- **queue.ts**: Redis-backed job queue
- **utils.ts**: Prompt construction helpers

### DataContext (`lib/contexts/DataContext.tsx`)

Global state management:

- Single source of truth for all data
- Optimistic updates for responsive UI
- S3 synchronization
- Race condition prevention with locks

---

## Development

### Project Scripts

```bash
yarn dev          # Development server
yarn dev:local    # Development with local S3
yarn build        # Production build
yarn start        # Production server
yarn clean        # Remove build artifacts
yarn lint         # Run linter
yarn type-check   # TypeScript validation
```

### Adding Presets

Edit `lib/constants.ts`:

```typescript
export const scenePresets = {
  'Studio': ['Studio Set', 'Product Podium', 'Infinity Curve'],
  'Outdoor': ['Natural Garden', 'Urban Street', 'Beach Setting'],
};
```

### Creating Components

Follow established patterns:

```tsx
// components/MyComponent/MyComponent.tsx
import styles from './MyComponent.module.scss';

interface Props {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: Props) {
  return (
    <div className={styles.container}>
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
}
```

---

## Testing

### Unit Tests

```bash
yarn test              # Watch mode
yarn test:run          # Single run
yarn test:coverage     # With coverage report
yarn test:ui           # Vitest UI
```

### Visual/E2E Tests

```bash
yarn test:visual         # Playwright tests
yarn test:visual:debug   # Debug mode
```

### Test Configuration

Tests use local S3 mode automatically:

```env
NEXT_PUBLIC_S3_DRIVER=fs
NEXT_PUBLIC_LOCAL_S3_DIR=.test-s3
```

---

## Security

- API keys are server-side only (never in browser bundle)
- S3 bucket policies restrict access
- Rate limiting on generation endpoints
- Error messages sanitized (no sensitive data exposed)

---

## Troubleshooting

### Common Issues

#### "API key not found"
- Verify `.env.local` exists with valid keys
- Restart dev server after changes

#### "Generation failed"
- Check Gemini API quotas
- Verify network connectivity
- Review error in job status response

#### "S3 access denied"
- Verify AWS credentials
- Check bucket permissions
- Ensure region matches

#### "Job stuck in pending"
- Check Redis connection (if using)
- Verify background worker is running
- Check server logs for errors

### Debug Mode

Enable detailed logging:

```env
DEBUG=true
```

---

## Resources

- [Google Gemini Documentation](https://ai.google.dev/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [AWS S3 SDK](https://docs.aws.amazon.com/sdk-for-javascript/)
