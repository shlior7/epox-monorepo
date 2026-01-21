/**
 * Studio Settings API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getSettings, PATCH as updateSettings } from '@/app/api/studio/[id]/settings/route';

vi.mock('@/lib/services/db', () => ({
  db: {
    generationFlows: {
      getById: vi.fn(),
      updateSettings: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/get-auth', () => ({
  getClientId: vi.fn(() => Promise.resolve('client-1')),
}));

import { db } from '@/lib/services/db';

describe('Studio Settings API - PATCH /api/studio/[id]/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 when flow not found', async () => {
    vi.mocked(db.generationFlows.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/studio/flow-1/settings', {
      method: 'PATCH',
      body: JSON.stringify({ aspectRatio: '16:9' }),
    });

    const response = await updateSettings(request, { params: Promise.resolve({ id: 'flow-1' }) });

    expect(response.status).toBe(404);
  });

  it('should update flow settings', async () => {
    vi.mocked(db.generationFlows.getById).mockResolvedValue({
      id: 'flow-1',
      clientId: 'test-client',
      settings: {},
    } as any);
    vi.mocked(db.generationFlows.updateSettings).mockResolvedValue({
      id: 'flow-1',
      clientId: 'test-client',
      settings: {
        aspectRatio: '16:9',
        imageQuality: '4k',
        variantsCount: 3,
        userPrompt: 'Warm lighting',
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/studio/flow-1/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        aspectRatio: '16:9',
        imageQuality: '4k',
        variantsCount: 3,
        userPrompt: 'Warm lighting',
      }),
    });

    const response = await updateSettings(request, { params: Promise.resolve({ id: 'flow-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(db.generationFlows.updateSettings).toHaveBeenCalledWith('flow-1', {
      aspectRatio: '16:9',
      imageQuality: '4k',
      variantsCount: 3,
      userPrompt: 'Warm lighting',
    });
    expect(data.success).toBe(true);
  });

  it('should update video settings', async () => {
    vi.mocked(db.generationFlows.getById).mockResolvedValue({
      id: 'flow-1',
      clientId: 'test-client',
      settings: {},
    } as any);
    vi.mocked(db.generationFlows.updateSettings).mockResolvedValue({
      id: 'flow-1',
      clientId: 'test-client',
      settings: {
        video: {
          prompt: 'Slow pan around the chair',
          inspirationImageUrl: 'https://example.com/inspo.jpg',
          inspirationNote: 'Warm studio lighting',
          settings: {
            videoType: 'product pan',
            cameraMotion: 'dolly',
            durationSeconds: 6,
          },
          presetId: 'preset-1',
        },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/studio/flow-1/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        video: {
          prompt: 'Slow pan around the chair',
          inspirationImageUrl: 'https://example.com/inspo.jpg',
          inspirationNote: 'Warm studio lighting',
          settings: {
            videoType: 'product pan',
            cameraMotion: 'dolly',
            durationSeconds: 6,
          },
          presetId: 'preset-1',
        },
      }),
    });

    const response = await updateSettings(request, { params: Promise.resolve({ id: 'flow-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(db.generationFlows.updateSettings).toHaveBeenCalledWith('flow-1', {
      video: {
        prompt: 'Slow pan around the chair',
        inspirationImageUrl: 'https://example.com/inspo.jpg',
        inspirationNote: 'Warm studio lighting',
        settings: {
          videoType: 'product pan',
          cameraMotion: 'dolly',
          durationSeconds: 6,
        },
        presetId: 'preset-1',
      },
    });
    expect(data.success).toBe(true);
  });

  it('should handle errors', async () => {
    vi.mocked(db.generationFlows.getById).mockResolvedValue({
      id: 'flow-1',
      clientId: 'test-client',
      settings: {},
    } as any);
    vi.mocked(db.generationFlows.updateSettings).mockRejectedValueOnce(new Error('Update failed'));

    const request = new NextRequest('http://localhost:3000/api/studio/flow-1/settings', {
      method: 'PATCH',
      body: JSON.stringify({ aspectRatio: '4:3' }),
    });

    const response = await updateSettings(request, { params: Promise.resolve({ id: 'flow-1' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal Server Error');
  });
});

describe('Studio Settings API - GET /api/studio/[id]/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 when flow not found', async () => {
    vi.mocked(db.generationFlows.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/studio/flow-1/settings');
    const response = await getSettings(request, { params: Promise.resolve({ id: 'flow-1' }) });

    expect(response.status).toBe(404);
  });

  it('should return flow settings', async () => {
    vi.mocked(db.generationFlows.getById).mockResolvedValue({
      id: 'flow-1',
      clientId: 'test-client',
      settings: {
        aspectRatio: '1:1',
        video: {
          prompt: 'Slow pan around the chair',
        },
      },
      productIds: ['prod-1'],
      selectedBaseImages: { 'prod-1': 'img-1' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/studio/flow-1/settings');
    const response = await getSettings(request, { params: Promise.resolve({ id: 'flow-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings.aspectRatio).toBe('1:1');
    expect(data.settings.video.prompt).toBe('Slow pan around the chair');
    expect(data.productIds).toEqual(['prod-1']);
  });
});
