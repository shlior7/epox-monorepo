# Database Migration Commands - Quick Reference

## Local Development (Safe - No Confirmation)

```bash
# Push schema to local database
yarn db:push:local
```

Uses: `postgresql://postgres:postgres@localhost:5432/epox_dev`

---

## Production Database (Protected - Requires URL + Confirmation)

```bash
# Push schema to production
DATABASE_URL="your-prod-url" yarn db:push:prod
```

⚠️ Requires:
- Explicit `DATABASE_URL` (production URL)
- Uses `ALLOW_PRODUCTION_ACCESS=true` automatically
- Drizzle will show diff and ask for confirmation

---

## Push to Both (Local → Production)

```bash
# Push to local, then production (if successful)
DATABASE_URL="your-prod-url" yarn db:push:all
```

This runs:
1. `yarn db:push:local` (safe)
2. `yarn db:push:prod` (requires confirmation)

---

## Setting Production URL

### Option 1: Environment Variable (Recommended)

```bash
# Add to ~/.zshrc or ~/.bashrc
export PRODUCTION_DATABASE_URL="postgresql://neondb_owner:...@neon.tech/neondb"

# Then just:
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push:prod
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push:all
```

### Option 2: One-Time Use

```bash
# Copy from .env.production.backup or Vercel dashboard
DATABASE_URL="postgresql://neondb_owner:...@neon.tech/neondb" yarn db:push:prod
```

---

## Common Workflows

### Daily Development

```bash
# Edit schema files
# Push to local database
yarn db:push:local

# Test changes
cd ../../apps/epox-platform
yarn dev
```

### Deploy Schema Update

```bash
# 1. Test locally
yarn db:push:local
yarn test

# 2. Push to production
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push:prod

# 3. Deploy app code (after schema is updated)
git push origin main
```

### One-Command Deploy (Advanced)

```bash
# Push local + production in sequence
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push:all
```

---

## Database Management Commands

```bash
# Local dev database (container: epox-dev, port 5432)
yarn db:start          # Start PostgreSQL container
yarn db:stop           # Stop PostgreSQL container
yarn db:reset          # Reset database (removes all data)
yarn db:logs           # View PostgreSQL logs

# Drizzle Studio (database browser)
yarn db:studio:local   # Open studio for local database
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:studio:prod  # Production studio

# Test database (container: visualizer-db-test, port 5434)
yarn test:db:start     # Start test PostgreSQL container
yarn test:db:push      # Push schema to test database
yarn test:db:stop      # Stop test database
```

---

## Comparison with Original `db:push`

| Command | Database | Safety | Use Case |
|---------|----------|--------|----------|
| `yarn db:push` | From `.env.local` | ⚠️ Depends on .env.local | Legacy (before safety guard) |
| `yarn db:push:local` | `localhost:5432/epox_dev` | ✅ Safe | Daily development |
| `yarn db:push:prod` | From `DATABASE_URL` | 🛡️ Protected | Production deployments |
| `yarn db:push:all` | Both in sequence | 🛡️ Protected | Deploy to all environments |

---

## Safety Features

### ✅ What's Protected

- `db:push:prod` requires explicit `DATABASE_URL` (won't use .env.local accidentally)
- `ALLOW_PRODUCTION_ACCESS=true` bypasses the safety guard automatically
- Drizzle still shows diff and asks for confirmation before applying
- Can't accidentally push to production from daily `yarn db:push:local`

### ✅ What You Control

- Must explicitly provide production URL
- Must confirm changes in Drizzle's prompt
- Can abort at any time by selecting "No, abort"

---

## Examples

### Example 1: Local Development

```bash
cd packages/visualizer-db

# Edit schema
vim src/schema/products.ts

# Push to local
yarn db:push:local

# Output:
# ✓ Changes detected
# ✓ Connected to localhost:5432/epox_dev
# → (shows diff)
# ❯ Yes, apply changes
```

### Example 2: Production Deployment

```bash
cd packages/visualizer-db

# Set production URL (do this once)
export PRODUCTION_DATABASE_URL="postgresql://..."

# Push to production
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push:prod

# Output:
# ✓ Changes detected
# ✓ Connected to ep-holy-lake...neon.tech/neondb
# → (shows diff)
# ❯ Yes, apply changes
```

### Example 3: Push to All Environments

```bash
# Set production URL
export PRODUCTION_DATABASE_URL="postgresql://..."

# Push to both (local first, then production)
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push:all

# Output:
# [1/2] Pushing to local database...
# ✓ localhost:5432/epox_dev updated
#
# [2/2] Pushing to production database...
# ⚠️ WARNING: This is PRODUCTION
# → (shows diff)
# ❯ Yes, apply changes
# ✓ Production updated
```

---

## Troubleshooting

### "DATABASE_URL environment variable is not set"

For production push, you must provide URL:

```bash
DATABASE_URL="your-prod-url" yarn db:push:prod
```

### Local database connection fails

Start PostgreSQL:

```bash
# Using the convenience script (recommended)
cd packages/visualizer-db
yarn db:start

# Or manually with docker compose
docker compose up -d

# Verify it's running
docker ps | grep epox-dev
# Should show container "epox-dev" on port 5432
```

### "No changes detected"

Schema is already up to date - nothing to push.

---

## Quick Reference Card

```bash
# LOCAL
yarn db:push:local              # Push to localhost:5432

# PRODUCTION
DATABASE_URL="..." \
  yarn db:push:prod             # Push to production

# BOTH
DATABASE_URL="..." \
  yarn db:push:all              # Push to local + production

# STUDIO
yarn db:studio                  # Open local studio
DATABASE_URL="..." \
  yarn db:studio:prod           # Open production studio
```

---

**Last Updated**: 2026-01-26
**See Also**: SAFE_MIGRATIONS.md for detailed explanations
