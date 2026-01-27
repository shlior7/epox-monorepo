/**
 * Bubble Utility Functions
 * Helper functions for bubble extraction and filtering
 */

import type { BubbleValue, ReferenceBubbleValue } from './bubbles';
import type { SceneTypeInspirationMap } from './settings';

// ===== EXTRACTION FUNCTIONS =====

/**
 * Get bubbles for a specific scene type from the map
 */
export function getBubblesForSceneType(
  sceneTypeInspiration: SceneTypeInspirationMap,
  sceneType: string
): BubbleValue[] {
  return sceneTypeInspiration[sceneType]?.bubbles || [];
}

/**
 * Check if settings has the new bubble format
 */
export function hasNewBubbleFormat(settings: any): boolean {
  return settings && typeof settings.sceneTypeInspiration === 'object';
}

/**
 * Check if a bubble value is empty (has no meaningful content)
 */
export function isBubbleEmpty(bubble: BubbleValue): boolean {
  switch (bubble.type) {
    case 'style':
      return !bubble.preset && !bubble.customValue;
    case 'lighting':
      return !bubble.preset && !bubble.customValue;
    case 'camera-angle':
      return !bubble.preset;
    case 'mood':
      return !bubble.preset;
    case 'reference':
      return !bubble.image;
    case 'color-palette':
      return !bubble.colors || bubble.colors.length === 0;
    case 'custom':
      return !bubble.value;
    default:
      return true;
  }
}

/**
 * Filter out empty bubbles from an array
 */
export function filterEmptyBubbles(bubbles: BubbleValue[]): BubbleValue[] {
  return bubbles.filter((b) => !isBubbleEmpty(b));
}

/**
 * Extract BubbleValue from InspirationImage
 * Converts an InspirationImage into a ReferenceBubbleValue
 */
export function extractBubbleFromInspiration(image: import('./settings').InspirationImage): ReferenceBubbleValue {
  return {
    type: 'reference',
    image,
  };
}
