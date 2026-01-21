/**
 * Image Generation Flow Tests
 * Tests image generation workflow including:
 * - Job creation in PostgreSQL
 * - Prompt building
 * - Request validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as generateImages } from '@/app/api/generate-images/route';
import { NextRequest } from 'next/server';

vi.mock('visualizer-ai', () => ({
  enqueueImageGeneration: vi.fn(),
}));

// Mock auth
vi.mock('@/lib/services/get-auth', () => ({
  getClientId: vi.fn(() => Promise.resolve('test-client')),
}));

import { enqueueImageGeneration } from 'visualizer-ai';

describe('Image Generation Flow - POST /api/generate-images', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(enqueueImageGeneration).mockResolvedValue({
      jobId: 'job-123',
      expectedImageIds: [],
    });
  });

  describe('Request Validation', () => {
    it('should validate sessionId is required', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          productIds: ['prod-1'],
          promptTags: {},
        }),
      });

      const response = await generateImages(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('sessionId');
    });

    it('should validate productIds is required', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          // Missing productIds
        }),
      });

      const response = await generateImages(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('productIds');
    });

    it('should validate productIds is not empty array', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: [],
        }),
      });

      const response = await generateImages(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('productIds');
    });
  });

  describe('Job Creation', () => {
    it('should create a generation job in the database', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
          promptTags: {
            sceneType: ['Living Room'],
            mood: ['Cozy'],
            lighting: ['Natural'],
            style: ['Modern'],
            custom: [],
          },
        }),
      });

      const response = await generateImages(request);

      expect(response.status).toBe(200);
      expect(enqueueImageGeneration).toHaveBeenCalledTimes(1);
      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.objectContaining({
          sessionId: 'session-1',
          productIds: ['prod-1'],
        }),
        expect.objectContaining({
          flowId: 'session-1',
          priority: 100,
        })
      );
    });

    it('should return job ID and status', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
        }),
      });

      const response = await generateImages(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobId).toBe('job-123');
      expect(data.status).toBe('queued');
      expect(data.queueType).toBe('postgres');
    });

    it('should calculate expected image count based on variants', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1', 'prod-2', 'prod-3'],
          settings: {
            variantsPerProduct: 2,
          },
        }),
      });

      const response = await generateImages(request);
      const data = await response.json();

      expect(data.expectedImageCount).toBe(6); // 3 products * 2 variants
    });

    it('should default to 4 variants per product', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
        }),
      });

      const response = await generateImages(request);
      const data = await response.json();

      expect(data.expectedImageCount).toBe(4); // 1 product * 4 default variants
    });
  });

  describe('Prompt Tags Normalization', () => {
    it('should normalize string tags to arrays', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
          promptTags: {
            sceneType: 'Living Room', // String, not array
            mood: 'Cozy',
            lighting: 'Natural',
            style: 'Modern',
            custom: ['custom-tag'],
          },
        }),
      });

      await generateImages(request);

      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.objectContaining({
          promptTags: expect.objectContaining({
            sceneType: ['Living Room'],
            mood: ['Cozy'],
            lighting: ['Natural'],
            style: ['Modern'],
          }),
        }),
        expect.anything()
      );
    });

    it('should handle extra custom keys by adding them to custom array', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
          promptTags: {
            sceneType: ['Bedroom'],
            mood: [],
            lighting: [],
            style: [],
            custom: [],
            material: 'wood', // Extra key
            color: 'white', // Extra key
          },
        }),
      });

      await generateImages(request);

      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.objectContaining({
          promptTags: expect.objectContaining({
            custom: expect.arrayContaining(['material: wood', 'color: white']),
          }),
        }),
        expect.anything()
      );
    });
  });

  describe('Custom Prompt Handling', () => {
    it('should include user custom prompt in payload', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
          prompt: 'Show product on a marble countertop',
        }),
      });

      await generateImages(request);

      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.objectContaining({
          customPrompt: 'Show product on a marble countertop',
        }),
        expect.anything()
      );
    });

    it('should trim whitespace from custom prompt', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
          prompt: '  Show product outdoors  ',
        }),
      });

      await generateImages(request);

      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.objectContaining({
          customPrompt: 'Show product outdoors',
        }),
        expect.anything()
      );
    });

    it('should not include customPrompt when prompt is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
          prompt: '   ',
        }),
      });

      await generateImages(request);

      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.objectContaining({
          customPrompt: undefined,
        }),
        expect.anything()
      );
    });
  });

  describe('Settings Handling', () => {
    it('should pass settings to job payload', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
          settings: {
            aspectRatio: '16:9',
            imageQuality: '4k',
            variantsPerProduct: 2,
          },
        }),
      });

      await generateImages(request);

      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.objectContaining({
          settings: expect.objectContaining({
            aspectRatio: '16:9',
            imageQuality: '4k',
            numberOfVariants: 2,
          }),
        }),
        expect.anything()
      );
    });

    it('should include product and inspiration image URLs in payload', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
          productImageUrls: ['https://example.com/product.jpg'],
          inspirationImageUrls: ['https://example.com/inspo.jpg'],
        }),
      });

      await generateImages(request);

      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.objectContaining({
          productImageUrls: ['https://example.com/product.jpg'],
          inspirationImageUrls: ['https://example.com/inspo.jpg'],
        }),
        expect.anything()
      );
    });
  });

  describe('Priority Handling', () => {
    it('should set higher priority (lower number) for urgent requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
          urgent: true,
        }),
      });

      await generateImages(request);

      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.anything(),
        expect.objectContaining({
          priority: 50, // Higher priority
        })
      );
    });

    it('should set normal priority for non-urgent requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
          urgent: false,
        }),
      });

      await generateImages(request);

      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.anything(),
        expect.objectContaining({
          priority: 100, // Normal priority
        })
      );
    });
  });

  describe('Response Format', () => {
    it('should return truncated prompt in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
        }),
      });

      const response = await generateImages(request);
      const data = await response.json();

      expect(data.prompt).toBeDefined();
      expect(data.prompt.length).toBeLessThanOrEqual(500);
    });

    it('should return message with product count', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1', 'prod-2'],
        }),
      });

      const response = await generateImages(request);
      const data = await response.json();

      expect(data.message).toContain('2 products');
    });
  });

  describe('Error Handling', () => {
    it('should handle queue errors gracefully', async () => {
      vi.mocked(enqueueImageGeneration).mockRejectedValue(new Error('Queue down'));

      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session-1',
          productIds: ['prod-1'],
        }),
      });

      const response = await generateImages(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Client ID Handling', () => {
    it('should ignore clientId from request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-images', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'custom-client',
          sessionId: 'session-1',
          productIds: ['prod-1'],
        }),
      });

      await generateImages(request);

      expect(enqueueImageGeneration).toHaveBeenCalledWith(
        'test-client',
        expect.anything(),
        expect.anything()
      );
    });
  });
});
