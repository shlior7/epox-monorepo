# Codebase Structure

**Analysis Date:** 2026-01-28

## Directory Layout

```
epox-monorepo/
├── apps/                    # Production applications
│   ├── epox-platform/       # Main product platform (Next.js)
│   └── epox-admin/          # Admin dashboard (Next.js, legacy)
├── packages/                # Shared libraries
│   ├── visualizer-db/       # Database (Drizzle ORM, repositories)
│   ├── visualizer-ai/       # AI services (Gemini, analysis)
│   ├── visualizer-auth/     # Authentication (Better Auth)
│   ├── visualizer-storage/  # Object storage (R2/S3)
│   ├── visualizer-types/    # Shared TypeScript types
│   ├── visualizer-services/ # Business logic services
│   ├── scenergy-monitoring/ # Queue monitoring dashboard
│   └── design-system/       # UI component library
├── services/                # Background workers & microservices
│   ├── generation-worker/   # AI generation job processor
│   ├── worker-autoscaler/   # Worker scaling logic
│   ├── erp-service/         # E-commerce integrations
│   └── supabase-service/    # Supabase utilities
├── docs/                    # Documentation
├── design-log/              # Design decision records
├── scripts/                 # Utility scripts
├── .claude/                 # Claude AI project rules
├── .github/                 # GitHub Actions CI/CD
├── turbo.json               # Turborepo build config
├── package.json             # Root workspace config
└── .nvmrc                   # Node.js version (22.17.0)
```

## Directory Purposes

**`apps/epox-platform/`**
- Purpose: Main customer-facing product visualization platform
- Contains: Next.js App Router pages, React components, API routes
- Key files:
  - `app/layout.tsx` - Root layout
  - `app/api/` - REST API routes (generation, products, collections, store, auth)
  - `components/` - Feature components (studio, collections, store, auth, wizard)
  - `components/ui/` - Reusable UI primitives (Radix-based)
  - `lib/security/` - Auth middleware, SSRF protection
  - `lib/services/` - Service integrations (db, gemini, storage)
  - `lib/hooks/` - Custom React hooks (useJobStatus, useProductActions)
  - `__tests__/` - Unit tests (`api/`), E2E tests (`e2e/`)

**`apps/epox-admin/`**
- Purpose: Admin dashboard for client management and batch operations
- Contains: Next.js pages, 3D visualization (Babylon.js), admin tools
- Key files:
  - `app/admin/` - Admin route tree
  - `app/api/` - Admin API endpoints
  - `components/ChatView/` - Chat interface components
  - `components/SceneStudioView/` - 3D scene editor
  - `lib/contexts/` - React contexts (DataContext, ThemeContext)
  - `lib/services/` - Redis, visualization queue, image processing

**`packages/visualizer-db/`**
- Purpose: Database access layer with repository pattern
- Contains: Drizzle ORM client, 25+ repositories, schema definitions
- Key files:
  - `src/client.ts` - DB connection (pooled, Neon + local PG support)
  - `src/facade.ts` - DatabaseFacade singleton (lazy proxy)
  - `src/repositories/` - Entity repositories (products, collections, users, generation-jobs, etc.)
  - `src/repositories/base.ts` - BaseRepository with getById, requireById, delete
  - `src/schema/` - Drizzle table definitions
  - `src/__tests__/` - Repository integration tests
  - `drizzle/` - SQL migration files
  - `docker-compose.yml` - Local PostgreSQL 16

**`packages/visualizer-ai/`**
- Purpose: AI service abstraction (Google Gemini, Anthropic)
- Contains: AI client wrappers, rate limiting, cost tracking
- Key files:
  - `src/gemini-service.ts` - Google Gemini API client
  - `src/generation-queue/` - Job enqueueing facade
  - `src/product-analysis/` - Product image analysis
  - `src/rate-limit.ts` - In-memory rate limiter
  - `src/rate-limit-redis.ts` - Redis-based rate limiter
  - `src/cost-tracker.ts` - AI operation cost tracking
  - `src/config.ts` - Model configurations

**`packages/visualizer-auth/`**
- Purpose: Authentication framework (Better Auth)
- Contains: Auth configuration, session management

**`packages/visualizer-storage/`**
- Purpose: Object storage abstraction (R2/S3)
- Contains: Storage adapters, URL utilities
- Key files: `src/adapters/r2.ts`, `src/url-utils.ts`

