# Database Security Recommendations

## Critical Issues Found (2026-01-26)

### Issue 1: Production DATABASE_URL in Local Development

**Current State**: `.env.local` contains production Neon database URL
**Risk**: Accidental data modification/deletion in production database
**Severity**: CRITICAL

**Fix**:
```bash
# Move production URL to .env.production (Vercel only)
# Set .env.local to local PostgreSQL:
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/epox_dev'
```

---

### Issue 2: No Production Safeguards in Database Client

**Current State**: `getDb()` blindly connects to whatever DATABASE_URL is set
**Risk**: No warnings when connecting to production from local machine

**Recommended Fix** (add to `src/client.ts`):

```typescript
/**
 * Detect if DATABASE_URL points to a production database
 */
function isProductionDatabase(url: string): boolean {
  return url.includes('neon.tech') ||
         url.includes('amazonaws.com') ||
         url.includes('supabase.co');
}

/**
 * Environment-aware connection guard
 */
function validateDatabaseConnection(url: string): void {
  const isProd = isProductionDatabase(url);
  const isDevEnv = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test' || process.env.CI === 'true';

  // ERROR: Production DB in development/test
  if (isProd && (isDevEnv || isTest)) {
    throw new Error(
      '🚨 BLOCKED: Attempting to connect to PRODUCTION database from local environment!\n' +
      `DATABASE_URL: ${url.substring(0, 30)}...\n` +
      'NODE_ENV: ' + process.env.NODE_ENV + '\n\n' +
      'To fix:\n' +
      '1. Update .env.local to use local PostgreSQL:\n' +
      '   DATABASE_URL=\'postgresql://postgres:postgres@localhost:5432/epox_dev\'\n' +
      '2. Move production URL to .env.production (for Vercel deployment only)\n'
    );
  }

  // WARN: Local DB in production
  if (!isProd && !isDevEnv && !isTest) {
    console.warn(
      '⚠️  WARNING: Using local database in production environment.\n' +
      'Make sure this is intentional (e.g., preview deployment with test DB)'
    );
  }
}

// Add validation to createPool()
function createPool() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // NEW: Validate before connecting
  validateDatabaseConnection(databaseUrl);

  // ... existing code
}
```

---

### Issue 3: Test Helpers Exported Without Safeguards

**Current State**: `testkit.ts` exports destructive functions like `cleanClientData()`, `truncateAllTables()`
**Risk**: Accidentally imported and run against production database

**Recommended Fix**:

Option A: Add guards to testkit functions
```typescript
export async function cleanClientData(db: TestDb, clientId: string): Promise<void> {
  // NEW: Require explicit confirmation in production
  const url = process.env.DATABASE_URL || '';
  if (url.includes('neon.tech')) {
    throw new Error(
      '🚨 BLOCKED: cleanClientData() cannot run against production database!\n' +
      'This function is for TESTING ONLY.'
    );
  }

  // ... rest of function
}
```

Option B: Move test helpers to a separate package
```typescript
// Create: packages/visualizer-db-testkit/
// Import only in test files
```

---

### Issue 4: Admin Delete Without Confirmation

**Current State**: Admin panel can delete clients permanently
**Risk**: Accidental deletion of production client data

**Recommended Fix**:

Add extra confirmation for production:
```typescript
// In admin delete endpoint
if (process.env.NODE_ENV === 'production') {
  // Require typing client ID to confirm
  const { confirmClientId } = await request.json();
  if (confirmClientId !== clientId) {
    return NextResponse.json(
      { error: 'Must type client ID to confirm deletion in production' },
      { status: 400 }
    );
  }
}
```

---

### Issue 5: Scripts Without Environment Validation

**Current State**: Utility scripts in `packages/visualizer-db/scripts/` use DATABASE_URL without checks

**Recommended Fix**:

Add guard to all scripts:
```typescript
#!/usr/bin/env tsx
import { isProductionDatabase, confirmProductionAccess } from '../src/guards';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  // NEW: Require confirmation for production
  if (isProductionDatabase(databaseUrl)) {
    console.log('⚠️  This script will access PRODUCTION database');
    const confirmed = await confirmProductionAccess();
    if (!confirmed) {
      console.log('Aborted');
      process.exit(0);
    }
  }

  // ... rest of script
}
```

---

## Immediate Action Plan

### Step 1: Fix .env.local (DO THIS NOW)
```bash
cd apps/epox-platform

# Backup current .env.local
cp .env.local .env.production.backup

# Update .env.local for local development
cat > .env.local << 'EOF'
# Local PostgreSQL (safe for development)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/epox_dev'
NODE_ENV='development'

# Copy other non-production values from .env.production.backup
EOF
```

### Step 2: Create Local Development Database
```bash
# Start local PostgreSQL (creates container named "epox-dev")
cd packages/visualizer-db
yarn db:start

# Push schema
yarn db:push:local
```

### Step 3: Add Database Connection Guards
- Implement `validateDatabaseConnection()` in `src/client.ts`
- Add checks to test helpers in `testkit.ts`

### Step 4: Update Documentation
- Document local vs production database setup
- Add warnings to README about DATABASE_URL safety

---

## Testing the Fixes

After implementing fixes, verify:

1. ✅ Local development connects to localhost:5432
2. ✅ Attempting to connect to production from local machine throws error
3. ✅ Tests still run against localhost:5434
4. ✅ Production deployment (Vercel) still uses Neon database

---

## Long-Term Improvements

1. **Separate test package**: Move `testkit.ts` to `@internal/visualizer-db-testkit`
2. **Environment-specific configs**: Use different config files per environment
3. **Database audit logging**: Track all destructive operations
4. **Read-only connections**: Use read-only credentials for scripts that don't need write access
5. **Pre-commit hooks**: Check for production DATABASE_URL in .env.local

---

**Last Updated**: 2026-01-26
**Status**: CRITICAL - Requires immediate action
