# visualizer-db

Database layer for Epox platform using Drizzle ORM with PostgreSQL.

## Quick Start

### 1. Start Local Database

```bash
# Start PostgreSQL container (named "epox-dev" on port 5432)
yarn db:start

# Verify it's running
docker ps | grep epox-dev
```

### 2. Push Schema

```bash
# Push schema to local database
yarn db:push:local

# Or if using .env.local
yarn db:push
```

### 3. Open Drizzle Studio

```bash
# Browse database with Drizzle Studio
yarn db:studio:local
```

---

## Available Commands

### Database Management

```bash
yarn db:start              # Start local PostgreSQL (container: epox-dev)
yarn db:stop               # Stop local PostgreSQL
yarn db:reset              # Reset database (removes all data)
yarn db:logs               # View PostgreSQL logs
```

### Schema Operations

```bash
yarn db:push:local         # Push schema to localhost:5432/epox_dev
yarn db:push:prod          # Push schema to production (requires DATABASE_URL)
yarn db:push:all           # Push to both local and production
yarn db:push               # Push using .env.local DATABASE_URL
```

### Studio (Database Browser)

```bash
yarn db:studio:local       # Open studio for localhost:5432/epox_dev
yarn db:studio:prod        # Open studio for production (requires DATABASE_URL)
yarn db:studio             # Open studio using .env.local DATABASE_URL
```

### Testing

```bash
yarn test:db:start         # Start test database (port 5434)
yarn test:db:stop          # Stop test database
yarn test:db:reset         # Reset test database
yarn test:db:push          # Push schema to test database
```

---

## Database Configuration

### Local Development

- **Container**: `epox-dev`
- **Host**: `localhost:5432`
- **Database**: `epox_dev`
- **User**: `postgres`
- **Password**: `postgres`
- **URL**: `postgresql://postgres:postgres@localhost:5432/epox_dev`

### Test Environment

- **Container**: `visualizer-db-test`
- **Host**: `localhost:5434`
- **Database**: `visualizer_test`
- **User**: `test`
- **Password**: `test`
- **URL**: `postgresql://test:test@localhost:5434/visualizer_test`

### Production

- **Platform**: Neon (serverless PostgreSQL)
- **Connection**: Via `PRODUCTION_DATABASE_URL` environment variable
- **Safety**: Requires `ALLOW_PRODUCTION_ACCESS=true` to push from local machine

---

## Schema Changes Workflow

### For Local Development

```bash
# 1. Edit schema files
vim src/schema/products.ts

# 2. Push to local database
yarn db:push:local

# 3. Test changes
cd ../../apps/epox-platform
yarn dev
```

### For Production Deployment

```bash
# 1. Test locally first
yarn db:push:local
yarn test

# 2. Push to production
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push:prod

# 3. Deploy app code
git push origin main  # Triggers Vercel deployment
```

See [MIGRATION_COMMANDS.md](./MIGRATION_COMMANDS.md) for detailed examples.

---

## Project Structure

```
packages/visualizer-db/
├── src/
│   ├── schema/              # Drizzle schema definitions
│   │   ├── auth.ts          # Users, sessions, clients
│   │   ├── products.ts      # Products, images
│   │   ├── generated-images.ts  # Generated assets
│   │   ├── sessions.ts      # Collections, flows
│   │   ├── jobs.ts          # Generation jobs
│   │   └── store-sync.ts    # E-commerce sync
│   ├── repositories/        # Data access layer
│   ├── client.ts            # Database connection
│   ├── facade.ts            # Repository facade
│   └── testkit.ts           # Testing utilities
├── scripts/                 # Utility scripts
├── docker-compose.yml       # Local dev database
└── docker-compose.test.yml  # Test database
```

---

## Safety Features

### Production Database Protection

The database client includes safety guards to prevent accidental production access:

```bash
# ❌ This will be BLOCKED
NODE_ENV=development DATABASE_URL="postgresql://...neon.tech/..." yarn db:push

# ✅ This works (explicit bypass required)
ALLOW_PRODUCTION_ACCESS=true DATABASE_URL="postgresql://...neon.tech/..." yarn db:push

# ✅ Or use the convenience script
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push:prod
```

See [SAFE_MIGRATIONS.md](./SAFE_MIGRATIONS.md) for details.

---

## Testing

### Unit Tests

```bash
# Run unit tests (mock database)
yarn test

# Watch mode
yarn test:watch
```

### Integration Tests

```bash
# Start test database
yarn test:db:start

# Push schema to test database
yarn test:db:push

# Run integration tests
yarn test

# Cleanup
yarn test:db:stop
```

---

## Troubleshooting

### "Connection refused" on localhost:5432

Database isn't running:
```bash
yarn db:start
docker ps | grep epox-dev
```

### "Database epox_dev does not exist"

Schema hasn't been pushed:
```bash
yarn db:push:local
```

### "BLOCKED: Attempting to connect to PRODUCTION database"

This is working correctly! You're protected from accidental production access.

To intentionally push to production:
```bash
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push:prod
```

---

## Documentation

- **[MIGRATION_COMMANDS.md](./MIGRATION_COMMANDS.md)** - Quick reference for all database commands
- **[SAFE_MIGRATIONS.md](./SAFE_MIGRATIONS.md)** - Detailed migration guide with examples
- **[SECURITY_RECOMMENDATIONS.md](./SECURITY_RECOMMENDATIONS.md)** - Security best practices
- **[DATA_SAFETY_AUDIT_2026-01-26.md](../../DATA_SAFETY_AUDIT_2026-01-26.md)** - Security audit findings

---

## Package Exports

```typescript
// Database client and facade
import { db, getDb } from 'visualizer-db';

// Schema definitions
import * as schema from 'visualizer-db/schema';

// Generated types
import type { Client, Product, GeneratedAsset } from 'visualizer-db/types';

// Repositories
import { generationJobs } from 'visualizer-db/repositories/generation-jobs';

// Testing utilities
import { createMockDb, createRealTestDb } from 'visualizer-db/testkit';
```

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/epox_dev

# Optional (for production operations)
PRODUCTION_DATABASE_URL=postgresql://...@neon.tech/neondb
ALLOW_PRODUCTION_ACCESS=true  # Only for explicit production access
NODE_ENV=development|production|test
```

---

## Docker Compose Services

### Dev Database

```yaml
services:
  postgres:
    container_name: epox-dev
    image: postgres:16
    ports: ['5432:5432']
    environment:
      POSTGRES_DB: epox_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
```

Start with: `yarn db:start`

### Test Database

```yaml
services:
  postgres:
    container_name: visualizer-db-test
    ports: ['5434:5432']
    environment:
      POSTGRES_DB: visualizer_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
```

Start with: `yarn test:db:start`

---

## Contributing

When adding new database features:

1. **Define schema** in `src/schema/`
2. **Add repository methods** in `src/repositories/`
3. **Write tests** in `src/__tests__/repositories/`
4. **Update types** with `yarn db:generate:types`
5. **Test locally** with `yarn db:push:local`
6. **Deploy** with `yarn db:push:prod`

See [db-repository-testing.md](../../.claude/rules/db-repository-testing.md) for testing requirements.

---

**Last Updated**: 2026-01-26
