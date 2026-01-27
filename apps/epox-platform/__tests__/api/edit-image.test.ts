/**
 * Edit Image API Tests
 *
 * Tests the R2 temp storage flow for image editing:
 * - Base image is uploaded to R2 temp storage
 * - Job payload contains R2 URL (not data URL)
 * - Image exists at the R2 URL
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
// Mock visualizer-storage
vi.mock('visualizer-storage', () => ({
  storage: {
    upload: vi.fn(),
    getPublicUrl: vi.fn((key: string) => `https://r2.example.com/${key}`),
    download: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    list: vi.fn(),
  },
  storagePaths: {
    editSessionBase: (clientId: string, sessionId: string) =>
      `tmp/edit-sessions/${clientId}/${sessionId}/base.webp`,
    editSessionRevision: (clientId: string, sessionId: string, revisionId: string) =>
      `tmp/edit-sessions/${clientId}/${sessionId}/${revisionId}.webp`,
    editSessionPrefix: (clientId: string, sessionId: string) =>
      `tmp/edit-sessions/${clientId}/${sessionId}/`,
  },
}));

// Mock auth
vi.mock('@/lib/services/get-auth', () => ({
  getClientId: vi.fn(() => Promise.resolve('test-client')),
}));

// Mock security middleware to pass through
vi.mock('@/lib/security', () => ({
  withGenerationSecurity: (handler: any) => {
    return async (request: NextRequest) => {
      return handler(request, { clientId: 'test-client' });
    };
  },
  validateImageUrl: (url: string) => {
    if (!url) return { valid: false, error: 'Missing URL' };
    if (!url.startsWith('data:image/')) return { valid: false, error: 'Invalid data URL' };
    return { valid: true };
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logJobStarted: vi.fn(),
}));

// Mock visualizer-ai
vi.mock('visualizer-ai', () => ({
  enqueueImageEdit: vi.fn(),
}));

// Import after mocks are set up
import { POST as editImage } from '@/app/api/edit-image/route';
import { storage } from 'visualizer-storage';
import { enqueueImageEdit } from 'visualizer-ai';

// Sample base64 PNG (1x1 red pixel)
const SAMPLE_BASE64_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Get mocked functions for assertions
const mockStorage = vi.mocked(storage);
const mockEnqueueImageEdit = vi.mocked(enqueueImageEdit);

describe('Edit Image API - POST /api/edit-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockEnqueueImageEdit.mockResolvedValue({
      jobId: 'job-123',
      expectedImageId: 'img-123',
    });

    mockStorage.upload.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Validation', () => {
    it('should require baseImageDataUrl', async () => {
      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it blue',
          editSessionId: 'session-123',
        }),
      });

      const response = await editImage(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('baseImageDataUrl');
    });

    it('should require prompt', async () => {
      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: SAMPLE_BASE64_PNG,
          editSessionId: 'session-123',
        }),
      });

      const response = await editImage(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('prompt');
    });

    it('should require editSessionId', async () => {
      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: SAMPLE_BASE64_PNG,
          prompt: 'Make it blue',
        }),
      });

      const response = await editImage(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('editSessionId');
    });

    it('should validate image data URL format', async () => {
      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: 'not-a-data-url',
          prompt: 'Make it blue',
          editSessionId: 'session-123',
        }),
      });

      const response = await editImage(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('R2 Temp Storage Flow', () => {
    it('should upload base image to R2 temp storage', async () => {
      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: SAMPLE_BASE64_PNG,
          prompt: 'Make it blue',
          editSessionId: 'session-123',
        }),
      });

      await editImage(request);

      // Verify storage.upload was called with the correct key
      expect(mockStorage.upload).toHaveBeenCalledTimes(1);
      expect(mockStorage.upload).toHaveBeenCalledWith(
        'tmp/edit-sessions/test-client/session-123/base.webp',
        expect.any(Buffer),
        'image/png'
      );
    });

    it('should pass R2 URL in job payload instead of data URL', async () => {
      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: SAMPLE_BASE64_PNG,
          prompt: 'Make it blue',
          editSessionId: 'session-123',
        }),
      });

      await editImage(request);

      // Verify enqueueImageEdit was called
      expect(mockEnqueueImageEdit).toHaveBeenCalledTimes(1);

      // Get the payload that was passed
      const [clientId, payload, options] = mockEnqueueImageEdit.mock.calls[0];

      expect(clientId).toBe('test-client');

      // The sourceImageUrl should be an R2 URL, not a data URL
      expect(payload.sourceImageUrl).toBe(
        'https://r2.example.com/tmp/edit-sessions/test-client/session-123/base.webp'
      );
      expect(payload.sourceImageUrl).not.toContain('data:');

      // Verify tempStoragePrefix is set
      expect(payload.tempStoragePrefix).toBe('tmp/edit-sessions/test-client/session-123/');

      // Verify other payload fields
      expect(payload.editPrompt).toBe('Make it blue');
      expect(payload.sessionId).toBe('session-123');
      expect(payload.previewOnly).toBe(true);
    });

    it('should include productId in payload when provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: SAMPLE_BASE64_PNG,
          prompt: 'Make it blue',
          editSessionId: 'session-123',
          productId: 'prod-456',
        }),
      });

      await editImage(request);

      const [, payload] = mockEnqueueImageEdit.mock.calls[0];
      expect(payload.productId).toBe('prod-456');
    });

    it('should include sourceAssetId in payload when provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: SAMPLE_BASE64_PNG,
          prompt: 'Make it blue',
          editSessionId: 'session-123',
          sourceAssetId: 'asset-789',
        }),
      });

      await editImage(request);

      const [, payload] = mockEnqueueImageEdit.mock.calls[0];
      expect(payload.sourceAssetId).toBe('asset-789');
    });

    it('should include reference images in payload when provided', async () => {
      const referenceImages = [
        { url: 'https://example.com/ref1.jpg', componentName: 'background' },
        { url: 'https://example.com/ref2.jpg', componentName: 'foreground' },
      ];

      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: SAMPLE_BASE64_PNG,
          prompt: 'Make it blue',
          editSessionId: 'session-123',
          referenceImages,
        }),
      });

      await editImage(request);

      const [, payload] = mockEnqueueImageEdit.mock.calls[0];
      expect(payload.referenceImages).toEqual(referenceImages);
    });
  });

  describe('Response Format', () => {
    it('should return job ID and status', async () => {
      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: SAMPLE_BASE64_PNG,
          prompt: 'Make it blue',
          editSessionId: 'session-123',
        }),
      });

      const response = await editImage(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobId).toBe('job-123');
      expect(data.status).toBe('queued');
      expect(data.expectedImageId).toBe('img-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage upload errors', async () => {
      mockStorage.upload.mockRejectedValueOnce(new Error('Storage unavailable'));

      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: SAMPLE_BASE64_PNG,
          prompt: 'Make it blue',
          editSessionId: 'session-123',
        }),
      });

      const response = await editImage(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle job queue errors', async () => {
      mockEnqueueImageEdit.mockRejectedValueOnce(new Error('Queue unavailable'));

      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: SAMPLE_BASE64_PNG,
          prompt: 'Make it blue',
          editSessionId: 'session-123',
        }),
      });

      const response = await editImage(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('Job Payload Size', () => {
    it('should not include large data URL in job payload', async () => {
      // Create a larger image (still valid base64)
      const largeImageData = 'A'.repeat(100000); // 100KB of 'A's
      const largeBase64 = `data:image/png;base64,${Buffer.from(largeImageData).toString('base64')}`;

      const request = new NextRequest('http://localhost:3000/api/edit-image', {
        method: 'POST',
        body: JSON.stringify({
          baseImageDataUrl: largeBase64,
          prompt: 'Make it blue',
          editSessionId: 'session-123',
        }),
      });

      await editImage(request);

      const [, payload] = mockEnqueueImageEdit.mock.calls[0];

      // The sourceImageUrl should be a short R2 URL
      expect(payload.sourceImageUrl.length).toBeLessThan(200);

      // The payload should not contain the large base64 data
      const payloadString = JSON.stringify(payload);
      expect(payloadString.length).toBeLessThan(1000);
    });
  });
});

describe('Edit Image Cleanup API - POST /api/edit-image/cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete all files in edit session prefix', async () => {
    // Import the cleanup route
    const { POST: cleanup } = await import('@/app/api/edit-image/cleanup/route');

    // Mock files to delete
    mockStorage.list.mockResolvedValue([
      {
        key: 'tmp/edit-sessions/test-client/session-123/base.webp',
        size: 1000,
        lastModified: new Date(),
      },
      {
        key: 'tmp/edit-sessions/test-client/session-123/rev1.webp',
        size: 1000,
        lastModified: new Date(),
      },
      {
        key: 'tmp/edit-sessions/test-client/session-123/rev2.webp',
        size: 1000,
        lastModified: new Date(),
      },
    ]);
    mockStorage.delete.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/edit-image/cleanup', {
      method: 'POST',
      body: JSON.stringify({
        editSessionId: 'session-123',
      }),
    });

    const response = await cleanup(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deletedCount).toBe(3);

    // Verify list was called with correct prefix
    expect(mockStorage.list).toHaveBeenCalledWith('tmp/edit-sessions/test-client/session-123/');

    // Verify delete was called for each file
    expect(mockStorage.delete).toHaveBeenCalledTimes(3);
    expect(mockStorage.delete).toHaveBeenCalledWith(
      'tmp/edit-sessions/test-client/session-123/base.webp'
    );
    expect(mockStorage.delete).toHaveBeenCalledWith(
      'tmp/edit-sessions/test-client/session-123/rev1.webp'
    );
    expect(mockStorage.delete).toHaveBeenCalledWith(
      'tmp/edit-sessions/test-client/session-123/rev2.webp'
    );
  });

  it('should handle empty session (no files to delete)', async () => {
    const { POST: cleanup } = await import('@/app/api/edit-image/cleanup/route');

    mockStorage.list.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/edit-image/cleanup', {
      method: 'POST',
      body: JSON.stringify({
        editSessionId: 'empty-session',
      }),
    });

    const response = await cleanup(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deletedCount).toBe(0);
  });
});
