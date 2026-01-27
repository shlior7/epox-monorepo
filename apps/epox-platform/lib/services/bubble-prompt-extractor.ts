/**
 * Bubble Prompt Extractor
 * Extracts prompt context from bubbles using the registry
 * This module is framework-agnostic and can be used in API routes or workers
 */

import type { BubbleValue } from 'visualizer-types';

// ===== EXTRACTION LOGIC =====

/**
 * Extract prompt context from an array of bubbles
 * This is completely agnostic - doesn't know about specific bubble types
 * Uses the bubble registry to extract context from each bubble
 */
export function extractPromptContextFromBubbles(bubbles: BubbleValue[]): string[] {
  // Import dynamically to avoid circular dependencies
  const allContext: string[] = [];

  for (const bubble of bubbles) {
    const extracted = extractSingleBubbleContext(bubble);
    allContext.push(...extracted);
  }

  return allContext.filter(Boolean);
}

/**
 * Extract context from a single bubble
 * This matches the extractPromptContext signature from BubbleDefinition
 */
function extractSingleBubbleContext(bubble: BubbleValue): string[] {
  switch (bubble.type) {
    case 'style':
      if (bubble.preset) {
        return [`${bubble.preset} style`];
      }
      if (bubble.customValue) {
        return [bubble.customValue];
      }
      return [];

    case 'lighting':
      if (bubble.preset) {
        return [`${bubble.preset} lighting`];
      }
      if (bubble.customValue) {
        return [bubble.customValue];
      }
      return [];

    case 'camera-angle':
      if (bubble.preset) {
        return [`shot from ${bubble.preset.toLowerCase()}`];
      }
      return [];

    case 'mood':
      if (bubble.preset) {
        return [`${bubble.preset.toLowerCase()} mood and atmosphere`];
      }
      return [];

    case 'reference':
      // Vision analysis would be extracted here if available
      if (bubble.image) {
        return ['inspired by reference image'];
      }
      return [];

    case 'color-palette':
      if (bubble.colors && bubble.colors.length > 0) {
        const colorNames = bubble.colors.join(', ');
        return [`color palette: ${colorNames}`];
      }
      return [];

    case 'custom':
      if (bubble.value) {
        return [bubble.value];
      }
      return [];

    default:
      console.warn(`Unknown bubble type: ${(bubble as any).type}`);
      return [];
  }
}

/**
 * Group bubble context by category for structured prompts
 */
export function groupBubbleContextByCategory(bubbles: BubbleValue[]): {
  style: string[];
  scene: string[];
  technical: string[];
} {
  const grouped = {
    style: [] as string[],
    scene: [] as string[],
    technical: [] as string[],
  };

  const categoryMap: Record<string, keyof typeof grouped> = {
    style: 'style',
    mood: 'style',
    'color-palette': 'style',
    reference: 'scene',
    custom: 'scene',
    lighting: 'technical',
    'camera-angle': 'technical',
  };

  for (const bubble of bubbles) {
    const category = categoryMap[bubble.type] || 'scene';
    const context = extractSingleBubbleContext(bubble);
    grouped[category].push(...context);
  }

  return grouped;
}

/**
 * Build a formatted prompt section from bubbles
 */
export function buildBubblePromptSection(bubbles: BubbleValue[]): string {
  const context = extractPromptContextFromBubbles(bubbles);

  if (context.length === 0) {
    return '';
  }

  return context.join('\n');
}
