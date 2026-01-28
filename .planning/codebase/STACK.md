# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript 5.7.2 - All application code (`package.json`, `tsconfig.json`)

**Secondary:**
- JavaScript - Build scripts, config files (`.eslintrc.js`, `next.config.js`)

## Runtime

**Environment:**
- Node.js 22.17.0 (`.nvmrc`)
- ESM (ECMAScript Modules) enabled across packages

**Package Manager:**
- Yarn 4.12.0 (`package.json`)
- Lockfile: `yarn.lock` present
- Monorepo: Yarn Workspaces (`apps/`, `packages/`, `services/`)

## Frameworks

**Core:**
- Next.js 16.1.1 - Web framework with App Router (`apps/epox-platform`, `apps/epox-admin`)
- React 19.1.0 - UI framework (resolution pinned in root `package.json`)

**Testing:**
- Vitest 3.2.4 - Unit and integration tests
- Playwright 1.57.0 - E2E and visual tests
- `@vitest/coverage-v8` 3.2.4 - Coverage reporting

**Build/Dev:**
- Turbo 2.5.5 - Monorepo build orchestration (`turbo.json`)
- TypeScript 5.7.2 - Type checking and compilation
- TSX 4.21.0 - TypeScript execution without build step
- Drizzle Kit 0.30.1 - Database migration CLI

## Key Dependencies

**Critical:**
- Drizzle ORM 0.38.3 - Database access (`packages/visualizer-db`)
- Better Auth 1.4.7 - Authentication (`packages/visualizer-auth`)
- `@google/genai` 1.33.0 - Google Gemini AI API (`packages/visualizer-ai`)
- `@anthropic-ai/sdk` 0.27.0 - Anthropic Claude API (`packages/visualizer-ai`)
- `@aws-sdk/client-s3` 3.921.0 - Cloud storage (`packages/visualizer-storage`)
- IORedis 5.4.2 - Redis client for caching and queues
- BullMQ 5.34.8 - Redis-based task queue (`packages/scenergy-monitoring`)

**UI Libraries:**
- Radix UI - Comprehensive headless component library (15+ packages)
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Framer Motion 11.11.17 - Animation library
- Babylon.js 8.42.0 - 3D graphics engine (`apps/epox-admin`)
- Lucide React 0.552.0 - Icon library
- Class Variance Authority 0.7.0 - Component variant styling
- React Hook Form 7.49.2 + Zod 3.22.4 - Form handling and validation

**Infrastructure:**
- pg (node-postgres) 8.13.1 - PostgreSQL driver
- `@neondatabase/serverless` 0.10.4 - Serverless PostgreSQL driver
- Sharp 0.34.5 - Image processing
- Pino 9.6.0 - Structured logging
- `@sentry/nextjs` 10.32.1 - Error tracking (Next.js)
- `@sentry/node` 10.32.1 - Error tracking (Node.js)

**State Management:**
- React Query (TanStack) 5.17.0 - Server state (`apps/epox-platform`)
- Zustand 5.0.6 - Client state (`apps/epox-admin`)

## Configuration

**Environment:**
- `.env.local` files per workspace (gitignored)
- `dotenv` 17.2.3 for environment variable loading
- Key vars: `DATABASE_URL`, `GOOGLE_AI_STUDIO_API_KEY`, `SENTRY_DSN`, `REDIS_URL`, `AWS_*`, `R2_*`

**Build:**
- `next.config.js` - Next.js configuration with Turbopack
- `tsconfig.json` - TypeScript compiler (target: ES2022, strict: true)
- `turbo.json` - Build pipeline orchestration
- `tailwind.config.ts` - Styling configuration
- `drizzle.config.ts` - ORM migration configuration
- `vitest.config.ts` - Test runner per workspace
- `playwright.config.ts` - E2E test configuration

**Code Quality:**
- `.eslintrc.js` - Linting with TypeScript, perfectionist, unicorn plugins
- `.prettierrc.json` - Formatting (single quotes, 140 char width, trailing commas)
- `.editorconfig` - Editor settings (2 spaces, UTF-8, LF)
- `.lintstagedrc.js` - Pre-commit hooks with Prettier and Syncpack
- Lefthook 1.9.0 - Git hooks manager

## Platform Requirements

**Development:**
- macOS/Linux (any platform with Node.js 22+)
- Docker for local PostgreSQL (`packages/visualizer-db/docker-compose.yml`)
- Redis for queue/cache functionality

**Production:**
- PostgreSQL 16 (Neon serverless or self-hosted)
- Cloudflare R2 / AWS S3 for object storage
- Redis for queuing and rate limiting
- Sentry for error tracking
- Better Stack (Logtail) for log aggregation

---

*Stack analysis: 2026-01-28*
*Update after major dependency changes*
