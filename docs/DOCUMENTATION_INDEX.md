# Epox Monorepo - Complete Documentation Index

> **Last Updated:** 2026-01-26
>
> This index consolidates all documentation across the entire monorepo, organized by topic for easy navigation.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Features](#features-implemented)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Development Guides](#development-guides)
7. [Packages](#packages)
8. [Services](#services)
9. [What's Next](#whats-next)

---

## Quick Start

### For New Developers

1. **Read First:**
   - [System Architecture Overview](./docs/architecture/system-architecture.md)
   - [Getting Started Guide](./docs/development/getting-started.md)
   - [Environment Setup](./docs/deployment/environment.md)

2. **Setup Your Environment:**
   ```bash
   # Install dependencies
   yarn install

   # Setup database
   cd packages/visualizer-db
   yarn db:push

   # Start development server
   cd apps/epox-platform
   yarn dev
   ```

3. **Run Tests:**
   ```bash
   # Unit tests
   yarn test

   # E2E tests
   yarn test:e2e
   ```

### For Product Managers

- [Business Model & Pricing](./docs/README.md#business-model--pricing) - Design Log #008
- [User Flows & Journey](./docs/README.md#user-experience) - Design Log #004
- [Use Cases & Scenarios](./docs/README.md#requirements--use-cases) - Design Log #006

---

##  Architecture

### System Design

| Document | Description | Location |
|----------|-------------|----------|
| **System Architecture** | Overall architecture, tech stack, data flow | [docs/architecture/system-architecture.md](./docs/architecture/system-architecture.md) |
| **Database Design** | Schema, relationships, indexes | [docs/architecture/database.md](./docs/architecture/database.md) |
| **Package Structure** | Monorepo organization, dependencies | [docs/architecture/packages.md](./docs/architecture/packages.md) |
| **Design Logs** | Detailed design documentation (001-008) | [docs/README.md](./docs/README.md) |

### Key Architectural Documents

1. **[Design Log #001: Architecture & Infrastructure](./docs/README.md#core-architecture--infrastructure)**
   - High-level system architecture
   - Technology stack (Next.js, Drizzle, Redis, Gemini, Cloudflare R2)
   - Package structure and data flow

2. **[Design Log #002: Authentication & Authorization](./docs/README.md#authentication--security)**
   - User authentication (Better Auth)
   - Client scoping and security model
   - Future: Credit system and subscriptions

3. **[Design Log #003: Data Model & Terminology](./docs/README.md#data-model--terminology)**
   - Database schema and relationships
   - Multi-product support in flows
   - Entity lifecycle management

4. **[epox-platform Architecture](./docs/epox-platform-architecture-usage.md)**
   - App-specific architecture
   - Component structure
   - State management patterns

---

## Features Implemented

### Core Features

| Feature | Status | Documentation |
|---------|--------|---------------|
| **Bubble System** | ✅ Complete | [docs/features/bubble-system.md](./docs/features/bubble-system.md) |
| **Optimistic Updates** | ✅ Complete | [docs/features/optimistic-updates.md](./docs/features/optimistic-updates.md) |
| **Store Integration** | ✅ Complete | [docs/features/store-integration.md](./docs/features/store-integration.md) |
| **Backend Integration** | ✅ Complete | [apps/epox-platform/BACKEND_INTEGRATION_SUMMARY.md](./apps/epox-platform/BACKEND_INTEGRATION_SUMMARY.md) |
| **Production Routes** | ✅ Complete | [apps/epox-platform/PRODUCTION_READINESS_STATUS.md](./apps/epox-platform/PRODUCTION_READINESS_STATUS.md) |

### Feature Documentation

#### 1. Extensible Bubble System

**Description:** Registry-based inspiration bubble system allowing easy addition/removal of bubble types.

**Documentation:**
- [Implementation Guide](./apps/epox-platform/BUBBLE_SYSTEM_IMPLEMENTATION.md)
- [Complete Summary](./apps/epox-platform/BUBBLE_SYSTEM_COMPLETE.md)
- [Final Summary](./apps/epox-platform/IMPLEMENTATION_SUMMARY.md)

**Key Files:**
- Type System: `packages/visualizer-types/src/bubbles.ts`
- Registry: `apps/epox-platform/components/studio/bubbles/registry.ts`
- Bubble Definitions: `apps/epox-platform/components/studio/bubbles/*/definition.tsx`

**Status:** Production-ready with 7 bubble types (style, lighting, camera-angle, mood, inspiration, color-palette, custom)

#### 2. Optimistic Updates System

**Description:** Comprehensive optimistic updates for instant UI feedback on all user actions.

**Documentation:**
- [Optimistic Updates Guide](./apps/epox-platform/OPTIMISTIC_UPDATES.md)

**Hooks:**
- `useStoreActions` - Store page actions (sync/unsync/favorite/delete)
- `useProductActions` - Product operations (delete/favorite/bulk actions)
- `useCollectionActions` - Collection management (update/delete)
- `useAssetActions` - Asset operations (delete/favorite)

**Status:** Complete for all core features

#### 3. Store Integration

**Description:** E-commerce platform integration (WooCommerce, Shopify) with product sync.

**Documentation:**
- [Store Integration](./docs/features/store-integration.md)
- [ERP Service](./services/erp-service/README.md)

**Key Components:**
- Store Connection Wizard
- Product Import/Sync
- Webhook Handlers

**Status:** Complete with WooCommerce and Shopify support

---

## Testing

### Test Documentation

| Type | Documentation | Location |
|------|---------------|----------|
| **E2E Testing** | Complete Playwright guide | [docs/testing/e2e-testing.md](./docs/testing/e2e-testing.md) |
| **Unit Testing** | API and component tests | [docs/testing/unit-testing.md](./docs/testing/unit-testing.md) |
| **Test Strategies** | Patterns and best practices | [docs/testing/test-strategies.md](./docs/testing/test-strategies.md) |
| **Test Clients** | Pre-configured test users | [.claude/rules/test-clients.md](./.claude/rules/test-clients.md) |

### E2E Testing (Playwright)

**Main Documentation:**
- [E2E Testing with Testcontainers](./E2E_TESTCONTAINERS_GUIDE.md) - Complete guide
- [E2E Testing README](./apps/epox-platform/__tests__/e2e/README.md) - Quick start
- [Test Clients Guide](./.claude/rules/test-clients.md) - Pre-configured test data

**Key Concepts:**
- **Docker Containers:** Each test run uses isolated PostgreSQL container
- **Test Clients:** Pre-configured users with seeded data
- **Token Efficiency:** Script-first, screenshot-last approach
- **Feature-Based:** Tests organized by feature for parallel execution

**Quick Start:**
```bash
cd apps/epox-platform
yarn test:e2e        # Run all E2E tests
yarn test:e2e:ui     # UI mode (interactive)
yarn test:e2e:headed # See browser
```

**Status:** Comprehensive E2E coverage with isolated test database

### Unit Testing

**Documentation:**
- [Testing Guide](./apps/epox-platform/TESTING.md) - Complete testing documentation
- [E2E Test Status](./apps/epox-platform/E2E_TEST_STATUS.md) - Current test status

**Coverage:**
- ✅ Products API (CRUD, validation, SQL queries)
- ✅ Collections API (CRUD, SQL aggregation)
- ✅ Generated Images API (filtering, pagination)
- ✅ Image Generation Flow (queue service)
- ✅ AI Tools (analyze, edit, upscale)
- ✅ Dashboard (aggregation queries)

**Quick Start:**
```bash
yarn test              # Run all unit tests
yarn test:watch        # Watch mode
yarn test:coverage     # Generate coverage report
```

---

## Deployment

### Production Deployment

| Guide | Description | Location |
|-------|-------------|----------|
| **Production Readiness** | Deployment checklist, metrics | [apps/epox-platform/PRODUCTION_READINESS_STATUS.md](./apps/epox-platform/PRODUCTION_READINESS_STATUS.md) |
| **Environment Setup** | Required environment variables | [docs/deployment/environment.md](./docs/deployment/environment.md) |
| **Services Deployment** | Worker and service deployment | [docs/deployment/services.md](./docs/deployment/services.md) |

### Production Status

**✅ Production-Ready Routes (5/5):**
1. `/api/products` - SQL-level filtering, sorting, pagination
2. `/api/products/[id]` - Efficient JSONB queries
3. `/api/collections` - SQL aggregation for asset counts
4. `/api/collections/[id]` - SQL COUNT for stats
5. `/api/generated-images` - SQL filtering with batch product fetching

**Performance Improvements:**
- Products API: 60x faster (3s → 50ms for 10k records)
- Collections API: 25-40x faster
- Generated Images API: 50x faster
- Dashboard API: 50x faster
- Memory: 60-500x reduction

**Documentation:**
- [Production Improvements](./apps/epox-platform/PRODUCTION_IMPROVEMENTS.md)
- [Remaining Routes TODO](./apps/epox-platform/REMAINING_ROUTES_TODO.md)

### Services

#### Generation Worker

**Description:** PostgreSQL-based worker for image/video generation (Railway deployment)

**Documentation:** [services/generation-worker/README.md](./services/generation-worker/README.md)

**Key Features:**
- Atomic job claiming (FOR UPDATE SKIP LOCKED)
- Retry mechanism with exponential backoff
- Rate limiting (per Gemini tier)
- Health checks and monitoring

**Environment:**
```bash
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_URL=...
WORKER_CONCURRENCY=5
MAX_JOBS_PER_MINUTE=60
```

#### Worker Autoscaler

**Description:** Auto-scaling service for generation workers

**Documentation:** [services/worker-autoscaler/README.md](./services/worker-autoscaler/README.md)

---

## Development Guides

### Development Workflows

| Guide | Description | Location |
|-------|-------------|----------|
| **Getting Started** | Initial setup and development | [docs/development/getting-started.md](./docs/development/getting-started.md) |
| **API Development** | Backend API patterns | [docs/development/api-development.md](./docs/development/api-development.md) |
| **Frontend Development** | UI components and patterns | [docs/development/frontend-development.md](./docs/development/frontend-development.md) |
| **Database Migrations** | Schema changes workflow | [docs/development/database-migrations.md](./docs/development/database-migrations.md) |

### Implementation Gaps & TODOs

**Backend Integration:**
- [Implementation Gaps](./apps/epox-platform/IMPLEMENTATION_GAPS.md) - Original gap analysis
- [Remaining Routes TODO](./apps/epox-platform/REMAINING_ROUTES_TODO.md) - Copy-paste patterns for upgrading routes

**Key Patterns:**
1. SQL-level filtering (not fetch-all-filter in JS)
2. Pagination with metadata
3. Input validation
4. Proper error handling (400/404/500)
5. Storage URL generation

---

## Packages

### Core Packages

| Package | Description | Documentation |
|---------|-------------|---------------|
| **visualizer-db** | Database access layer (Drizzle ORM) | [packages/visualizer-db/README.md](./packages/visualizer-db/README.md) |
| **visualizer-storage** | File storage (R2/S3) | [packages/visualizer-storage/README.md](./packages/visualizer-storage/README.md) |
| **visualizer-ai** | AI services (Gemini) | [packages/visualizer-ai/README.md](./packages/visualizer-ai/README.md) |
| **visualizer-auth** | Authentication (Better Auth) | [packages/visualizer-auth/README.md](./packages/visualizer-auth/README.md) |
| **visualizer-types** | Shared TypeScript types | [packages/visualizer-types/README.md](./packages/visualizer-types/README.md) |
| **visualizer-services** | Business logic services | [packages/visualizer-services/README.md](./packages/visualizer-services/README.md) |

### Package-Specific Documentation

#### visualizer-db

**Key Features:**
- Type-safe database access with Drizzle ORM
- Repository pattern for all entities
- Generated TypeScript types from live schema
- Transaction support
- Test utilities (testkit)

**Documentation:**
- [Generated Types Guide](./packages/visualizer-db/GENERATED_TYPES.md)
- [Test Plan](./packages/visualizer-db/src/__tests__/TEST_PLAN.md)
- [DB Repository Testing](./.claude/rules/db-repository-testing.md)

**Key Commands:**
```bash
cd packages/visualizer-db
yarn db:push             # Push schema to database
yarn db:generate:types   # Generate TypeScript types
yarn db:studio           # Open Drizzle Studio
yarn test                # Run repository tests
```

#### visualizer-ai

**Key Features:**
- Gemini AI service integration
- Image generation
- Scene analysis
- Image editing
- Video generation

**Documentation:**
- [AI Package README](./packages/visualizer-ai/README.md)
- [Migration Guide](./packages/visualizer-ai/MIGRATION.md)

**Extracted from:** visualizer-services (for smaller Docker images)

---

## Services

### Deployed Services

| Service | Description | Documentation |
|---------|-------------|---------------|
| **generation-worker** | Background job processor | [services/generation-worker/README.md](./services/generation-worker/README.md) |
| **worker-autoscaler** | Auto-scaling service | [services/worker-autoscaler/README.md](./services/worker-autoscaler/README.md) |
| **erp-service** | E-commerce integration | [services/erp-service/README.md](./services/erp-service/README.md) |
| **supabase-service** | Supabase utilities (legacy) | [services/supabase-service/README.md](./services/supabase-service/README.md) |

---

## What's Next

### Short-Term TODOs

#### Authentication (High Priority)
- [ ] Add authentication integration to all routes
- [ ] Replace PLACEHOLDER_CLIENT_ID with real session data
- [ ] Implement route protection middleware
- [ ] Add user role management

**Documentation:** [Remaining Routes TODO](./apps/epox-platform/REMAINING_ROUTES_TODO.md)

#### Testing
- [ ] Increase E2E test coverage (currently 22 failed, 13 passed)
- [ ] Fix Better Auth WebSocket issues in tests
- [ ] Add more API unit tests
- [ ] Implement visual regression testing

**Documentation:** [E2E Test Status](./apps/epox-platform/E2E_TEST_STATUS.md)

### Medium-Term TODOs

#### Performance Optimization
- [ ] Add Redis caching for filter options
- [ ] Implement full-text search indexes
- [ ] Optimize remaining N+1 queries
- [ ] Add database query monitoring

#### Monitoring & Logging
- [ ] Setup Sentry for error tracking
- [ ] Add API analytics
- [ ] Implement slow query alerts
- [ ] Add performance monitoring

#### Feature Enhancements
- [ ] Bubble presets (save/load common combinations)
- [ ] Bubble templates per industry
- [ ] Advanced store sync features
- [ ] Batch operations UI improvements

### Long-Term TODOs (Phase 2-4)

#### Credit System (Months 4-9)
- [ ] Add credit_balance to members table
- [ ] Create credit_transactions, credit_packages tables
- [ ] Stripe integration
- [ ] Self-service signup
- [ ] Generation quota checks

**Documentation:** [Design Log #002](./docs/README.md#authentication--security), [Design Log #008](./docs/README.md#business-model--pricing)

#### Subscriptions (Months 10-18)
- [ ] Subscription management
- [ ] Store sync (Shopify, WooCommerce)
- [ ] Monthly credit grants
- [ ] Team collaboration features

#### Enterprise Features (Months 18+)
- [ ] Multi-client management
- [ ] Agency tier
- [ ] API access for integrations
- [ ] White-label options

**Target Metrics:**
- Phase 2: $10K MRR, 15% conversion
- Phase 3: $50K MRR, <5% churn
- Phase 4: $100K+ MRR

---

## 📚 Additional Resources

### Design & Planning

- [Design Logs](./docs/README.md) - Comprehensive design documentation (001-008)
- [UI Visual Slideshow](./docs/UI-VISUAL-SLIDESHOW.md) - Visual design guide
- [Environment Variables](./docs/ENVIRONMENT_VARS.md) - Complete env var reference

### Project Rules & Guidelines

- [Design Log Methodology](./.claude/rules/design-log.md) - How to write design docs
- [Test Clients Guide](./.claude/rules/test-clients.md) - Pre-configured test users
- [DB Repository Testing](./.claude/rules/db-repository-testing.md) - Testing requirements
- [Playwright Verification](./.claude/rules/playwright-verification.md) - E2E testing strategy
- [Guidelines](./.claude/rules/guidelines.md) - General development guidelines
- [Sentry Integration](./.claude/rules/sentry.md) - Error tracking setup

### Implementation Summaries

- [Implementation Summary](./docs/IMPLEMENTATION_SUMMARY.md) - High-level summary
- [Backend Integration](./apps/epox-platform/BACKEND_INTEGRATION_SUMMARY.md) - Backend services integration
- [Bubble System](./apps/epox-platform/IMPLEMENTATION_SUMMARY.md) - Complete bubble system
- [Optimistic Updates](./apps/epox-platform/OPTIMISTIC_UPDATES.md) - UI optimization

---

## 🔍 Finding Documentation

### By Topic

- **Architecture** → [docs/README.md](./docs/README.md), Design Logs #001, #003
- **Authentication** → Design Log #002, [visualizer-auth](./packages/visualizer-auth/README.md)
- **Testing** → [E2E Guide](./E2E_TESTCONTAINERS_GUIDE.md), [Testing Guide](./apps/epox-platform/TESTING.md)
- **Features** → [Bubble System](./apps/epox-platform/BUBBLE_SYSTEM_COMPLETE.md), [Optimistic Updates](./apps/epox-platform/OPTIMISTIC_UPDATES.md)
- **Deployment** → [Production Readiness](./apps/epox-platform/PRODUCTION_READINESS_STATUS.md)
- **Database** → [visualizer-db](./packages/visualizer-db/README.md), [Generated Types](./packages/visualizer-db/GENERATED_TYPES.md)
- **API** → Design Log #007, [API Development](./docs/development/api-development.md)

### By Role

- **Product Managers:** Design Logs #004, #006, #008
- **Engineers:** Design Logs #001, #003, #007, Package READMEs
- **Designers:** Design Logs #004, #005, [UI Slideshow](./docs/UI-VISUAL-SLIDESHOW.md)
- **QA:** [Testing Guides](./docs/testing/), [E2E Guide](./E2E_TESTCONTAINERS_GUIDE.md)
- **DevOps:** [Services](./services/), [Deployment](./docs/deployment/)

---

## 📝 Contributing to Documentation

When updating documentation:

1. **Follow existing patterns** - Maintain consistent structure and formatting
2. **Update this index** - Add new documents to the appropriate section
3. **Cross-reference** - Link related documents
4. **Include examples** - Code examples where relevant
5. **Document trade-offs** - Explain implementation choices
6. **Keep TODOs updated** - Move completed items, add new ones

**Documentation Standards:**
- Use clear, concise language
- Include mermaid diagrams for complex flows
- Add table of contents for long documents
- Use consistent heading levels
- Include last updated date

---

**Last Updated:** 2026-01-26

**Maintained By:** Development Team

**Questions?** Check the relevant documentation section above or search the `.claude/rules/` directory for specific guides.
