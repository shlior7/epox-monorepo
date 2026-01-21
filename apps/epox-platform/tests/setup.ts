/**
 * Test setup file
 * Runs before all tests
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Set test environment variables
// Use bracket notation to avoid TypeScript read-only error for NODE_ENV
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.STORAGE_DRIVER = 'filesystem';
process.env.LOCAL_STORAGE_DIR = '.test-storage';

// Mock security middleware globally for all tests
vi.mock('@/lib/security/middleware', () => ({
  withSecurity: (handler: any) => {
    return async (request: any, contextOrParams?: any, paramsWrapper?: any) => {
      try {
        // Extract test client ID from headers
        const clientId = request.headers.get('x-test-client-id') || 'test-client';

        // Create authenticated context
        const context = { clientId };
        const params = paramsWrapper || contextOrParams;

        return await handler(request, context, params);
      } catch (error) {
        // In test environment, return generic error message
        const { NextResponse } = await import('next/server');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    };
  },
  withPublicSecurity: (handler: any) => handler,
  withGenerationSecurity: (handler: any) => {
    return async (request: any, contextOrParams?: any, paramsWrapper?: any) => {
      try {
        const clientId = request.headers.get('x-test-client-id') || 'test-client';
        const context = { clientId };
        const params = paramsWrapper || contextOrParams;
        return await handler(request, context, params);
      } catch (error) {
        const { NextResponse } = await import('next/server');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    };
  },
  withUploadSecurity: (handler: any) => {
    return async (request: any, contextOrParams?: any, paramsWrapper?: any) => {
      try {
        const clientId = request.headers.get('x-test-client-id') || 'test-client';
        const context = { clientId };
        const params = paramsWrapper || contextOrParams;
        return await handler(request, context, params);
      } catch (error) {
        const { NextResponse } = await import('next/server');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    };
  },
}));

// Mock auth verification functions
vi.mock('@/lib/security/auth', () => ({
  verifyOwnership: vi.fn((params: any) => {
    // In tests, verify ownership by checking if clientId matches resourceClientId
    if (params.resourceClientId) {
      return params.clientId === params.resourceClientId;
    }
    // If no resourceClientId, assume ownership is valid (for tests)
    return true;
  }),
  forbiddenResponse: vi.fn(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }),
}));

beforeAll(() => {
  console.log('🧪 Test suite initialized');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});
