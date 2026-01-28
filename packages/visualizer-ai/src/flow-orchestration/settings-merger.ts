/**
 * Settings Merger
 * Merges generation settings from the full hierarchy:
 * Client → Category → Category+SceneType → Collection → Collection+Category → Collection+SceneType → Flow
 */

import type {
  BubbleValue,
  CategoryGenerationSettings,
  SceneTypeGenerationSettings,
  ClientGenerationDefaults,
  CollectionGenerationSettings,
  FlowGenerationSettings,
  ImageAspectRatio,
  ImageQuality,
  Category,
} from 'visualizer-types';

// ===== TYPES =====

export interface MergeContext {
  /** Client ID for fetching brand defaults */
  clientId: string;

  /** Product ID */
  productId: string;

  /** Product's categories with primary flag */
  productCategories: Array<{ categoryId: string; isPrimary: boolean }>;

  /** Flow's selected scene type (controls which scene-type settings apply) */
  sceneType: string;

  /** Collection-level settings */
  collectionSettings?: CollectionGenerationSettings;

  /** Flow-level settings */
  flowSettings?: FlowGenerationSettings;
}

export interface MergedSettings {
  /** All bubbles merged from hierarchy (later overrides earlier) */
  mergedBubbles: BubbleValue[];

  /** Category settings from primary category (for reference) */
  categorySettings: CategoryGenerationSettings | null;

  /** Scene-type settings from primary category + flow's scene type */
  sceneTypeSettings: SceneTypeGenerationSettings | null;

  /** Merged aspect ratio */
  aspectRatio: ImageAspectRatio;

  /** Merged image quality */
  imageQuality: ImageQuality;

  /** Merged user prompt (flow > collection) */
  userPrompt?: string;

  /** Source tracking for debugging */
  sources: BubbleSource[];
}

export interface BubbleSource {
  level: 'client' | 'category' | 'categorySceneType' | 'collection' | 'collectionCategory' | 'collectionSceneType' | 'flow';
  label: string;
  bubbleCount: number;
}

// ===== HELPER FUNCTIONS =====

/**
 * Deduplicate bubbles by type.
 * Later bubbles override earlier ones of the same type.
 * For types that can have multiple values (custom, reference), all are kept.
 */
function deduplicateBubbles(bubbles: BubbleValue[]): BubbleValue[] {
  const multiValueTypes = new Set(['custom', 'reference', 'color-palette']);
  const seen = new Map<string, BubbleValue>();
  const result: BubbleValue[] = [];

  for (const bubble of bubbles) {
    if (multiValueTypes.has(bubble.type)) {
      // Keep all instances of multi-value types
      result.push(bubble);
    } else {
      // For single-value types, last one wins
      seen.set(bubble.type, bubble);
    }
  }

  // Add single-value bubbles
  for (const bubble of seen.values()) {
    result.push(bubble);
  }

  return result;
}

/**
 * Check if a bubble is empty/has no meaningful value.
 */
function isBubbleEmpty(bubble: BubbleValue): boolean {
  switch (bubble.type) {
    case 'style':
    case 'lighting':
      return !bubble.preset && !bubble.customValue;
    case 'mood':
    case 'camera-angle':
      return !bubble.preset;
    case 'reference':
      return !bubble.image;
    case 'color-palette':
      return !bubble.colors || bubble.colors.length === 0;
    case 'custom':
      return !bubble.value;
    case 'human-interaction':
    case 'props':
    case 'background':
      return !bubble.preset && !bubble.customValue;
    default:
      return true;
  }
}

// ===== MAIN MERGER =====

/**
 * Merge generation settings from all hierarchy levels.
 *
 * Hierarchy (later levels override earlier):
 * 1. Client defaults (brand-level)
 * 2. Category defaults (from primary category)
 * 3. Category + SceneType defaults
 * 4. Collection general inspiration
 * 5. Collection category inspiration
 * 6. Collection scene-type inspiration
 * 7. Flow settings (highest priority)
 */
