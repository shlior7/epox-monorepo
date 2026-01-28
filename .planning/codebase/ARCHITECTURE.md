# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Monorepo with Layered Architecture + Background Workers

**Key Characteristics:**
- Yarn Workspaces monorepo with Turbo build orchestration
- Next.js App Router for frontend and API layer
- Shared packages for cross-cutting concerns (DB, AI, Auth, Storage)
- Background workers for long-running AI generation jobs
- Repository pattern with Database Facade for data access

## Layers

**Presentation Layer (Frontend):**
- Purpose: User interface for product visualization and management
- Contains: React components, pages, client-side hooks
- Location: `apps/epox-platform/app/`, `apps/epox-platform/components/`
- Depends on: API layer via React Query
- Used by: End users (browser)

**API Layer (Route Handlers):**
- Purpose: REST API endpoints with security middleware
- Contains: Next.js route handlers, request validation, response formatting
- Location: `apps/epox-platform/app/api/`
- Depends on: Security layer, Service layer
- Used by: Frontend (React Query), external webhooks

**Security Layer:**
- Purpose: Authentication, authorization, SSRF protection
- Contains: Middleware wrappers, auth checks, URL validation
- Location: `apps/epox-platform/lib/security/`
- Key files: `middleware.ts` (`withSecurity`, `withPublicSecurity`), `auth.ts`, `url-validator.ts`
- Depends on: Auth package (Better Auth)
- Used by: All API routes

**Service Layer:**
- Purpose: Business logic orchestration
- Contains: AI service wrappers, storage operations, data transformations
- Location: `apps/epox-platform/lib/services/`, `packages/visualizer-ai/src/`, `packages/visualizer-storage/src/`
- Depends on: Data access layer, external APIs
- Used by: API layer, Worker layer

**Data Access Layer:**
- Purpose: Database operations via repository pattern
- Contains: 25+ entity repositories, Drizzle ORM schema, migrations
- Location: `packages/visualizer-db/src/`
- Key files: `client.ts` (connection), `facade.ts` (DatabaseFacade singleton), `repositories/base.ts`
- Depends on: PostgreSQL
- Used by: All layers needing data

**Worker Layer:**
- Purpose: Background processing for AI generation jobs
- Contains: Job polling, generation execution, result storage
- Location: `services/generation-worker/src/`
- Key files: `index.ts` (entry + health server), `worker.ts` (job processing)
- Depends on: Data access layer, AI service, storage
- Used by: Triggered by job queue (DB-based)

## Data Flow

**Image Generation Request:**

1. User configures generation in studio UI (`apps/epox-platform/components/studio/`)
2. React component calls API via React Query mutation
3. API route validates request via `withSecurity()` wrapper (`lib/security/middleware.ts`)
4. Route handler creates generation job in DB (`db.generationJobs.create()`)
5. Generation worker polls for pending jobs (`services/generation-worker/src/worker.ts`)
6. Worker calls Gemini API via `GeminiService` (`packages/visualizer-ai/src/gemini-service.ts`)
7. Results uploaded to R2/S3 (`packages/visualizer-storage/`)
8. Worker updates job status and creates asset records in DB
9. Frontend polls for completion via React Query

**API Request Lifecycle:**

1. HTTP request hits Next.js route handler
2. `withSecurity()` authenticates via Better Auth session
3. Security context provides `clientId`, `userId`
4. Route handler validates input (manual checks or Zod)
5. Calls service/repository methods via `db` facade
6. Returns JSON response

**State Management:**
- Server state: React Query (TanStack) for data fetching/caching
- Client state: Zustand for UI state (`apps/epox-admin`)
- Database: PostgreSQL as source of truth
- Queue: DB-based job queue (polled by workers)

## Key Abstractions

**BaseRepository:**
- Purpose: Generic CRUD operations for database entities
- Location: `packages/visualizer-db/src/repositories/base.ts`
- Pattern: Template method pattern with `getById`, `requireById`, `delete`
- Examples: `ProductRepository`, `GenerationFlowRepository`, `CollectionSessionRepository`

**DatabaseFacade:**
- Purpose: Single entry point to all repositories
- Location: `packages/visualizer-db/src/facade.ts`
- Pattern: Facade with lazy-initialized proxy
- Usage: `db.products.create()`, `db.users.getById()`, `db.generatedAssets.list()`

**Security Middleware:**
- Purpose: Wrap API routes with authentication and authorization
- Location: `apps/epox-platform/lib/security/middleware.ts`
- Pattern: Higher-order function returning route handler with `SecurityContext`
- Variants: `withSecurity()`, `withPublicSecurity()`, `withGenerationSecurity()`, `withUploadSecurity()`

**GeminiService:**
- Purpose: Wrapper for Google Gemini AI API
- Location: `packages/visualizer-ai/src/gemini-service.ts`
- Pattern: Service class with rate limiting and cost tracking

## Entry Points

**epox-platform (Main App):**
- Location: `apps/epox-platform/app/layout.tsx` (root layout)
- Triggers: Browser navigation, HTTP requests
- Responsibilities: Render UI, handle API requests, manage auth sessions
- Start: `yarn dev` from workspace

**generation-worker:**
- Location: `services/generation-worker/src/index.ts`
- Triggers: Process start, job polling loop
- Responsibilities: Poll DB for pending jobs, execute AI generation, upload results
- Health: HTTP server on port 8080 at `/health`

**epox-admin (Legacy Admin):**
- Location: `apps/epox-admin/app/admin/` (route tree)
- Triggers: Browser navigation
- Responsibilities: Admin dashboard, client management, batch operations

## Error Handling

**Strategy:** Middleware-level error catching with structured JSON responses

**Patterns:**
- `withSecurity()` catches errors and returns appropriate HTTP status codes
- Repositories throw `NotFoundError` for missing entities (`packages/visualizer-db/src/errors.ts`)
- API routes validate input and return 400 with descriptive messages
- Worker has retry logic for transient failures
- Sentry captures unhandled exceptions

## Cross-Cutting Concerns

**Logging:**
- Pino logger for structured JSON logging
- Better Stack (Logtail) transport for production
- Security-specific logging: `apps/epox-platform/lib/security/logging.ts`

**Validation:**
- Zod schemas at API boundary for form data
- Manual validation in route handlers (type checks, required fields)
- SSRF protection: URL validation for external URLs (`lib/security/url-validator.ts`)

**Authentication:**
- Better Auth sessions via cookies
- `withSecurity()` middleware on all protected routes
- Resource ownership verification (user can only access their client's data)

**Rate Limiting:**
- In-memory rate limiting: `packages/visualizer-ai/src/rate-limit.ts`
- Redis-based rate limiting: `packages/visualizer-ai/src/rate-limit-redis.ts`
- Middleware: `apps/epox-admin/lib/middleware/rate-limiter.ts`

---

*Architecture analysis: 2026-01-28*
*Update when major patterns change*
