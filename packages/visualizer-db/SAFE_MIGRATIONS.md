# Safe Database Migrations Guide

## Quick Reference

### Local Development (Safe - No Confirmation Needed)

```bash
# Push schema to local dev database
yarn db:push
```

This uses `DATABASE_URL` from your `.env.local` (should be `localhost:5432`)

---

### Production Database (Protected - Requires Explicit Flag)

```bash
# Push schema to production (requires explicit bypass)
ALLOW_PRODUCTION_ACCESS=true DATABASE_URL="postgresql://your-prod-url" yarn db:push
```

⚠️ **This is intentionally verbose to prevent accidents!**

---

## Recommended Workflow

### 1. Develop Schema Locally

```bash
# Edit schema files in src/schema/
# Example: src/schema/products.ts

# Push to local database
yarn db:push
```

### 2. Test Changes Locally

```bash
# Run your app with the new schema
cd ../../apps/epox-platform
yarn dev

# Run tests
yarn test
yarn test:e2e
```

### 3. Push to Production

When ready to deploy schema changes to production:

```bash
# Option A: Push directly with explicit bypass
cd packages/visualizer-db
ALLOW_PRODUCTION_ACCESS=true \
  DATABASE_URL="postgresql://neondb_owner:...@neon.tech/neondb" \
  yarn db:push

# Option B: Set production URL temporarily
export PRODUCTION_DATABASE_URL="postgresql://neondb_owner:...@neon.tech/neondb"
ALLOW_PRODUCTION_ACCESS=true DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push
```

---

## Safety Features

### 🛡️ What's Protected

- **Accidental connections**: Can't connect to production from `NODE_ENV=development`
- **Local dev safety**: Your `.env.local` should only have local database URL
- **Explicit bypass required**: Production access requires `ALLOW_PRODUCTION_ACCESS=true`

### ✅ What Still Works

- **Local development**: `yarn db:push` works normally with localhost URL
- **E2E tests**: Test database (port 5434) works without bypass
- **Production deployments**: Vercel automatically sets `NODE_ENV=production`

---

## Common Scenarios

### Scenario 1: Daily Development

```bash
# Just use db:push normally
cd packages/visualizer-db
yarn db:push
```

✅ Safe - connects to local database from `.env.local`

---

### Scenario 2: Deploying Schema Change

```bash
# Step 1: Test locally first
yarn db:push
cd ../../apps/epox-platform
yarn test:e2e

# Step 2: Push to production (explicit bypass required)
cd packages/visualizer-db
ALLOW_PRODUCTION_ACCESS=true \
  DATABASE_URL="$PRODUCTION_DATABASE_URL" \
  yarn db:push

# Step 3: Deploy app code (schema is already updated)
git push origin main  # Triggers Vercel deployment
```

---

### Scenario 3: Checking Production Schema

```bash
# Just view the diff without applying
ALLOW_PRODUCTION_ACCESS=true \
  DATABASE_URL="$PRODUCTION_DATABASE_URL" \
  npx drizzle-kit push

# When prompted, select "No, abort" to just view changes
```

---

## NPM Scripts (Convenience Aliases)

Add these to `packages/visualizer-db/package.json` for convenience:

```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:push:prod": "ALLOW_PRODUCTION_ACCESS=true drizzle-kit push",
    "db:push:check": "drizzle-kit push --dry-run",
    "db:studio": "drizzle-kit studio",
    "db:studio:prod": "ALLOW_PRODUCTION_ACCESS=true drizzle-kit studio"
  }
}
```

Then use:

```bash
# Local (safe)
yarn db:push

# Production (still requires DATABASE_URL, but shorter)
DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push:prod

# Check without applying
yarn db:push:check
```

---

## Storing Production URL Safely

### Option 1: Environment Variable (Recommended)

```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export PRODUCTION_DATABASE_URL="postgresql://neondb_owner:...@neon.tech/neondb"

# Then use:
ALLOW_PRODUCTION_ACCESS=true DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push
```

### Option 2: Create .env.production (Git-Ignored)

```bash
# packages/visualizer-db/.env.production
DATABASE_URL=postgresql://neondb_owner:...@neon.tech/neondb
```

```bash
# Load and use
source .env.production
ALLOW_PRODUCTION_ACCESS=true yarn db:push
```

### Option 3: Use a secrets manager

```bash
# Example with 1Password CLI
op run --env-file=".env.production" -- \
  bash -c 'ALLOW_PRODUCTION_ACCESS=true yarn db:push'
```

---

## What If I Forget?

If you try to push to production without the bypass flag:

```bash
❌ BLOCKED: Attempting to connect to PRODUCTION database from local environment!

DATABASE_URL: postgresql://neondb_owner***
NODE_ENV: development

To intentionally push to production:
   ALLOW_PRODUCTION_ACCESS=true DATABASE_URL="your-prod-url" yarn db:push
```

Just copy the command from the error message!

---

## Emergency: Bypass Not Working?

If you're absolutely sure you need to connect to production and the bypass isn't working:

1. **Check NODE_ENV**: Must be 'development' or 'test' to need bypass
2. **Check spelling**: `ALLOW_PRODUCTION_ACCESS=true` (all caps, no typos)
3. **Check URL**: Make sure it's the production URL (contains neon.tech, etc.)
4. **Temporary workaround**: Set `NODE_ENV=production` (not recommended)

```bash
# Last resort (be VERY careful)
NODE_ENV=production DATABASE_URL="..." yarn db:push
```

---

## Best Practices

### ✅ DO

- Keep production URL out of `.env.local`
- Use `ALLOW_PRODUCTION_ACCESS=true` for production pushes
- Test schema changes locally first
- Review the diff before confirming production push
- Push schema before deploying app code

### ❌ DON'T

- Put production URL in `.env.local`
- Bypass safety checks without good reason
- Push to production without testing locally
- Use `yarn db:push` in CI/CD (use migrations instead)
- Share production credentials in code or git

---

## Troubleshooting

### "DATABASE_URL environment variable is not set"

You forgot to provide the URL:

```bash
# Add DATABASE_URL
DATABASE_URL="postgresql://..." yarn db:push
```

### "BLOCKED: Attempting to connect to PRODUCTION database"

This is working correctly! Add the bypass flag:

```bash
ALLOW_PRODUCTION_ACCESS=true DATABASE_URL="..." yarn db:push
```

### "No changes detected"

Schema is already up to date - nothing to push.

### Connection timeout to localhost

Local PostgreSQL isn't running:

```bash
# Start local database (creates container named "epox-dev")
cd packages/visualizer-db
yarn db:start

# Verify it's running
docker ps | grep epox-dev
# Should show: epox-dev ... 5432/tcp

# View logs if needed
yarn db:logs
```

---

## Summary

**Regular local development**: Just `yarn db:push`

**Production schema update**:
```bash
ALLOW_PRODUCTION_ACCESS=true DATABASE_URL="$PRODUCTION_DATABASE_URL" yarn db:push
```

The safety guard protects you from accidents while still allowing intentional production access when you explicitly bypass it.

---

**Last Updated**: 2026-01-26
