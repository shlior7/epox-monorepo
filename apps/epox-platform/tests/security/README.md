# Security Regression Tests

This directory contains security regression tests that verify all critical vulnerabilities identified in the 2026-01-21 security audit remain fixed.

## Purpose

These tests ensure that:

1. All API routes require proper authentication
2. Ownership verification prevents cross-client data access
3. Error messages don't leak sensitive information
4. Rate limiting is applied to public endpoints
5. Production environment guards are in place

## Running Tests

```bash
# Run all security tests
npm test tests/security

# Run with coverage
npm test tests/security -- --coverage

# Watch mode during development
npm test tests/security -- --watch
```

## CI/CD Integration

### GitHub Actions Example

Add this to your `.github/workflows/security-tests.yml`:

```yaml
name: Security Regression Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  security-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Security Regression Tests
        run: npm test tests/security -- --reporter=verbose

      - name: Check for security test failures
        run: |
          if [ $? -ne 0 ]; then
            echo "❌ Security tests failed - deployment blocked"
            exit 1
          fi

      - name: Security Test Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-test-results
          path: test-results/
```

## Test Coverage

### Authentication Tests (CRITICAL)

- ✅ `/api/collections/[id]/generate` - Requires auth + ownership
- ✅ `/api/collections/[id]/flows` - Requires auth + ownership (GET/POST)
- ✅ `/api/studio` - Requires auth (GET/POST)
- ✅ `/api/studio/[id]/settings` - Requires auth + ownership
- ✅ `/api/jobs/[id]` - Requires auth + ownership
- ✅ `/api/explore/search` - Public with rate limiting
- ✅ `/api/store-connection/status` - Requires auth

### Ownership Verification Tests (CRITICAL)

All mutation endpoints (POST, PATCH, DELETE) verify that the authenticated client owns the resource before allowing modifications.

### Error Handling Tests (MEDIUM)

- ✅ No raw error messages exposed
- ✅ No stack traces in responses
- ✅ Generic error messages for 500 errors

### Production Readiness Tests (HIGH)

- ✅ `getServerAuthWithFallback()` has NODE_ENV check
- ✅ Development fallback unreachable in production

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All security regression tests pass
- [ ] No new authentication bypasses introduced
- [ ] Error handling doesn't leak sensitive data
- [ ] `NODE_ENV=production` is set in production environment
- [ ] Rate limiting is configured correctly

## Adding New Tests

When adding new API routes:

1. Add authentication tests to `auth-regression.test.ts`
2. Add ownership verification tests if the route mutates resources
3. Add error handling tests for any new error paths
4. Update this README with the new coverage

## Related Documents

- [Security Audit Report](../../SECURITY_AUDIT_2026-01-21.md)
- [Security Middleware Documentation](../../lib/security/README.md)
- [Authentication Guide](../../docs/authentication.md)

## Contact

For security concerns, contact: [security@yourcompany.com](mailto:security@yourcompany.com)
