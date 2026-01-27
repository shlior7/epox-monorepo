/**
 * Gemini-powered API route tests
 */

import { POST as analyzeImage } from '@/app/api/analyze-image/route';
import { POST as editImage, EditImageApiRequest } from '@/app/api/edit-image/route';
import { POST as removeBackground } from '@/app/api/remove-background/route';
import { POST as upscaleImage } from '@/app/api/upscale-image/route';
import { POST as visionScanner } from '@/app/api/vision-scanner/route';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGemini = {
  analyzeComponents: vi.fn(),
  editImage: vi.fn(),
  analyzeInspirationImage: vi.fn(),
};

vi.mock('visualizer-ai', () => {
  class RateLimitError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'RateLimitError';
    }
  }

  return {
    getGeminiService: vi.fn(() => mockGemini),
    enqueueImageEdit: vi.fn(),
    RateLimitError,
  };
});

// Import after mock to get the mocked version
import { enqueueImageEdit } from 'visualizer-ai';
const mockEnqueueImageEdit = vi.mocked(enqueueImageEdit);

beforeEach(() => {
  vi.clearAllMocks();
  mockGemini.analyzeComponents.mockResolvedValue({
    components: [{ id: '1', name: 'floor', description: 'oak floor' }],
    overallDescription: 'A simple room',
    suggestedAdjustments: [],
  });
  mockGemini.editImage.mockResolvedValue({
    editedImageDataUrl: 'data:image/png;base64,edited',
  });
  mockGemini.analyzeInspirationImage.mockResolvedValue({
    styleSummary: 'Warm modern living room',
    detectedSceneType: 'Living Room',
    heroObjectAccessories: {
      identity: 'throw blanket',
      materialPhysics: 'linen',
      placement: 'draped over sofa',
    },
    sceneInventory: [
      {
        identity: 'Back Wall',
        geometry: 'flat',
        surfacePhysics: 'painted plaster',
        colorGrading: 'warm white',
        spatialContext: 'behind sofa',
      },
      {
        identity: 'Floor',
        geometry: 'flat',
        surfacePhysics: 'oak wood',
        colorGrading: 'honey',
        spatialContext: 'underfoot',
      },
      {
        identity: 'Coffee Table',
        geometry: 'rectangular',
        surfacePhysics: 'marble',
        colorGrading: 'white',
        spatialContext: 'center',
      },
    ],
    lightingPhysics: {
      sourceDirection: 'soft daylight from left',
      shadowQuality: 'soft shadows',
      colorTemperature: 'warm',
    },
  });

  mockEnqueueImageEdit.mockResolvedValue({
    jobId: 'job-123',
    expectedImageId: 'image-456',
  });
});