**`services/generation-worker/`**
- Purpose: Background worker for AI generation jobs
- Contains: Job polling loop, generation execution, health server
- Key files:
  - `src/index.ts` - Entry point with health server (port 8080)
  - `src/worker.ts` - Job processing logic
  - `src/logger.ts` - Pino + Better Stack logging
  - `src/rate-limiter.ts` - Worker rate limiting

**`services/erp-service/`**
- Purpose: E-commerce platform integrations
- Contains: WooCommerce and Shopify providers
- Key files: `src/providers/woocommerce/`, `src/providers/shopify/`

## Key File Locations

**Entry Points:**
- `apps/epox-platform/app/layout.tsx` - Main app root layout
- `apps/epox-admin/app/admin/` - Admin app routes
- `services/generation-worker/src/index.ts` - Worker entry point

**Configuration:**
- `tsconfig.json` - TypeScript configuration (root + per workspace)
- `turbo.json` - Turborepo pipeline config
- `.eslintrc.js` - Linting rules
- `.prettierrc.json` - Formatting rules
- `packages/visualizer-db/drizzle.config.ts` - ORM config

**Core Logic:**
- `packages/visualizer-db/src/repositories/` - All data access (25+ repositories)
- `packages/visualizer-ai/src/gemini-service.ts` - AI service
- `apps/epox-platform/lib/security/middleware.ts` - Security wrappers
- `apps/epox-platform/app/api/` - REST API routes

**Testing:**
- `apps/epox-platform/__tests__/api/` - API unit tests (18 files)
- `apps/epox-platform/__tests__/e2e/` - Playwright E2E tests (11 files)
- `packages/visualizer-db/src/__tests__/repositories/` - DB tests (19 files)
- `apps/epox-admin/__tests__/` - Admin tests

## Naming Conventions

**Files:**
- `kebab-case.ts` for utilities, services, repositories (e.g., `url-validator.ts`)
- `PascalCase.tsx` for React components (e.g., `ImageEditorModal.tsx`)
- `use-kebab-case.ts` for hooks (e.g., `use-job-status.ts`)
- `route.ts` for Next.js API routes
- `page.tsx` for Next.js pages
- `*.test.ts` or `*.spec.ts` for test files

**Directories:**
- `kebab-case` for all directories
- PascalCase for component feature directories (e.g., `ChatView/`, `SceneStudioView/`)
- `__tests__/` for test directories

**Special Patterns:**
- `index.ts` for barrel exports
- `types.ts` for type definitions
- `constants.ts` for constants
- `[param]` for Next.js dynamic routes

## Where to Add New Code

**New API Endpoint:**
- Route: `apps/epox-platform/app/api/{resource}/route.ts`
- Security: Wrap with `withSecurity()` from `lib/security/middleware.ts`
- Tests: `apps/epox-platform/__tests__/api/{resource}.test.ts`

**New Repository:**
- Implementation: `packages/visualizer-db/src/repositories/{name}.ts`
- Schema: `packages/visualizer-db/src/schema/{name}.ts`
- Register in facade: `packages/visualizer-db/src/facade.ts`
- Tests: `packages/visualizer-db/src/__tests__/repositories/{name}.test.ts`

**New UI Component:**
- Feature: `apps/epox-platform/components/{feature}/{ComponentName}.tsx`
- UI primitive: `apps/epox-platform/components/ui/{component-name}.tsx`
- Add `data-testid` attribute

**New Background Service:**
- Implementation: `services/{service-name}/src/`
- Entry point: `services/{service-name}/src/index.ts`
- Package.json with workspace config

**New Shared Package:**
- Implementation: `packages/{package-name}/src/`
- Add to root `package.json` workspaces

## Special Directories

**`.planning/`**
- Purpose: Project planning documents
- Source: Generated by codebase mapping
- Committed: Yes

**`docs/`**
- Purpose: Developer documentation (architecture, features, testing)
- Committed: Yes

**`design-log/`**
- Purpose: Design decision records and implementation notes
- Committed: Yes

**`.next/` (per app)**
- Purpose: Next.js build output
- Source: Generated by build
- Committed: No (gitignored)

---

*Structure analysis: 2026-01-28*
*Update when directory structure changes*
