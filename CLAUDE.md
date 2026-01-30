# Epox Monorepo — Claude Code Context

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any task in this codebase. When working with Next.js, Drizzle, Better Auth, Radix UI, or any framework listed below, READ the referenced docs/files before relying on training data. Training data may be outdated or wrong for these versions.

## Stack & Versions (ground truth — do NOT assume different APIs)

| Layer | Tech | Version | Key gotchas vs training data |
|-------|------|---------|------------------------------|
| Framework | Next.js | 16.1.1 | App Router only. `next.config.js` (not `.mjs`). Server Actions with `"use server"`. Standalone output. |
| React | React | 19.1.0 | `use()` hook, Server Components default, `useActionState`, `useOptimistic`. |
| Language | TypeScript | 5.7.2 | Strict mode. `satisfies` operator. Bundler module resolution. |
| ORM | Drizzle | 0.38.3 | `drizzle-kit` 0.30.1. PostgreSQL dialect. Repository pattern used throughout. Use only repositories for db create new if needed |
| Database | PostgreSQL | — | Neon serverless in prod (`@neondatabase/serverless`), local `pg` in dev. |
| Auth | Better Auth | 1.4.7 | Session-based. `visualizer-auth` package wraps it. |
| UI | Radix UI | latest | Headless primitives. Composed with Tailwind. |
| Styling | Tailwind CSS | 3.4.17 | Design tokens via `@repo/design-system` preset. |
| Animation | Framer Motion | 11.11.17 | Use `motion` import. |
| Forms | React Hook Form | 7.49.2 | With Zod 3.22.4 resolvers. |
| Server State | TanStack Query | 5.17.0 | `queryOptions` API. Optimistic updates via hooks. |
| Icons | Lucide React | 0.552.0 | Named imports: `import { Icon } from "lucide-react"`. |
| Storage | AWS S3 (R2) | SDK v3 | Cloudflare R2 via S3 API. `visualizer-storage` package. |
| AI | Google GenAI | 0.27.0 / 1.33.0 | `visualizer-ai` package. Gemini for everything. |
| Monitoring | Sentry | 10.32.1 | `@sentry/nextjs`. See `.claude/rules/sentry.md` for patterns. |
| Testing | Vitest + Playwright | 3.2.4 / 1.57.0 | Vitest for unit/integration, Playwright for E2E. |
| Build | Turbo | 2.5.5 | Monorepo orchestration. `yarn turbo run <task>`. |
| Package Manager | Yarn | 4.12.0 | PnP disabled, node-modules linker. |

## Monorepo Structure

```
epox-monorepo/
├── apps/
│   ├── epox-platform/          # Main Next.js 16 app (client-facing)
│   │   ├── app/(auth)/         # Login, signup
│   │   ├── app/(dashboard)/    # Dashboard, products, collections, studio, settings
│   │   ├── app/api/            # API routes (products, collections, studio, jobs, AI, store)
│   │   ├── components/         # UI components (studio/, store/, wizard/, layout/)
│   │   ├── lib/                # api-client, hooks, services, security, contexts
│   │   └── __tests__/          # API tests (vitest) + E2E tests (playwright)
│   └── epox-admin/             # Admin app (Babylon.js 3D, Zustand, SCSS)
├── packages/
│   ├── visualizer-db/          # Drizzle ORM, schema, repositories, testkit
│   ├── visualizer-ai/          # AI integration (Anthropic + Google GenAI)
│   ├── visualizer-auth/        # Better Auth wrapper
│   ├── visualizer-client/      # JWT (jose), email (resend)
│   ├── visualizer-storage/     # S3/R2 abstraction
│   ├── visualizer-types/       # Shared domain types (domain, settings, messages, database)
│   ├── design-system/          # Tailwind preset + design tokens
│   └── scenergy-monitoring/    # BullMQ + Bull Board dashboard
├── services/
│   ├── generation-worker/      # Background image/video gen worker (Pino logging)
│   ├── erp-service/            # WooCommerce/Shopify integration
│   ├── supabase-service/       # DB management CLI
│   └── worker-autoscaler/      # Worker scaling
├── docs/                       # Project documentation (see index below)
└── design-log/                 # Design decision records
```

## Docs Index (read these files — do NOT guess APIs)

### Architecture
docs/architecture/{system-overview.md,shared-architecture.md}

### Plans & Design Logs (domain knowledge)
docs/plans/{000-product-requirements-overview.md,001-architecture-infrastructure.md,002-authentication-authorization.md,003-data-model-terminology.md,004-user-flows-journey.md,005-screens-ui-components.md,006-use-cases-scenarios.md,007-api-design.md,008-business-model-pricing.md}
docs/design-logs/{001-db-schema-typescript-generation.md,002-implementation-plan-migrations.md,003-store-connection-credentials-neon.md,004-postgres-job-queue.md,005-visualizer-ai-migration.md}
design-log/{0001-collection-asset-ownership.md,014-studio-ui-redesign.md,015-data-testid-coverage.md,016-hierarchical-generation-settings.md}

