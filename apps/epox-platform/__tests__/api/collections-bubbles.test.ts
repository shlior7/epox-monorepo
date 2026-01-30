/**
 * Collection Generation with Bubbles - Integration Tests
 * Tests collections with inspiration sections and bubble-based prompt generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { BubbleValue, InspirationSection } from 'visualizer-types';

// Mock security to pass through
vi.mock('@/lib/security', () => ({
  withGenerationSecurity: (handler: any) => (req: any, ctx: any) =>
    handler(req, { clientId: 'test-client' }, ctx),
  verifyOwnership: () => true,
  forbiddenResponse: () => new Response('Forbidden', { status: 403 }),
}));

// Mock storage
vi.mock('visualizer-storage', () => ({
  resolveStorageUrl: (url: string) => url || null,
  resolveStorageUrlAbsolute: (url: string) => url || null,
}));

// Mock quota
vi.mock('@/lib/services/quota', () => ({
  enforceQuota: vi.fn().mockResolvedValue(null),
  consumeCredits: vi.fn().mockResolvedValue(undefined),
}));

// Mock the AI generation queue and prompt builder
vi.mock('visualizer-ai', () => ({
  enqueueImageGeneration: vi.fn(),
  buildArtDirectorPrompt: vi.fn(({ sceneType, mergedBubbles }) => ({
    finalPrompt: `Art director prompt for ${sceneType} with ${mergedBubbles.length} bubbles`,
    segments: [],
  })),
  buildSimplePrompt: vi.fn(() => 'simple prompt'),
  buildSmartPrompt: vi.fn(({ sceneType, mergedBubbles }) => ({
    finalPrompt: `Smart prompt for ${sceneType} with ${(mergedBubbles || []).length} bubbles`,
    segments: { introAnchor: '', sceneDescription: '', outroAnchor: '' },
    layers: {},
  })),
  mergeGenerationSettings: vi.fn((_ctx: any) => ({
    mergedBubbles: [],
    userPrompt: '',
    aspectRatio: '1:1',
    imageQuality: '2k',
    sources: [],
  })),
  formatSettingsSources: vi.fn(() => 'test sources'),
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
      getByIds: vi.fn(),
    },
    productImages: {
      listByProductIds: vi.fn(),
    },
    generatedAssets: {
      create: vi.fn(),
    },
    clients: {
      getById: vi.fn(),
    },
    categories: {
      listByClient: vi.fn(),
    },
    productCategories: {
      getProductsWithCategories: vi.fn(),
    },
  },
}));

import { POST as generateCollection } from '@/app/api/collections/[id]/generate/route';
import { db } from '@/lib/services/db';
import { enqueueImageGeneration } from 'visualizer-ai';

function makeSection(overrides: Partial<InspirationSection> & { bubbles: BubbleValue[] }): InspirationSection {
  return {
    id: crypto.randomUUID(),
    categoryIds: [],
    sceneTypes: [],
    enabled: true,
    ...overrides,
  };
}

describe('Collection Generation with Bubbles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enqueueImageGeneration).mockResolvedValue({
      jobId: 'job-1',
      expectedImageIds: [],
    });
    vi.mocked(db.generatedAssets.create).mockResolvedValue({ id: 'asset-1' } as any);
    vi.mocked(db.collectionSessions.update).mockResolvedValue(undefined as any);
    vi.mocked(db.clients.getById).mockResolvedValue({ id: 'test-client', generationDefaults: null } as any);
    vi.mocked(db.categories.listByClient).mockResolvedValue([]);
    vi.mocked(db.productCategories.getProductsWithCategories).mockResolvedValue(new Map());
    vi.mocked(db.products.getByIds).mockResolvedValue(
      new Map([
        [
          'prod-1',
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
        ],
        [
          'prod-2',
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
        ],
      ]) as any
    );
    vi.mocked(db.productImages.listByProductIds).mockResolvedValue(
      new Map([
        ['prod-1', [{ id: 'img-1', imageUrl: 'clients/test-client/products/prod-1/img-1.jpg', isPrimary: true }]],
        ['prod-2', [{ id: 'img-2', imageUrl: 'clients/test-client/products/prod-2/img-2.jpg', isPrimary: true }]],
      ]) as any
    );
  });

  describe('Inspiration Sections with Different Scene Types', () => {
    it('should generate with section bubbles for Living Room', async () => {
      const inspirationSections: InspirationSection[] = [
        makeSection({
          sceneTypes: ['Living Room'],
          bubbles: [
            { type: 'style', preset: 'Modern Minimalist' },
            { type: 'lighting', preset: 'Natural Daylight' },
            { type: 'mood', preset: 'Calm & Peaceful' },
          ] as BubbleValue[],
        }),
        makeSection({
          sceneTypes: ['Bedroom'],
          bubbles: [
            { type: 'style', preset: 'Cozy' },
            { type: 'lighting', preset: 'Warm Evening' },
            { type: 'mood', preset: 'Relaxing' },
          ] as BubbleValue[],
        }),
      ];

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        settings: {
          inspirationSections,
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

      expect(response.status).toBe(200);
      expect(enqueueImageGeneration).toHaveBeenCalledTimes(1);

      const call = vi.mocked(enqueueImageGeneration).mock.calls[0];
      const payload = call[1];
      expect(payload.settings).toBeDefined();
      expect(payload.settings?.aspectRatio).toBe('1:1'); // from mergeGenerationSettings mock
    });

    it('should handle multiple flows with different scene types', async () => {
      const inspirationSections: InspirationSection[] = [
        makeSection({
          sceneTypes: ['Living Room'],
          bubbles: [
            { type: 'style', preset: 'Modern Minimalist' },
            { type: 'custom', value: 'with plants' },
          ] as BubbleValue[],
        }),
        makeSection({
          sceneTypes: ['Dining Room'],
          bubbles: [
            { type: 'style', preset: 'Traditional' },
            { type: 'custom', value: 'with chandelier' },
          ] as BubbleValue[],
        }),
      ];

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1', 'prod-2'],
        selectedBaseImages: {},
        settings: {
          inspirationSections,
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

      const calls = vi.mocked(enqueueImageGeneration).mock.calls;
      expect(calls[0][1].sessionId).toBe('flow-1');
      expect(calls[1][1].sessionId).toBe('flow-2');
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

      const inspirationSections: InspirationSection[] = [
        makeSection({ sceneTypes: ['Living Room'], bubbles }),
      ];

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        settings: {
          inspirationSections,
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
    });

    it('should combine user prompt with bubble context', async () => {
      const inspirationSections: InspirationSection[] = [
        makeSection({
          sceneTypes: ['Living Room'],
          bubbles: [
            { type: 'style', preset: 'Scandinavian' },
            { type: 'custom', value: 'with wooden furniture' },
          ] as BubbleValue[],
        }),
      ];

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        settings: {
          inspirationSections,
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
    });
  });

  describe('Empty and Missing Bubbles', () => {
    it('should handle sections with no bubbles', async () => {
      const inspirationSections: InspirationSection[] = [
        makeSection({ sceneTypes: ['Living Room'], bubbles: [] }),
      ];

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        settings: {
          inspirationSections,
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
    });

    it('should handle bubbles with empty values gracefully', async () => {
      const inspirationSections: InspirationSection[] = [
        makeSection({
          sceneTypes: ['Living Room'],
          bubbles: [
            { type: 'style' } as BubbleValue, // No preset or customValue
            { type: 'lighting' } as BubbleValue,
          ],
        }),
      ];

      vi.mocked(db.collectionSessions.getById).mockResolvedValue({
        id: 'coll-1',
        clientId: 'test-client',
        productIds: ['prod-1'],
        selectedBaseImages: {},
        settings: {
          inspirationSections,
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
    });
  });
});