describe('Analyze Image API - POST /api/analyze-image', () => {
  it('should reject missing imageDataUrl', async () => {
    const request = new NextRequest('http://localhost:3000/api/analyze-image', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await analyzeImage(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('imageDataUrl');
  });

  it('should return analysis results', async () => {
    const request = new NextRequest('http://localhost:3000/api/analyze-image', {
      method: 'POST',
      body: JSON.stringify({ imageDataUrl: 'data:image/png;base64,abc' }),
    });

    const response = await analyzeImage(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.components).toHaveLength(1);
  });

  it('should handle service errors', async () => {
    mockGemini.analyzeComponents.mockRejectedValueOnce(new Error('Gemini failed'));

    const request = new NextRequest('http://localhost:3000/api/analyze-image', {
      method: 'POST',
      headers: { 'x-test-client-id': 'test-client' },
      body: JSON.stringify({ imageDataUrl: 'data:image/png;base64,abc' }),
    });

    const response = await analyzeImage(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal Server Error');
  });
});

describe('Edit Image API - POST /api/edit-image', () => {
  it('should reject missing baseImageDataUrl', async () => {
    const request = new NextRequest('http://localhost:3000/api/edit-image', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Make it brighter' }),
    });

    const response = await editImage(request);

    expect(response.status).toBe(400);
  });

  it('should reject missing prompt', async () => {
    const request = new NextRequest('http://localhost:3000/api/edit-image', {
      method: 'POST',
      body: JSON.stringify({ baseImageDataUrl: 'data:image/png;base64,abc' }),
    });

    const response = await editImage(request);

    expect(response.status).toBe(400);
  });

  it('should return edited image data', async () => {
    const body: EditImageApiRequest = {
      baseImageDataUrl: 'data:image/png;base64,abc',
      prompt: 'Make it brighter',
      editSessionId: 'session-123',
    };
    const request = new NextRequest('http://localhost:3000/api/edit-image', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await editImage(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.jobId).toBe('job-123');
    expect(data.status).toBe('queued');
    expect(data.expectedImageId).toBe('image-456');
    expect(data.message).toContain('queued');
  });

  it('should handle edit failures', async () => {
    mockEnqueueImageEdit.mockRejectedValueOnce(new Error('Edit failed'));

    const body: EditImageApiRequest = {
      baseImageDataUrl: 'data:image/png;base64,abc',
      prompt: 'Make it brighter',
      editSessionId: 'session-123',
    };
    const request = new NextRequest('http://localhost:3000/api/edit-image', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await editImage(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('Failed to queue');
  });
});

describe('Remove Background API - POST /api/remove-background', () => {
  it('should reject missing imageDataUrl', async () => {
    const request = new NextRequest('http://localhost:3000/api/remove-background', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await removeBackground(request);

    expect(response.status).toBe(400);
  });

  it('should request shadow preservation when keepShadow is true', async () => {
    mockGemini.editImage.mockResolvedValueOnce({
      editedImageDataUrl: 'data:image/png;base64,edited',
    });

    const request = new NextRequest('http://localhost:3000/api/remove-background', {
      method: 'POST',
      body: JSON.stringify({ imageDataUrl: 'data:image/png;base64,abc', keepShadow: true }),
    });

    const response = await removeBackground(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.imageDataUrl).toContain('data:image');
    expect(mockGemini.editImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Keep natural shadows'),
      })
    );
  });

  it('should request shadow removal when keepShadow is false', async () => {
    const request = new NextRequest('http://localhost:3000/api/remove-background', {
      method: 'POST',
      body: JSON.stringify({ imageDataUrl: 'data:image/png;base64,abc' }),
    });

    const response = await removeBackground(request);

    expect(response.status).toBe(200);
    expect(mockGemini.editImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Remove all shadows'),
      })
    );
  });

  it('should handle removal failures', async () => {
    mockGemini.editImage.mockRejectedValueOnce(new Error('Removal failed'));

    const request = new NextRequest('http://localhost:3000/api/remove-background', {
      method: 'POST',
      headers: { 'x-test-client-id': 'test-client' },
      body: JSON.stringify({ imageDataUrl: 'data:image/png;base64,abc' }),
    });

    const response = await removeBackground(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal Server Error');
  });
});

describe('Upscale Image API - POST /api/upscale-image', () => {
  it('should reject missing imageDataUrl', async () => {
    const request = new NextRequest('http://localhost:3000/api/upscale-image', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await upscaleImage(request);

    expect(response.status).toBe(400);
  });

  it('should use default 2k resolution when none provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/upscale-image', {
      method: 'POST',
      body: JSON.stringify({ imageDataUrl: 'data:image/png;base64,abc' }),
    });

    const response = await upscaleImage(request);

    expect(response.status).toBe(200);
    expect(mockGemini.editImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('2k'),
      })
    );
  });

  it('should request 4k resolution when specified', async () => {
    const request = new NextRequest('http://localhost:3000/api/upscale-image', {
      method: 'POST',
      body: JSON.stringify({ imageDataUrl: 'data:image/png;base64,abc', targetResolution: '4k' }),
    });

    const response = await upscaleImage(request);

    expect(response.status).toBe(200);
    expect(mockGemini.editImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('4k'),
      })
    );
  });

  it('should handle upscale failures', async () => {
    mockGemini.editImage.mockRejectedValueOnce(new Error('Upscale failed'));

    const request = new NextRequest('http://localhost:3000/api/upscale-image', {
      method: 'POST',
      headers: { 'x-test-client-id': 'test-client' },
      body: JSON.stringify({ imageDataUrl: 'data:image/png;base64,abc' }),
    });

    const response = await upscaleImage(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal Server Error');
  });
});

describe('Vision Scanner API - POST /api/vision-scanner', () => {
  it('should reject missing imageUrl', async () => {
    const request = new NextRequest('http://localhost:3000/api/vision-scanner', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await visionScanner(request);

    expect(response.status).toBe(400);
  });

  it('should return inspiration image analysis', async () => {
    const request = new NextRequest('http://localhost:3000/api/vision-scanner', {
      method: 'POST',
      body: JSON.stringify({ imageUrl: 'https://example.com/inspo.jpg', sourceType: 'unsplash' }),
    });

    const response = await visionScanner(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.inspirationImage.tags).toContain('Living Room');
    expect(data.analysis.promptText).toContain('Warm modern living room');
    expect(data.analysis.promptText).toContain('Lighting:');
  });

  it('should handle scanner errors', async () => {
    mockGemini.analyzeInspirationImage.mockRejectedValueOnce(new Error('Scanner failed'));

    const request = new NextRequest('http://localhost:3000/api/vision-scanner', {
      method: 'POST',
      body: JSON.stringify({ imageUrl: 'https://example.com/inspo.jpg' }),
    });

    const response = await visionScanner(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
