# Getting Started with Epox Platform

> **Quick setup guide to get you up and running in minutes**

---

## Prerequisites

### Required
- **Node.js** 22.17.0
- **Yarn** 4.12.0
- **Docker Desktop** (for local database)
- **Git**

### Optional
- **VS Code** with recommended extensions
- **PostgreSQL** client (for database inspection)
- **Docker Desktop** for e2e testing
---

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd epox-monorepo

# Install dependencies (from root)
yarn install
```

### 2. Setup Database

```bash
# Start PostgreSQL with Docker
cd packages/visualizer-db
yarn db:start

# Push schema to database
yarn db:push

# Verify connection
yarn db:studio
```

### 3. Configure Environment

```bash
# Copy example env file
cp apps/epox-platform/.env.example apps/epox-platform/.env.local

# Edit and add your keys
# DATABASE_URL=postgresql://...
# GEMINI_API_KEY=...
# R2_ACCOUNT_ID=...
# (See environment-variables.md for complete list)
```

### 4. Run Development Server

```bash
cd apps/epox-platform
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
epox-monorepo/
├── apps/
│   ├── epox-platform/      # Main user-facing app
│   └── epox-admin/         # Admin console (legacy)
│
├── packages/
│   ├── visualizer-db/      # Database layer (Drizzle ORM)
│   ├── visualizer-ai/      # AI services (Gemini)
│   ├── visualizer-storage/ # File storage (R2/S3)
│   ├── visualizer-auth/    # Authentication (Better Auth)
│   └── visualizer-types/   # Shared TypeScript types
│
├── services/
│   ├── generation-worker/  # Background job processor
│   ├── worker-autoscaler/  # Auto-scaling service
│   └── erp-service/        # E-commerce integration
│
└── docs/                   # Complete documentation
```

---

## Development Workflow

### Daily Development

```bash
# Start database (if not running)
cd packages/visualizer-db && yarn db:start

# Start dev server
cd apps/epox-platform && yarn dev

# In another terminal - run tests in watch mode
yarn test:watch
```

### Common Tasks

```bash
# Run all tests
yarn test

# Run E2E tests
yarn test:e2e

# Build all packages
yarn build

# Lint and type-check
yarn lint
yarn type-check

# Database operations
cd packages/visualizer-db
yarn db:push        # Push schema changes
yarn db:studio      # Open Drizzle Studio
yarn db:generate    # Generate migrations
```

---

## Your First Feature

### 1. Explore the Codebase

**Start with these files:**
```
apps/epox-platform/
├── app/
│   ├── (dashboard)/        # Main app routes
│   │   ├── products/       # Products page
│   │   ├── collections/    # Collections page
│   │   └── studio/         # Studio page
│   └── api/                # API routes
│       ├── products/       # Products API
│       └── collections/    # Collections API
│
├── components/
│   ├── studio/             # Studio components
│   │   ├── bubbles/        # Bubble system
│   │   └── config-panel/   # Config panel
│   └── ui/                 # Reusable UI components
│
└── lib/
    ├── hooks/              # Custom hooks
    └── services/           # Service integrations
```

### 2. Make a Change

**Example: Add a new bubble type**

```bash
# 1. Create bubble definition
touch apps/epox-platform/components/studio/bubbles/my-bubble/definition.tsx

# 2. Register bubble
# Edit: apps/epox-platform/components/studio/bubbles/registry.ts

# 3. Add tests
touch apps/epox-platform/__tests__/components/my-bubble.test.tsx

# 4. Run tests
yarn test
```

**See:** [Bubble System Guide](./features/bubble-system/implementation.md)

### 3. Test Your Changes

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Manual testing
yarn dev
```

---

## Common Issues

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps | grep visualizer-db

# If not running, start it
cd packages/visualizer-db
yarn db:start

# Verify connection
psql -h localhost -p 5432 -U postgres -d visualizer
```

### Port Already in Use

```bash
# Error: Port 3000 is already in use

# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 yarn dev
```

### Module Not Found

```bash
# Error: Cannot find module '@repo/...'

# Clean and reinstall
rm -rf node_modules
yarn install

# Rebuild packages
yarn build
```

### Tests Failing

```bash
# E2E tests failing with auth errors

# 1. Make sure dev server is running
cd apps/epox-platform && yarn dev

# 2. Check if test database is running
docker ps | grep visualizer-db-test

# 3. Re-seed test data
yarn test:seed
```

---

## Next Steps

### Learn the Architecture

1. **[System Overview](./architecture/system-overview.md)** - Understand the architecture
2. **[Database Schema](./architecture/database-schema.md)** - Learn the data model
3. **[Packages](./architecture/packages.md)** - Explore shared packages

### Read Feature Docs

1. **[Bubble System](./features/bubble-system/README.md)** - Extensible inspiration system
2. **[Optimistic Updates](./features/optimistic-updates.md)** - Instant UI feedback
3. **[Store Integration](./features/store-integration.md)** - E-commerce platforms

### Setup Testing

1. **[E2E Testing Guide](./testing/e2e/README.md)** - End-to-end testing
2. **[Testcontainers](./testing/e2e/testcontainers-guide.md)** - Isolated test database
3. **[Unit Testing](./testing/unit-testing.md)** - API and component tests

### Development Guides

1. **[API Development](./development/api-development.md)** - Backend patterns
2. **[Frontend Development](./development/frontend-development.md)** - UI patterns
3. **[Database Migrations](./development/database-migrations.md)** - Schema changes

---

## Development Tools

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "prisma.prisma"
  ]
}
```

### Useful Commands

```bash
# Package management
yarn workspace @repo/visualizer-db <command>  # Run command in specific package
yarn workspaces run test                      # Run test in all packages

# Database
yarn db:studio                                # Open Drizzle Studio
yarn db:seed                                  # Seed development data

# Code quality
yarn lint:fix                                 # Auto-fix linting errors
yarn format                                   # Format with Prettier

# Build
yarn build                                    # Build all packages
yarn build:apps                               # Build apps only
```

---

## Getting Help

### Documentation
- Check [docs/README.md](./README.md) for complete documentationG
- Search by topic in the documentation index
- Review examples in test files

### Resources
- [Architecture Overview](./architecture/system-overview.md)
- [Development Guide](./development/README.md)
- [Testing Guide](./testing/README.md)
- [Roadmap](./roadmap/whats-next.md)

### Troubleshooting
- Review [common issues](#common-issues) above
- Check [E2E Test Status](./testing/e2e/test-status.md)
- Look at [implementation gaps](./development/implementation-gaps.md)

---

**Ready to start?** Check out the [Development Guide](./development/README.md) for detailed workflows.

**Last Updated:** 2026-01-26
