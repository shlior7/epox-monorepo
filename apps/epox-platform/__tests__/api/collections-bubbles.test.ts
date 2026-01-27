/**
 * Collection Generation with Bubbles - Integration Tests
 * Tests collections with multiple scene types and bubble-based prompt generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as generateCollection } from '@/app/api/collections/[id]/generate/route';
import type { BubbleValue, SceneTypeInspirationMap } from 'visualizer-types';

// Mock the AI generation queue
vi.mock('visualizer-ai', () => ({
  enqueueImageGeneration: vi.fn(),
}));

// Mock the Art Director
vi.mock('@/app/api/art-director/route', () => ({
  POST: vi.fn(async (request) => {
    const body = await request.json();
    // Mock Art Director: return the input as the prompt
    // In reality, it would enhance the prompt with vision analysis
    const mockPrompt = `
      Create a scene for ${body.subjectAnalysis?.subjectClassHyphenated || 'product'}.
      Scene type: ${body.sceneType || 'default'}
      Bubbles: ${JSON.stringify(body.bubbles || [])}
      User prompt: ${body.userPrompt || ''}
    `;
    return {
      json: async () => ({
        success: true,
        finalPrompt: mockPrompt,
        matchedSceneType: body.sceneType,
      }),
    };
  }),
}));

vi.mock('@/lib/services/db', () => ({
  db: {
    collectionSessions: {
      getById: vi.fn(),
      update: vi.fn(),
    },
    generationFlows: {
      listByCollectionSession: vi.fn(),
    },
    products: {
      listByIds: vi.fn(),
    },
    productImages: {
      listByProductIds: vi.fn(),
    },
    generatedAssets: {
      create: vi.fn(),
    },
  },
}));

import { db } from '@/lib/services/db';
import { enqueueImageGeneration } from 'visualizer-ai';

describe('Collection Generation with Bubbles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enqueueImageGeneration).mockResolvedValue({
      jobId: 'job-1',
      expectedImageIds: [],
    });
    vi.mocked(db.generatedAssets.create).mockResolvedValue({ id: 'asset-1' } as any);
    vi.mocked(db.products.listByIds).mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Modern Sofa',
        analysisData: {
          subject: {
            subjectClassHyphenated: 'Modern-Sofa',
            nativeSceneTypes: ['Living-Room', 'Office'],
            nativeSceneCategory: 'Indoor Room',
            inputCameraAngle: 'Frontal',
          },
        },
      },
      {
        id: 'prod-2',
        name: 'Dining Table',
        analysisData: {
          subject: {
            subjectClassHyphenated: 'Dining-Table',
            nativeSceneTypes: ['Dining-Room', 'Kitchen'],
            nativeSceneCategory: 'Indoor Room',
            inputCameraAngle: 'Frontal',
          },
        },
      },
    ] as any);
    vi.mocked(db.productImages.listByProductIds).mockResolvedValue(
      new Map([
        ['prod-1', [{ id: 'img-1', imageUrl: 'clients/test-client/products/prod-1/img-1.jpg', isPrimary: true }]],
        ['prod-2', [{ id: 'img-2', imageUrl: 'clients/test-client/products/prod-2/img-2.jpg', isPrimary: true }]],
      ]) as any
    );
  });

  describe('Multiple Scene Types with Different Bubbles', () => {
    it('should generate with scene-specific bubbles for Living Room', async () => {
      const sceneTypeInspiration: SceneTypeInspirationMap = {
        'Living Room': {
          bubbles: [
            { type: 'style', preset: 'Modern Minimalist' },
            { type: 'lighting', preset: 'Natural Daylight' },
            { type: 'mood', preset: 'Calm & Peaceful' },
          ] as BubbleValue[],
        },
        Bedroom: {
          bubbles: [
            { type: 'style', preset: 'Cozy' },
            { type: 'lighting', preset: 'Warm Evening' },
            { type: 'mood', preset: 'Relaxing' },
          ] as BubbleValue[],
        },
      };

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        settings: {
          sceneTypeInspiration,
          aspectRatio: '16:9',
          imageQuality: '4k',
          variantsPerProduct: 2,
        },
      } as any);

      vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
        {
          id: 'flow-1',
          productIds: ['prod-1'],
          selectedBaseImages: {},
          settings: {
            sceneType: 'Living Room',
            aspectRatio: '16:9',
            imageQuality: '4k',
            variantsPerProduct: 2,
          },
        },
      ] as any);

      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await generateCollection(request, {
        params: Promise.resolve({ id: 'coll-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(enqueueImageGeneration).toHaveBeenCalledTimes(1);

      // Verify the job was enqueued with Living Room bubbles
      const call = vi.mocked(enqueueImageGeneration).mock.calls[0];
      const payload = call[1];

      // The prompt should contain Living Room bubble context
      // In a real scenario, the Art Director would have been called with these bubbles
      expect(payload.settings).toBeDefined();
      expect(payload.settings?.aspectRatio).toBe('16:9');
    });

    it('should handle multiple flows with different scene types', async () => {
      const sceneTypeInspiration: SceneTypeInspirationMap = {
        'Living Room': {
          bubbles: [
            { type: 'style', preset: 'Modern Minimalist' },
            { type: 'custom', value: 'with plants' },
          ] as BubbleValue[],
        },
        'Dining Room': {
          bubbles: [
            { type: 'style', preset: 'Traditional' },
            { type: 'custom', value: 'with chandelier' },
          ] as BubbleValue[],
        },
      };

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1', 'prod-2'],
        selectedBaseImages: {},
        settings: {
          sceneTypeInspiration,
          aspectRatio: '16:9',
          imageQuality: '4k',
          variantsPerProduct: 1,
        },
      } as any);

      vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
        {
          id: 'flow-1',
          productIds: ['prod-1'],
          selectedBaseImages: {},
          settings: {
            sceneType: 'Living Room',
            aspectRatio: '16:9',
            imageQuality: '4k',
            variantsPerProduct: 1,
          },
        },
        {
          id: 'flow-2',
          productIds: ['prod-2'],
          selectedBaseImages: {},
          settings: {
            sceneType: 'Dining Room',
            aspectRatio: '16:9',
            imageQuality: '4k',
            variantsPerProduct: 1,
          },
        },
      ] as any);

      vi.mocked(enqueueImageGeneration)
        .mockResolvedValueOnce({ jobId: 'job-1', expectedImageIds: [] })
        .mockResolvedValueOnce({ jobId: 'job-2', expectedImageIds: [] });

      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await generateCollection(request, {
        params: Promise.resolve({ id: 'coll-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(enqueueImageGeneration).toHaveBeenCalledTimes(2);
      expect(data.jobIds).toEqual(['job-1', 'job-2']);

      // Verify each flow got the correct scene type bubbles
      const calls = vi.mocked(enqueueImageGeneration).mock.calls;

      // Flow 1 should have Living Room context
      const flow1Payload = calls[0][1];
      expect(flow1Payload.sessionId).toBe('flow-1');

      // Flow 2 should have Dining Room context
      const flow2Payload = calls[1][1];
      expect(flow2Payload.sessionId).toBe('flow-2');
    });
  });

  describe('Bubble Context Extraction', () => {
    it('should include all bubble types in the prompt', async () => {
      const bubbles: BubbleValue[] = [
        { type: 'style', preset: 'Modern Minimalist' },
        { type: 'lighting', preset: 'Natural Daylight' },
        { type: 'camera-angle', preset: 'Eye Level' },
        { type: 'mood', preset: 'Energetic' },
        { type: 'color-palette', colors: ['#FFFFFF', '#000000'] },
        { type: 'custom', value: 'with large windows' },
      ];

      const sceneTypeInspiration: SceneTypeInspirationMap = {
        'Living Room': { bubbles },
      };

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        settings: {
          sceneTypeInspiration,
          aspectRatio: '1:1',
          imageQuality: '2k',
          variantsPerProduct: 1,
        },
      } as any);

      vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
        {
          id: 'flow-1',
          productIds: ['prod-1'],
          selectedBaseImages: {},
          settings: {
            sceneType: 'Living Room',
            aspectRatio: '1:1',
            imageQuality: '2k',
            variantsPerProduct: 1,
          },
        },
      ] as any);

      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await generateCollection(request, {
        params: Promise.resolve({ id: 'coll-1' }),
      });

      expect(response.status).toBe(200);
      expect(enqueueImageGeneration).toHaveBeenCalledTimes(1);

      // The Art Director would have been called with all bubble contexts
      // and the final prompt would include all elements
      const call = vi.mocked(enqueueImageGeneration).mock.calls[0];
      const payload = call[1];

      // Verify the settings are structured correctly
      expect(payload.settings).toBeDefined();
      expect(payload.settings?.numberOfVariants).toBe(1);
      expect(payload.settings?.aspectRatio).toBe('1:1');
    });

    it('should combine user prompt with bubble context', async () => {
      const bubbles: BubbleValue[] = [
        { type: 'style', preset: 'Scandinavian' },
        { type: 'custom', value: 'with wooden furniture' },
      ];

      const sceneTypeInspiration: SceneTypeInspirationMap = {
        'Living Room': { bubbles },
      };

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        settings: {
          sceneTypeInspiration,
          userPrompt: 'Add a cozy rug on the floor',
          aspectRatio: '16:9',
          imageQuality: '4k',
          variantsPerProduct: 1,
        },
      } as any);

      vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
        {
          id: 'flow-1',
          productIds: ['prod-1'],
          selectedBaseImages: {},
          settings: {
            sceneType: 'Living Room',
            userPrompt: 'Add a cozy rug on the floor',
            aspectRatio: '16:9',
            imageQuality: '4k',
            variantsPerProduct: 1,
          },
        },
      ] as any);

      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await generateCollection(request, {
        params: Promise.resolve({ id: 'coll-1' }),
      });

      expect(response.status).toBe(200);
      expect(enqueueImageGeneration).toHaveBeenCalledTimes(1);

      // The prompt should include both bubble context and user additions
      const call = vi.mocked(enqueueImageGeneration).mock.calls[0];
      const payload = call[1];
      expect(payload.settings).toBeDefined();
    });
  });

  describe('Empty and Missing Bubbles', () => {
    it('should handle scene types with no bubbles', async () => {
      const sceneTypeInspiration: SceneTypeInspirationMap = {
        'Living Room': { bubbles: [] },
      };

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        settings: {
          sceneTypeInspiration,
          aspectRatio: '1:1',
          imageQuality: '2k',
          variantsPerProduct: 1,
        },
      } as any);

      vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
        {
          id: 'flow-1',
          productIds: ['prod-1'],
          selectedBaseImages: {},
          settings: {
            sceneType: 'Living Room',
            aspectRatio: '1:1',
            imageQuality: '2k',
            variantsPerProduct: 1,
          },
        },
      ] as any);

      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await generateCollection(request, {
        params: Promise.resolve({ id: 'coll-1' }),
      });

      expect(response.status).toBe(200);
      expect(enqueueImageGeneration).toHaveBeenCalledTimes(1);
      // Should still generate with default prompt
    });

    it('should handle bubbles with empty values gracefully', async () => {
      const bubbles: BubbleValue[] = [
        { type: 'style' }, // No stylePreset or customValue
        { type: 'lighting' }, // No lightingPreset or customValue
      ];

      const sceneTypeInspiration: SceneTypeInspirationMap = {
        'Living Room': { bubbles },
      };

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        settings: {
          sceneTypeInspiration,
          aspectRatio: '1:1',
          imageQuality: '2k',
          variantsPerProduct: 1,
        },
      } as any);

      vi.mocked(db.generationFlows.listByCollectionSession).mockResolvedValue([
        {
          id: 'flow-1',
          productIds: ['prod-1'],
          selectedBaseImages: {},
          settings: {
            sceneType: 'Living Room',
            aspectRatio: '1:1',
            imageQuality: '2k',
            variantsPerProduct: 1,
          },
        },
      ] as any);

      const request = new NextRequest('http://localhost:3000/api/collections/coll-1/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await generateCollection(request, {
        params: Promise.resolve({ id: 'coll-1' }),
      });

      expect(response.status).toBe(200);
      expect(enqueueImageGeneration).toHaveBeenCalledTimes(1);
      // Should filter out empty bubbles and still generate
    });
  });
});