export function mergeGenerationSettings(
  ctx: MergeContext,
  clientDefaults: ClientGenerationDefaults | null,
  categories: Map<string, Category>
): MergedSettings {
  const bubbles: BubbleValue[] = [];
  const sources: BubbleSource[] = [];

  // Default settings
  let aspectRatio: ImageAspectRatio = '1:1';
  let imageQuality: ImageQuality = '2k';

  // === Level 1: Client Defaults ===
  if (clientDefaults) {
    aspectRatio = clientDefaults.defaultAspectRatio || aspectRatio;
    imageQuality = clientDefaults.defaultImageQuality || imageQuality;

    if (clientDefaults.defaultBubbles && clientDefaults.defaultBubbles.length > 0) {
      const validBubbles = clientDefaults.defaultBubbles.filter((b) => !isBubbleEmpty(b));
      bubbles.push(...validBubbles);
      if (validBubbles.length > 0) {
        sources.push({ level: 'client', label: 'Brand defaults', bubbleCount: validBubbles.length });
      }
    }
  }

  // === Level 2: Category Defaults (from primary category) ===
  const primaryCategoryId = ctx.productCategories.find((c) => c.isPrimary)?.categoryId;
  const primaryCategory = primaryCategoryId ? categories.get(primaryCategoryId) : null;
  const categorySettings = primaryCategory?.generationSettings ?? null;

  if (categorySettings?.defaultBubbles && categorySettings.defaultBubbles.length > 0) {
    const validBubbles = categorySettings.defaultBubbles.filter((b) => !isBubbleEmpty(b));
    bubbles.push(...validBubbles);
    if (validBubbles.length > 0) {
      sources.push({
        level: 'category',
        label: `Category: ${primaryCategory?.name || 'Unknown'}`,
        bubbleCount: validBubbles.length,
      });
    }
  }

  // === Level 3: Category + SceneType Defaults ===
  const sceneTypeSettings = categorySettings?.sceneTypeSettings?.[ctx.sceneType] ?? null;

  if (sceneTypeSettings?.defaultBubbles && sceneTypeSettings.defaultBubbles.length > 0) {
    const validBubbles = sceneTypeSettings.defaultBubbles.filter((b) => !isBubbleEmpty(b));
    bubbles.push(...validBubbles);
    if (validBubbles.length > 0) {
      sources.push({
        level: 'categorySceneType',
        label: `${primaryCategory?.name || 'Category'} + ${ctx.sceneType}`,
        bubbleCount: validBubbles.length,
      });
    }
  }

  // === Level 4: Collection General Inspiration ===
  if (ctx.collectionSettings?.generalInspiration && ctx.collectionSettings.generalInspiration.length > 0) {
    const validBubbles = ctx.collectionSettings.generalInspiration.filter((b) => !isBubbleEmpty(b));
    bubbles.push(...validBubbles);
    if (validBubbles.length > 0) {
      sources.push({ level: 'collection', label: 'Collection', bubbleCount: validBubbles.length });
    }
  }

  // === Level 5: Collection Category Inspiration ===
  if (ctx.collectionSettings?.categoryInspiration) {
    for (const pc of ctx.productCategories) {
      const catInspiration = ctx.collectionSettings.categoryInspiration[pc.categoryId];
      if (catInspiration?.bubbles && catInspiration.bubbles.length > 0) {
        const validBubbles = catInspiration.bubbles.filter((b) => !isBubbleEmpty(b));
        bubbles.push(...validBubbles);
        if (validBubbles.length > 0) {
          const catName = categories.get(pc.categoryId)?.name || 'Category';
          sources.push({
            level: 'collectionCategory',
            label: `Collection (${catName})`,
            bubbleCount: validBubbles.length,
          });
        }
      }
    }
  }

  // === Level 6: Collection Scene-Type Inspiration ===
  if (ctx.collectionSettings?.sceneTypeInspiration?.[ctx.sceneType]?.bubbles) {
    const stBubbles = ctx.collectionSettings.sceneTypeInspiration[ctx.sceneType].bubbles;
    const validBubbles = stBubbles.filter((b) => !isBubbleEmpty(b));
    bubbles.push(...validBubbles);
    if (validBubbles.length > 0) {
      sources.push({
        level: 'collectionSceneType',
        label: `Collection (${ctx.sceneType})`,
        bubbleCount: validBubbles.length,
      });
    }
  }

  // Collection-level settings override
  if (ctx.collectionSettings) {
    aspectRatio = ctx.collectionSettings.aspectRatio || aspectRatio;
    imageQuality = ctx.collectionSettings.imageQuality || imageQuality;
  }

  // === Level 7: Flow Settings (highest priority) ===
  if (ctx.flowSettings?.generalInspiration && ctx.flowSettings.generalInspiration.length > 0) {
    const validBubbles = ctx.flowSettings.generalInspiration.filter((b) => !isBubbleEmpty(b));
    bubbles.push(...validBubbles);
    if (validBubbles.length > 0) {
      sources.push({ level: 'flow', label: 'Flow', bubbleCount: validBubbles.length });
    }
  }

  if (ctx.flowSettings) {
    aspectRatio = ctx.flowSettings.aspectRatio || aspectRatio;
    imageQuality = ctx.flowSettings.imageQuality || imageQuality;
  }

  // Deduplicate bubbles (later overrides earlier for same type)
  const mergedBubbles = deduplicateBubbles(bubbles);

  // Merge user prompts (flow > collection)
  const userPrompt = ctx.flowSettings?.userPrompt || ctx.collectionSettings?.userPrompt;

  return {
    mergedBubbles,
    categorySettings,
    sceneTypeSettings,
    aspectRatio,
    imageQuality,
    userPrompt,
    sources,
  };
}

/**
 * Get a human-readable summary of the merged settings sources.
 */
export function formatSettingsSources(sources: BubbleSource[]): string {
  if (sources.length === 0) {
    return 'No bubble sources';
  }

  return sources.map((s) => `${s.label} (${s.bubbleCount})`).join(' → ');
}
