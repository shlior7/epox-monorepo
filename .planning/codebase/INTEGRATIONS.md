# External Integrations

**Analysis Date:** 2026-01-28

## APIs & External Services

**AI/ML Providers:**
- Google Gemini API - Primary AI for image generation, editing, analysis
  - SDK/Client: `@google/genai` 1.33.0 (`packages/visualizer-ai/src/gemini-service.ts`)
  - Models: `gemini-3-pro-image-preview`, `gemini-2.5-flash-image`, `gemini-2.5-flash-lite`
  - Config: `packages/visualizer-ai/src/config.ts`
  - Auth: `GOOGLE_AI_STUDIO_API_KEY` env var (or Vertex AI mode with `GOOGLE_CLOUD_PROJECT`)
  - Rate limiting: `packages/visualizer-ai/src/rate-limit.ts`, `rate-limit-redis.ts`
  - Cost tracking: `packages/visualizer-ai/src/cost-tracker.ts`

- Anthropic Claude - Secondary AI provider
  - SDK/Client: `@anthropic-ai/sdk` 0.27.0 (`packages/visualizer-ai/package.json`)
  - Auth: `ANTHROPIC_API_KEY` env var

**Image Search:**
- Unsplash API - Inspiration imagery search
  - Endpoint: `apps/epox-admin/app/api/unsplash/search/route.ts`
  - Auth: `UNSPLASH_ACCESS_KEY` env var
  - Fallback: Mock data when key not configured

## Data Storage

**Databases:**
- PostgreSQL 16 - Primary data store
  - Connection: `DATABASE_URL` env var
  - Client: Drizzle ORM 0.38.3 (`packages/visualizer-db/src/client.ts`)
  - Serverless driver: `@neondatabase/serverless` 0.10.4
  - Migrations: Drizzle Kit in `packages/visualizer-db/drizzle/`
  - Schema: `packages/visualizer-db/src/schema/`
  - Local dev: Docker Compose (`packages/visualizer-db/docker-compose.yml`)

- Supabase (optional) - Database + auth + real-time
  - SDK: `@supabase/supabase-js` 2.50.0 (`services/supabase-service/package.json`)
  - Auth: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**File Storage:**
- Cloudflare R2 - Primary object storage (S3-compatible)
  - Adapter: `packages/visualizer-storage/src/adapters/r2.ts`
  - CDN: `pub-b173dd19ec2840a5b068d4748260373f.r2.dev`
  - Auth: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

- AWS S3 - Alternative/legacy storage
  - SDK: `@aws-sdk/client-s3` 3.921.0
  - Presigned URLs: `@aws-sdk/s3-request-presigner` 3.840.0
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

**Caching & Queues:**
- Redis (IORedis 5.4.2)
  - Rate limiting: `apps/epox-admin/lib/middleware/rate-limiter.ts`
  - Job queues: `apps/epox-admin/lib/services/visualization/queue.ts`
  - Auth: `REDIS_URL` env var

- Upstash Redis - Serverless Redis
  - Auth: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

- BullMQ 5.34.8 - Task queue framework
  - Dashboard: `packages/scenergy-monitoring/` (Bull Board)

## Authentication & Identity

**Auth Provider:**
- Better Auth 1.4.7 - Authentication framework (`packages/visualizer-auth/`)
  - Implementation: `packages/visualizer-auth/src/`
  - API routes: `apps/epox-platform/app/api/auth/[...all]/route.ts`
  - Session management: Cookie-based sessions
  - Auth: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` env vars

## E-Commerce Integrations

**WooCommerce:**
- REST API integration via `@woocommerce/woocommerce-rest-api` 1.0.1
  - Provider: `services/erp-service/src/providers/woocommerce/`
  - OAuth flow: `apps/epox-platform/app/api/store-connection/woocommerce/authorize/route.ts`
  - Callback: `apps/epox-platform/app/api/store-connection/woocommerce/callback/route.ts`
  - Features: Product import, category fetch, inventory sync

**Shopify:**
- OAuth integration
  - Provider: `services/erp-service/src/providers/shopify/`
  - OAuth flow: `apps/epox-platform/app/api/store-connection/shopify/authorize/route.ts`
  - Callback: `apps/epox-platform/app/api/store-connection/shopify/callback/route.ts`
  - Webhooks: `apps/epox-platform/app/api/webhooks/store/[connectionId]/route.ts`

## Monitoring & Observability

**Error Tracking:**
- Sentry - Client and server error tracking
  - Next.js: `@sentry/nextjs` 10.32.1 (`apps/epox-platform/sentry.*.config.ts`)
  - Node.js: `@sentry/node` 10.32.1 (`services/generation-worker/src/logger.ts`)
  - DSN: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` env vars
  - Config: 100% error capture, 10% transaction sampling, session replays

**Logging:**
- Better Stack (Logtail) - Centralized log aggregation
  - Integration: `@logtail/pino` 0.5.0 (`services/generation-worker/src/logger.ts`)
  - Auth: `BETTERSTACK_TOKEN` env var

- Pino 9.6.0 - Structured logging framework
  - Pretty print in dev: `pino-pretty` 11.0.0

## Environment Configuration

**Development:**
- Required: `DATABASE_URL`, `GOOGLE_AI_STUDIO_API_KEY`, `BETTER_AUTH_SECRET`
- Optional: `REDIS_URL`, `UNSPLASH_ACCESS_KEY`, `SENTRY_DSN`
- Secrets location: `.env.local` per workspace (gitignored)
- Local DB: Docker PostgreSQL on port 5432

**Production:**
- Database: Neon serverless PostgreSQL
- Storage: Cloudflare R2
- Secrets: Environment variables on deployment platform
- Monitoring: Sentry + Better Stack

## Webhooks & Callbacks

**Incoming:**
- Store webhooks - `/api/webhooks/store/[connectionId]`
  - Verification: Connection-specific validation
  - Events: Product updates, inventory changes

**Outgoing:**
- Not detected

---

*Integration audit: 2026-01-28*
*Update when adding/removing external services*
