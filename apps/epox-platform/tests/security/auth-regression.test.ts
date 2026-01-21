/**
 * Security Regression Test Suite
 *
 * Tests all 7 critical vulnerabilities fixed in the security audit (2026-01-21)
 * These tests ensure that the security fixes remain in place and prevent regression.
 *
 * CRITICAL: All tests in this file must pass before production deployment.
 *
 * Vulnerabilities tested:
 * 1. CRITICAL-001: Unprotected Image Generation Endpoint
 * 2. CRITICAL-002: Unauthenticated Collection Flow Access
 * 3. CRITICAL-003: Studio Endpoints Missing Authentication
 * 4. CRITICAL-004: Studio Settings Endpoint Lacks Ownership Verification
 * 5. MEDIUM-002: Job Status Endpoint Leaks Information (formerly CRITICAL-005)
 * 6. MEDIUM-001: Unsplash Search Proxy Lacks Rate Limiting
 * 7. INFORMATIONAL-001: Store Connection Routes Use Legacy Pattern
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Import route handlers
import { POST as generateImages } from '@/app/api/collections/[id]/generate/route';
import { GET as getFlows, POST as createFlow } from '@/app/api/collections/[id]/flows/route';
import { GET as getStudioSessions, POST as createStudioSession } from '@/app/api/studio/route';
import {
  GET as getStudioSettings,
  PATCH as updateStudioSettings,
} from '@/app/api/studio/[id]/settings/route';
import { GET as getJobStatus } from '@/app/api/jobs/[id]/route';
import { GET as searchUnsplash } from '@/app/api/explore/search/route';
import { GET as getStoreStatus } from '@/app/api/store-connection/status/route';

// Mock the security middleware to allow testing both authenticated and unauthenticated scenarios
vi.mock('@/lib/security/middleware', () => ({
  withSecurity: (handler: any) => {
    return async (request: any, contextOrParams?: any, paramsWrapper?: any) => {
      // Extract context from the request headers mock
      const authHeader = request.headers.get('x-test-client-id');

      if (!authHeader) {
        // No auth header - middleware should block
        const { NextResponse } = await import('next/server');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Simulate authenticated context
      const context = { clientId: authHeader };
      const params = paramsWrapper || contextOrParams;

      return handler(request, context, params);
    };
  },
  withPublicSecurity: (handler: any) => handler,
  withGenerationSecurity: (handler: any) => {
    return async (request: any, contextOrParams?: any, paramsWrapper?: any) => {
      const authHeader = request.headers.get('x-test-client-id');

      if (!authHeader) {
        const { NextResponse } = await import('next/server');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const context = { clientId: authHeader };
      const params = paramsWrapper || contextOrParams;

      return handler(request, context, params);
    };
  },
  withUploadSecurity: (handler: any) => {
    return async (request: any, contextOrParams?: any, paramsWrapper?: any) => {
      const authHeader = request.headers.get('x-test-client-id');

      if (!authHeader) {
        const { NextResponse } = await import('next/server');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const context = { clientId: authHeader };
      const params = paramsWrapper || contextOrParams;

      return handler(request, context, params);
    };
  },
}));

// Mock auth verification functions
vi.mock('@/lib/security/auth', () => ({
  verifyOwnership: vi.fn((params: any) => {
    // Simulate ownership verification
    // Returns true if clientId matches resourceClientId
    return params.clientId === params.resourceClientId;
  }),
  forbiddenResponse: vi.fn(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }),
}));

// Mock database
vi.mock('@/lib/services/db', () => ({
  db: {
    collectionSessions: {
      getById: vi.fn(),
    },
    generationFlows: {
      getById: vi.fn(),
      listByCollectionSession: vi.fn(),
      create: vi.fn(),
    },
    studioSessions: {
      list: vi.fn(),
      create: vi.fn(),
      getById: vi.fn(),
    },
    products: {
      getById: vi.fn(),
    },
  },
}));

// Mock AI services
vi.mock('visualizer-ai', () => ({
  getJobStatus: vi.fn(),
  triggerGeneration: vi.fn(),
}));

// Mock store service
vi.mock('@/lib/services/erp', () => ({
  getStoreService: vi.fn(() => ({
    getConnection: vi.fn(),
  })),
}));

import { db } from '@/lib/services/db';
import { getJobStatus as getJobStatusService } from 'visualizer-ai';

describe('Security Regression Tests - Authentication Requirements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CRITICAL-001: Image Generation Endpoint', () => {
    it('should reject unauthenticated requests to POST /api/collections/[id]/generate', async () => {
      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
        method: 'POST',
        body: JSON.stringify({ settings: {} }),
      });

      const response = await generateImages(request, { params: Promise.resolve({ id: 'coll-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should allow authenticated requests to POST /api/collections/[id]/generate', async () => {
      // Mock collection owned by client-1
      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'client-1',
        name: 'Test Collection',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        status: 'draft',
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
        method: 'POST',
        headers: { 'x-test-client-id': 'client-1' },
        body: JSON.stringify({ settings: {} }),
      });

      const response = await generateImages(request, { params: Promise.resolve({ id: 'coll-1' }) });

      // Should not be 401 (authenticated)
      expect(response.status).not.toBe(401);
    });

    it('should reject cross-client access attempts (ownership verification)', async () => {
      // Mock collection owned by client-2
      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'client-2', // Different client
        name: 'Test Collection',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        status: 'draft',
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
        method: 'POST',
        headers: { 'x-test-client-id': 'client-1' }, // Authenticated as client-1
        body: JSON.stringify({ settings: {} }),
      });

      const response = await generateImages(request, { params: Promise.resolve({ id: 'coll-1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Forbidden');
    });
  });

  describe('CRITICAL-002: Collection Flow Access', () => {
    it('should reject unauthenticated GET requests to /api/collections/[id]/flows', async () => {
      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/flows');

      const response = await getFlows(request, { params: Promise.resolve({ id: 'coll-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should reject unauthenticated POST requests to /api/collections/[id]/flows', async () => {
      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/flows', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Flow' }),
      });

      const response = await createFlow(request, { params: Promise.resolve({ id: 'coll-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should block cross-client flow creation', async () => {
      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'client-2', // Different client
        name: 'Test Collection',
        productIds: [],
        selectedBaseImages: {},
        status: 'draft',
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/flows', {
        method: 'POST',
        headers: { 'x-test-client-id': 'client-1' },
        body: JSON.stringify({ name: 'Test Flow' }),
      });

      const response = await createFlow(request, { params: Promise.resolve({ id: 'coll-1' }) });

      expect(response.status).toBe(403);
    });
  });

  describe('CRITICAL-003: Studio Endpoints Missing Authentication', () => {
    it('should reject unauthenticated GET requests to /api/studio', async () => {
      const request = new NextRequest('http://localhost:3000/api/studio');

      const response = await getStudioSessions(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should reject unauthenticated POST requests to /api/studio', async () => {
      const request = new NextRequest('http://localhost:3000/api/studio', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod-1' }),
      });

      const response = await createStudioSession(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('CRITICAL-004: Studio Settings Lacks Ownership Verification', () => {
    it('should reject unauthenticated GET requests to /api/studio/[id]/settings', async () => {
      const request = new NextRequest('http://localhost:3000/api/studio/flow-1/settings');

      const response = await getStudioSettings(request, {
        params: Promise.resolve({ id: 'flow-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should block cross-client studio settings updates', async () => {
      vi.mocked(db.generationFlows.getById).mockResolvedValue({
        id: 'flow-1',
        clientId: 'client-2', // Different client
        name: 'Test Flow',
        status: 'draft',
        settings: {},
        collectionSessionId: 'coll-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const request = new NextRequest('http://localhost:3000/api/studio/flow-1/settings', {
        method: 'PATCH',
        headers: { 'x-test-client-id': 'client-1' },
        body: JSON.stringify({ settings: { aspectRatio: '16:9' } }),
      });

      const response = await updateStudioSettings(request, {
        params: Promise.resolve({ id: 'flow-1' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('MEDIUM-002: Job Status Endpoint Leaks Information', () => {
    it('should reject unauthenticated requests to /api/jobs/[id]', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/job-1');

      const response = await getJobStatus(request, { params: Promise.resolve({ id: 'job-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should block cross-client job status access', async () => {
      vi.mocked(getJobStatusService).mockResolvedValue({
        id: 'job-1',
        clientId: 'client-2', // Different client
        status: 'completed',
        progress: 100,
        result: { url: 'https://example.com/image.png' },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/jobs/job-1', {
        headers: { 'x-test-client-id': 'client-1' },
      });

      const response = await getJobStatus(request, { params: Promise.resolve({ id: 'job-1' }) });

      expect(response.status).toBe(403);
    });
  });

  describe('MEDIUM-001: Rate Limiting on Public Endpoints', () => {
    it('should allow public access to /api/explore/search (with rate limiting)', async () => {
      // Mock Unsplash API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [], total: 0, total_pages: 0 }),
      });

      const request = new NextRequest('http://localhost:3000/api/explore/search?q=interior');

      const response = await searchUnsplash(request);

      // Public endpoint - should not require auth
      expect(response.status).not.toBe(401);

      // Should have rate limit headers (tested separately in rate limit tests)
      // This test just verifies the endpoint is accessible
    });
  });

  describe('INFORMATIONAL-001: Store Connection Routes', () => {
    it('should require authentication for /api/store-connection/status', async () => {
      const request = new NextRequest('http://localhost:3000/api/store-connection/status');

      const response = await getStoreStatus(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });
  });
});

describe('Security Regression Tests - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not expose raw error messages to clients', async () => {
    // Force an error in the database layer
    vi.mocked(db.collectionSessions.getById).mockRejectedValue(
      new Error(
        'Database connection failed: Connection timeout on host db.internal.example.com:5432'
      )
    );

    const request = new NextRequest('http://localhost:3000/api/collections/coll-1/flows', {
      headers: { 'x-test-client-id': 'client-1' },
    });

    const response = await getFlows(request, { params: Promise.resolve({ id: 'coll-1' }) });
    const data = await response.json();

    // Should return generic error message
    expect(response.status).toBe(500);
    expect(data.error).not.toContain('db.internal.example.com');
    expect(data.error).not.toContain('Connection timeout');
    expect(data.error).toBe('Internal Server Error');
  });

  it('should not leak stack traces in error responses', async () => {
    vi.mocked(db.generationFlows.getById).mockRejectedValue(
      new Error('Unexpected error with stack trace')
    );

    const request = new NextRequest('http://localhost:3000/api/studio/flow-1/settings', {
      headers: { 'x-test-client-id': 'client-1' },
    });

    const response = await getStudioSettings(request, {
      params: Promise.resolve({ id: 'flow-1' }),
    });
    const data = await response.json();

    // Should not expose stack traces
    expect(JSON.stringify(data)).not.toContain('at ');
    expect(JSON.stringify(data)).not.toContain('.ts:');
  });
});

describe('Security Regression Tests - Production Readiness', () => {
  it('should have NODE_ENV check in getServerAuthWithFallback', async () => {
    // This test verifies the production guard exists
    const getAuthModule = await import('@/lib/services/get-auth');
    const source = getAuthModule.getServerAuthWithFallback.toString();

    // Verify NODE_ENV check exists
    expect(source).toContain('NODE_ENV');
    expect(source).toContain('production');
  });
});
