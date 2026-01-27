# Scenergy Visualizer Architecture Overview

This document condenses the scattered implementation notes into a single reference for developers and agents working on the `apps/scenergy-visualizer` Next.js application

## Application At A Glance

- AI-assisted product visualization workspace for creative teams.
- Built with Next.js App Router + TypeScript; runs entirely in the `apps/scenergy-visualizer` package.
- Uses Google Gemini for image generation and Magnific for optional upscaling.
- Persists all business data and assets directly in S3; no traditional database.
- Provides chat-driven workflows, prompt presets, batch generation, and bulk media management.

## System Architecture

- **Client UI**: React components under `components/`, orchestrated by `ChatView` for day-to-day work.
- **State Layer**: `lib/contexts/DataContext.tsx` exposes CRUD helpers, backed by resilient sync utilities (`lib/state/transaction-manager.ts`, `lib/state/sync-manager.ts`).
- **Service Layer**: `lib/services/` encapsulates external APIs (Gemini, Magnific), storage (S3), the visualization orchestrator, and generation queues.
- **API Routes**: Next.js handlers in `app/api/` start generation jobs (`generate-images`, `batch-generate-images`) and expose polling endpoints.
- **Storage**: S3 bucket organized by client → product → session with JSON metadata plus media assets.
- **External Providers**: Gemini handles multimodal prompts; Magnific can upscale finished renders when enabled.

High-level flow:

```
User action → ChatView → DataContext (optimistic state) → API Route
  → Generation Queue → Gemini (± Magnific) → Upload to S3 → DataContext refresh
  → Chat/UI renders status, multi-select tools, downloads, favorites
```

## Data & Persistence Model

- **Hierarchy**: Clients contain products, products contain sessions. Client sessions span multiple products for bulk generation.
- **S3 Paths** (`lib/services/s3/client.ts`):
  - `clients/{clientId}/client.json` – denormalized tree for the client.
  - `clients/{clientId}/products/{productId}/media/` – product source assets.
  - `clients/{clientId}/products/{productId}/sessions/{sessionId}/chat.json` – ordered message history.
  - `.../media/generated-{uuid}.jpg` / `inspiration-{uuid}.jpg` – AI outputs & references.
- **State Sync**: `DataContext` keeps an in-memory cache; all mutations use the transaction manager for optimistic UI updates with rollback and locking. The sync manager queues operations to avoid race conditions and provides status hooks for UX feedback.
- **Identifiers**: IDs are UUIDs; components pass around IDs instead of entire objects to prevent stale references.

## Core Services & Workflows

### AI & Visualization

- `GeminiService` handles multimodal prompt construction, product analysis, and image generation (`lib/services/gemini/`).
- `VisualizationService` orchestrates cost-aware variant creation: builds prompts, sequenced Gemini calls, and (optionally) Magnific upscaling (`lib/services/visualization/`).
- `MagnificService` (currently disabled by default) upscales finished renders without blocking the main flow.

### Job Management

- `lib/services/image-generation/queue.ts` maintains in-memory job lifecycles (`pending → generating → completed/error`) with progress reporting.
- `/api/generate-images` enqueues single-product jobs; responds immediately with a `jobId`.
- `/api/generate-images/[jobId]` exposes job status for polling (15s in `ChatView` by default).
- `/api/batch-generate-images` fans out large workloads. It uses the generic `lib/utils/batch-processor.ts` to throttle request batches and report per-product success.
- Multi-product sessions create one assistant message per product, so each job reports independently in the UI.

### Storage Utilities

- `lib/services/s3/` centralizes all reads/writes, enforces path conventions, handles JSON serialization, and supports bulk image download URLs.
- `lib/services/s3/storage-service.ts` implements CRUD helpers used throughout `DataContext`.

## Frontend Experience

- **Entry Point**: `/app/[clientId]/settings/page.tsx` wires routing context and renders the workspace.
- **Chat Workspace** (`components/chat/ChatView.tsx`):
  - Sends prompts, uploads inspiration images, and triggers batch generation.
  - Polls job status, updates message bubbles, and manages optimistic session state.
  - Hosts the multi-select toolbar for bulk favorites/downloads.
- **Message Rendering**: `components/chat/MessageBubble.tsx` and `GeneratedImage.tsx` show generation progress, image actions, and metadata such as product names.
- **Prompt Builder** (`components/PromptBuilder.tsx`):
  - Controlled component exposing presets (scene, lighting, camera, variants).
  - Summarizes active settings as removable context chips.
- **Modals & Common UI**: Found under `components/modals/` and `components/common/` (client/product CRUD, confirmation flows, safe image loading).
- **Data Access**: Hooks derive slices from `DataContext`, ensuring components always fetch up-to-date entities by ID.

## Resilience & Scalability Highlights

- **Optimistic Transactions**: Transactions prevent race conditions when syncing chat messages, favorites, and session mutations.
- **Sync Visibility**: Sync manager exposes progress/error states so UX can disable actions or show retry messaging.
- **Batch Generation Safeguards**: Configurable batch size and inter-batch delays guard against Gemini rate limits.
- **Rate Limits**: API routes enforce per-client throttles (10 single jobs or 3 batch jobs per 5 minutes) to protect quotas.
- **Known Constraints**:
  - Jobs live in-process; restarts drop active work—migrate to Redis for persistence and horizontal scaling.
  - Polling scales linearly with users; migrate to SSE/WebSocket for high concurrency.
  - Adaptive polling & external queueing (Redis/BullMQ) are suggested first upgrades.

## Developer Operations

- **Setup**: Copy `.env.example` → `.env.local`, provide Gemini & Magnific keys plus S3 credentials, run `yarn install`, then `yarn dev`.
- **Testing**: `yarn test` runs Vitest suites (e.g., `lib/utils/__tests__/batch-processor.spec.ts`).
- **Linting/Formatting**: Use the repo-standard scripts (check `package.json` for available commands).
- **Logging**: Console logs annotate major operations (generation start, upload, sync). Keep logs meaningful—production uses them for support.
- **Key Env Vars**: `GOOGLE_AI_STUDIO_API_KEY`, `MAGNIFIC_API_KEY`, `NEXT_PUBLIC_AWS_*`, `NEXT_PUBLIC_S3_BUCKET_NAME`.

## File Map Quick Reference

- `components/chat/ChatView.tsx` — main workflow controller & polling logic.
- `components/chat/GeneratedImage.tsx` — handles per-image actions and multi-select decoration.
- `components/PromptBuilder.tsx` — prompt configuration panel and chip summary.
- `lib/contexts/DataContext.tsx` — S3-backed data store with optimistic mutations.
- `lib/services/gemini/` — Gemini integration, prompt helpers, cost estimation.
- `lib/services/visualization/service.ts` — prompt orchestration and variant lifecycle.
- `lib/services/image-generation/queue.ts` — in-memory job queue powering the APIs.
- `lib/services/s3/` — S3 client, path helpers, storage-service CRUD operations.
- `app/api/generate-images/route.ts` & `app/api/batch-generate-images/route.ts` — API entry points for single and bulk generation.

## Additional Notes

- This file replaces the legacy documentation set; treat it as the canonical starting point.
- When introducing new workflows, update the relevant section here so knowledge stays centralized.