### Features (implemented)
docs/features/{optimistic-updates.md,backend-integration.md}
docs/features/bubble-system/{overview.md,implementation.md,complete-summary.md}

### Development
docs/development/{implementation-gaps.md,remaining-routes.md,migration-summary.md}

### Deployment & Ops
docs/deployment/{environment-variables.md,production-readiness.md,production-setup.md,performance-improvements.md}
docs/deployment/services/{generation-worker.md,worker-autoscaler.md}

### Testing
docs/testing/{local-testing-guide.md,unit-testing.md,playwright-setup-epox.md}
docs/testing/e2e/{testcontainers-guide.md,testing-guide.md,client-based-testing.md,feature-based-testing.md}

### Roadmap
docs/roadmap/{todo.md,whats-next.md,config-panel-status.md}

## Database Schema (Drizzle — read before writing queries)

packages/visualizer-db/src/schema/{index.ts,products.ts,sessions.ts,generated-images.ts,jobs.ts,auth.ts,store-sync.ts,categories.ts,analytics.ts,usage.ts,user-settings.ts}

## Repository Pattern (read before adding DB methods)

packages/visualizer-db/src/repositories/{index.ts,base.ts,products.ts,collection-sessions.ts,generation-flows.ts,generation-jobs.ts,generated-assets.ts,categories.ts,clients.ts,members.ts,users.ts,store-connections.ts,store-sync-logs.ts,product-images.ts,favorite-images.ts,accounts.ts,invitations.ts,chat-sessions.ts,messages.ts,admin-users.ts,ai-cost-tracking.ts,usage.ts,user-settings.ts}

Every new repository method MUST have tests in: packages/visualizer-db/src/__tests__/repositories/

## Domain Types (read before defining new types)

packages/visualizer-types/src/{domain.ts,settings.ts,database.ts,index.ts,bubble-utils.ts}

## API Routes (read before adding/modifying endpoints)

apps/epox-platform/app/api/{products/,collections/,studio/,jobs/,categories/,art-director/,download-image/,local-s3/}

## Key Patterns to Follow

### API Routes
- SQL-level filtering/sorting/pagination (never fetch-all-then-filter in JS)
- Input validation with Zod at API boundary
- Proper HTTP status codes (400/404/500)
- Client-scoped queries (always filter by clientId)

### Frontend Components
- Every component/section/card/button gets a unique `data-testid`
- Use Radix primitives + Tailwind (not custom CSS)
- Optimistic updates via TanStack Query mutation hooks
- Use `lib/api-client.ts` for all API calls

### Database
- Repository pattern: add methods to the appropriate repository file
- Use Drizzle query builder, not raw SQL
- Test with `packages/visualizer-db/src/testkit.ts` helpers

### Testing
- Vitest for unit/integration: `yarn test` from package dir
- Playwright E2E: `yarn test:e2e` from `apps/epox-platform`
- Script-first, screenshot-last (see `.claude/rules/playwright-verification.md`)
- Test clients: `test-client-main` / `test-client-secondary`

## Commands

```bash
# Dev
cd apps/epox-platform && yarn dev          # Start platform
cd packages/visualizer-db && yarn db:push  # Push schema
cd packages/visualizer-db && yarn db:studio # Drizzle Studio

# Test
cd apps/epox-platform && yarn test         # Unit tests
cd apps/epox-platform && yarn test:e2e     # E2E tests
cd packages/visualizer-db && yarn test     # DB repo tests

# Build
yarn turbo run build                       # Build all
yarn turbo run typecheck                   # Type check all
```

## Behavioral Rules

- Context compaction is enabled — do not stop tasks early due to token budget. Save progress before context refresh.
- Read and understand files before editing. Never speculate about code you haven't opened.
- Avoid over-engineering. Minimum complexity for the current task. No speculative abstractions.
- Follow the design log methodology: check `design-log/` before major changes, create design log first for new features.
- Reuse existing abstractions. Follow DRY. Check what already exists before creating new utilities.
- For frontend: avoid generic "AI slop" aesthetics. Choose distinctive typography, cohesive color themes, meaningful animations. No Inter/Roboto/Arial. Use Framer Motion for React animations.
- General-purpose solutions only. No hard-coded values or test-specific workarounds.
- Subagents only when the task clearly benefits from a separate context window.
- **Terminology: "Bubble" is internal-only.** In all user-facing UI text (labels, titles, descriptions, tooltips, toasts), use "Generation Setting(s)" instead of "Bubble(s)". The code and types still use `Bubble`/`BubbleValue`/`BubbleType` internally — only rename the display strings.
