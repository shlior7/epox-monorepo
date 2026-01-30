/**
 * Settings Merger Tests
 * Tests the mergeGenerationSettings function from visualizer-ai,
 * specifically the inspirationSections matching logic.
 */

import { describe, it, expect } from 'vitest';
import { mergeGenerationSettings, formatSettingsSources } from 'visualizer-ai';
import type {
  BubbleValue,
  Category,
  InspirationSection,
  CollectionGenerationSettings,
} from 'visualizer-types';

function makeCategory(id: string, name: string, defaultBubbles?: BubbleValue[]): Category {
  return {
    id,
    clientId: 'test-client',
    name,
    generationSettings: defaultBubbles ? { defaultBubbles } : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Category;
}

function makeSection(overrides: Partial<InspirationSection> & { bubbles: BubbleValue[] }): InspirationSection {
  return {
    id: crypto.randomUUID(),
    categoryIds: [],
    sceneTypes: [],
    enabled: true,
    ...overrides,
  };
}

describe('mergeGenerationSettings', () => {
  describe('Inspiration Sections Matching', () => {
    it('should apply section with empty categoryIds and sceneTypes (matches all)', () => {
      const section = makeSection({
        bubbles: [{ type: 'style', preset: 'Modern' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [{ categoryId: 'cat-1', isPrimary: true }],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      expect(result.mergedBubbles).toHaveLength(1);
      expect(result.mergedBubbles[0]).toEqual({ type: 'style', preset: 'Modern' });
      expect(result.sources).toContainEqual(
        expect.objectContaining({ level: 'collectionSection', bubbleCount: 1 })
      );
    });

    it('should apply section matching product category', () => {
      const section = makeSection({
        categoryIds: ['cat-1'],
        bubbles: [{ type: 'lighting', preset: 'Studio' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [{ categoryId: 'cat-1', isPrimary: true }],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      expect(result.mergedBubbles).toHaveLength(1);
      expect(result.mergedBubbles[0]).toEqual({ type: 'lighting', preset: 'Studio' });
    });

    it('should NOT apply section when category does not match', () => {
      const section = makeSection({
        categoryIds: ['cat-2'], // product has cat-1
        bubbles: [{ type: 'style', preset: 'Industrial' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [{ categoryId: 'cat-1', isPrimary: true }],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      expect(result.mergedBubbles).toHaveLength(0);
    });

    it('should apply section matching scene type', () => {
      const section = makeSection({
        sceneTypes: ['Living Room'],
        bubbles: [{ type: 'mood', preset: 'Cozy' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      expect(result.mergedBubbles).toHaveLength(1);
      expect(result.mergedBubbles[0]).toEqual({ type: 'mood', preset: 'Cozy' });
    });

    it('should NOT apply section when scene type does not match', () => {
      const section = makeSection({
        sceneTypes: ['Bedroom'],
        bubbles: [{ type: 'mood', preset: 'Relaxing' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      expect(result.mergedBubbles).toHaveLength(0);
    });

    it('should apply section matching BOTH category AND scene type', () => {
      const section = makeSection({
        categoryIds: ['cat-1'],
        sceneTypes: ['Living Room'],
        bubbles: [{ type: 'style', preset: 'Scandinavian' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [{ categoryId: 'cat-1', isPrimary: true }],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      expect(result.mergedBubbles).toHaveLength(1);
    });

    it('should NOT apply section when category matches but scene type does not', () => {
      const section = makeSection({
        categoryIds: ['cat-1'],
        sceneTypes: ['Bedroom'], // doesn't match
        bubbles: [{ type: 'style', preset: 'Rustic' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [{ categoryId: 'cat-1', isPrimary: true }],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      expect(result.mergedBubbles).toHaveLength(0);
    });

    it('should skip disabled sections', () => {
      const section = makeSection({
        enabled: false,
        bubbles: [{ type: 'style', preset: 'Modern' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      expect(result.mergedBubbles).toHaveLength(0);
    });

    it('should use last-wins for single-value bubble types across sections', () => {
      const section1 = makeSection({
        bubbles: [{ type: 'style', preset: 'Modern' }],
      });
      const section2 = makeSection({
        bubbles: [{ type: 'style', preset: 'Industrial' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section1, section2],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      // Last-wins deduplication: Industrial should override Modern
      const styleBubbles = result.mergedBubbles.filter((b) => b.type === 'style');
      expect(styleBubbles).toHaveLength(1);
      expect(styleBubbles[0].preset).toBe('Industrial');
    });

    it('should accumulate multi-value bubble types (custom, reference)', () => {
      const section1 = makeSection({
        bubbles: [{ type: 'custom', value: 'with plants' } as BubbleValue],
      });
      const section2 = makeSection({
        bubbles: [{ type: 'custom', value: 'with rug' } as BubbleValue],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section1, section2],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      const customBubbles = result.mergedBubbles.filter((b) => b.type === 'custom');
      expect(customBubbles).toHaveLength(2);
    });

    it('should apply generalInspiration before sections (sections override)', () => {
      const section = makeSection({
        bubbles: [{ type: 'style', preset: 'Industrial' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [],
          sceneType: 'Living Room',
          collectionSettings: {
            generalInspiration: [{ type: 'style', preset: 'Modern' }],
            inspirationSections: [section],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      // Section style should override general inspiration style
      const styleBubbles = result.mergedBubbles.filter((b) => b.type === 'style');
      expect(styleBubbles).toHaveLength(1);
      expect(styleBubbles[0].preset).toBe('Industrial');
    });

    it('should filter out empty bubbles from sections', () => {
      const section = makeSection({
        bubbles: [
          { type: 'style', preset: 'Modern' },
          { type: 'style' } as BubbleValue, // empty - no preset or customValue
          { type: 'lighting' } as BubbleValue, // empty
        ],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section],
            aspectRatio: '1:1',
          } as CollectionGenerationSettings,
        },
        null,
        new Map()
      );

      // Only the non-empty bubble should be included
      expect(result.mergedBubbles).toHaveLength(1);
      expect(result.mergedBubbles[0]).toEqual({ type: 'style', preset: 'Modern' });
    });
  });

  describe('Full Hierarchy', () => {
    it('should merge from client → category → section → flow', () => {
      const categories = new Map<string, Category>();
      categories.set(
        'cat-1',
        makeCategory('cat-1', 'Furniture', [{ type: 'style', preset: 'Classic' }])
      );

      const section = makeSection({
        categoryIds: ['cat-1'],
        bubbles: [{ type: 'lighting', preset: 'Natural' }],
      });

      const result = mergeGenerationSettings(
        {
          clientId: 'c1',
          productId: 'p1',
          productCategories: [{ categoryId: 'cat-1', isPrimary: true }],
          sceneType: 'Living Room',
          collectionSettings: {
            inspirationSections: [section],
            aspectRatio: '16:9',
            imageQuality: '4k',
          } as CollectionGenerationSettings,
          flowSettings: {
            generalInspiration: [{ type: 'mood', preset: 'Calm' }],
            aspectRatio: '1:1',
          } as any,
        },
        {
          defaultBubbles: [{ type: 'style', preset: 'Brand Default' }],
          defaultAspectRatio: '3:2',
          defaultImageQuality: '2k',
        },
        categories
      );

      // Client style = Brand Default, Category style = Classic → Classic wins (later overrides)
      // Section lighting = Natural
      // Flow mood = Calm
      // Flow aspect ratio = 1:1 (overrides collection's 16:9)
      expect(result.mergedBubbles.find((b) => b.type === 'style')?.preset).toBe('Classic');
      expect(result.mergedBubbles.find((b) => b.type === 'lighting')?.preset).toBe('Natural');
      expect(result.mergedBubbles.find((b) => b.type === 'mood')?.preset).toBe('Calm');
      expect(result.aspectRatio).toBe('1:1');
      expect(result.sources).toHaveLength(4); // client, category, section, flow
    });
  });

  describe('formatSettingsSources', () => {
    it('should format empty sources', () => {
      expect(formatSettingsSources([])).toBe('No generation setting sources');
    });

    it('should format multiple sources', () => {
      const result = formatSettingsSources([
        { level: 'client', label: 'Brand defaults', bubbleCount: 2 },
        { level: 'collectionSection', label: 'Section (Ladders · Living Room)', bubbleCount: 3 },
      ]);

      expect(result).toBe('Brand defaults (2) → Section (Ladders · Living Room) (3)');
    });
  });
});
