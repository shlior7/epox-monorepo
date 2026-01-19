/**
 * Video Generation API Tests
 * Tests video generation job creation and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as generateVideo } from '@/app/api/generate-video/route';
import { NextRequest } from 'next/server';

vi.mock('visualizer-ai', () => ({
  enqueueVideoGeneration: vi.fn(),
}));

vi.mock('@/lib/services/get-auth', () => ({
  getClientId: vi.fn(() => Promise.resolve('test-client')),
}));

import { enqueueVideoGeneration } from 'visualizer-ai';

describe('Video Generation API - POST /api/generate-video', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(enqueueVideoGeneration).mockResolvedValue({
      jobId: 'job-vid-123',
    });
  });

  it('should require sessionId', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod-1',
        sourceImageUrl: 'https://example.com/base.png',
        prompt: 'Pan around the product',
      }),
    });

    const response = await generateVideo(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('sessionId');
  });

  it('should require productId', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'flow-1',
        sourceImageUrl: 'https://example.com/base.png',
        prompt: 'Pan around the product',
      }),
    });

    const response = await generateVideo(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('productId');
  });

  it('should require sourceImageUrl', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'flow-1',
        productId: 'prod-1',
        prompt: 'Pan around the product',
      }),
    });

    const response = await generateVideo(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('sourceImageUrl');
  });

  it('should require prompt', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'flow-1',
        productId: 'prod-1',
        sourceImageUrl: 'https://example.com/base.png',
      }),
    });

    const response = await generateVideo(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('prompt');
  });

  it('should create a video generation job', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'flow-1',
        productId: 'prod-1',
        sourceImageUrl: 'https://example.com/base.png',
        prompt: 'Pan around the product',
        settings: {
          durationSeconds: 6,
        },
      }),
    });

    const response = await generateVideo(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(enqueueVideoGeneration).toHaveBeenCalledTimes(1);
    expect(enqueueVideoGeneration).toHaveBeenCalledWith(
      'test-client',
      expect.objectContaining({
        sessionId: 'flow-1',
        productIds: ['prod-1'],
        sourceImageUrl: 'https://example.com/base.png',
        prompt: 'Pan around the product',
        settings: expect.objectContaining({
          durationSeconds: 6,
        }),
      }),
      expect.objectContaining({
        flowId: 'flow-1',
        priority: 100,
      })
    );
    expect(data.jobId).toBe('job-vid-123');
    expect(data.status).toBe('queued');
    expect(data.queueType).toBe('postgres');
  });

  it('should ignore clientId from request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        clientId: 'custom-client',
        sessionId: 'flow-1',
        productId: 'prod-1',
        sourceImageUrl: 'https://example.com/base.png',
        prompt: 'Pan around the product',
      }),
    });

    const response = await generateVideo(request);

    expect(response.status).toBe(200);
    expect(enqueueVideoGeneration).toHaveBeenCalledWith(
      'test-client',
      expect.anything(),
      expect.anything()
    );
  });

  it('should set urgent priority when requested', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'flow-1',
        productId: 'prod-1',
        sourceImageUrl: 'https://example.com/base.png',
        prompt: 'Pan around the product',
        urgent: true,
      }),
    });

    const response = await generateVideo(request);

    expect(response.status).toBe(200);
    expect(enqueueVideoGeneration).toHaveBeenCalledWith(
      'test-client',
      expect.anything(),
      expect.objectContaining({
        priority: 50,
      })
    );
  });

  it('should trim prompt and include inspiration data', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'flow-1',
        productId: 'prod-1',
        sourceImageUrl: 'https://example.com/base.png',
        prompt: '  Pan around the product  ',
        inspirationImageUrl: 'https://example.com/inspo.jpg',
        inspirationNote: 'Warm, cinematic lighting',
        settings: {
          durationSeconds: 8,
          fps: 24,
          model: 'veo-3.1-generate-preview',
        },
      }),
    });

    const response = await generateVideo(request);

    expect(response.status).toBe(200);
    expect(enqueueVideoGeneration).toHaveBeenCalledWith(
      'test-client',
      expect.objectContaining({
        prompt: 'Pan around the product',
        inspirationImageUrl: 'https://example.com/inspo.jpg',
        inspirationNote: 'Warm, cinematic lighting',
        settings: {
          durationSeconds: 8,
          fps: 24,
          model: 'veo-3.1-generate-preview',
        },
      }),
      expect.anything()
    );
  });

  it('should handle job creation errors', async () => {
    vi.mocked(enqueueVideoGeneration).mockRejectedValueOnce(new Error('Queue down'));

    const request = new NextRequest('http://localhost:3000/api/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'flow-1',
        productId: 'prod-1',
        sourceImageUrl: 'https://example.com/base.png',
        prompt: 'Pan around the product',
      }),
    });

    const response = await generateVideo(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
