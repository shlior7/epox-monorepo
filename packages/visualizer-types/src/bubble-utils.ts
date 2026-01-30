/**
 * Bubble Utility Functions
 * Helper functions for bubble extraction and filtering
 */

import type { BubbleValue, ReferenceBubbleValue } from './bubbles';

// ===== EXTRACTION FUNCTIONS =====

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

/**
 * Get a narrative string describing a bubble's contribution to a scene prompt.
 * Each bubble type owns its own narrative generation.
 * Returns null for bubbles that don't contribute text (e.g., empty values).
 */
export function getBubbleNarrative(bubble: BubbleValue): string | null {
  switch (bubble.type) {
    case 'style': {
      const val = bubble.preset || bubble.customValue;
      return val ? `${val} style` : null;
    }
    case 'lighting': {
      const val = bubble.preset || bubble.customValue;
      return val ? `${val} lighting` : null;
    }
    case 'mood':
      return bubble.preset ? `${bubble.preset} mood and atmosphere` : null;
    case 'human-interaction': {
      if (bubble.customValue) return bubble.customValue;
      switch (bubble.preset) {
        case 'none':
          return 'no people in the scene';
        case 'partial':
          return 'include partial human presence (hands or arms interacting with the product)';
        case 'full':
          return 'include a person naturally interacting with the product';
        case 'contextual':
          return 'include contextually appropriate human interaction';
        default:
          return null;
      }
    }
    case 'props': {
      if (bubble.customValue) return `props and accessories: ${bubble.customValue}`;
      switch (bubble.preset) {
        case 'none':
          return 'no props or accessories, product only';
        case 'minimal':
          return 'minimal, clean styling with few props';
        case 'styled':
          return 'carefully styled with curated props and accessories';
        case 'lifestyle':
          return 'natural lifestyle staging with lived-in feel';
        default:
          return null;
      }
    }
    case 'background': {
      if (bubble.customValue) return `background: ${bubble.customValue}`;
      if (bubble.preset) return `${bubble.preset} background`;
      return null;
    }
    case 'camera-angle':
      return bubble.preset ? `shot from ${bubble.preset.toLowerCase()}` : null;
    case 'color-palette':
      return bubble.colors && bubble.colors.length > 0
        ? `color palette: ${bubble.colors.join(', ')}`
        : null;
    case 'reference':
      return bubble.image ? 'inspired by reference image' : null;
    case 'custom':
      return bubble.value || null;
    default:
      return null;
  }
}
