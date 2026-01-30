/**
 * Bubble Registry
 * Central registry for all bubble types - add/remove bubbles here
 */

import type { BubbleDefinition } from './types';
import { styleBubble } from './style/definition';
import { lightingBubble } from './lighting/definition';
import { cameraAngleBubble } from './camera-angle/definition';
import { referenceBubble } from './reference/definition';
import { colorPaletteBubble } from './color-palette/definition';
import { moodBubble } from './mood/definition';
import { customBubble } from './custom/definition';

// ===== BUBBLE REGISTRY =====

/**
 * Central registry - add/remove bubbles here
 * Each bubble is self-contained in its own folder
 */
const BUBBLE_DEFINITIONS = [
  styleBubble,
  lightingBubble,
  cameraAngleBubble,
  moodBubble,
  referenceBubble,
  colorPaletteBubble,
  customBubble,
] as const;

// ===== AUTO-GENERATED TYPE UNION =====

export type BubbleType = (typeof BUBBLE_DEFINITIONS)[number]['type'];

// ===== HELPER FUNCTIONS =====

/**
 * Get bubble definition by type
 * Returns undefined if bubble type not found
 */
export function getBubbleDefinition(type: string): BubbleDefinition | undefined {
  return BUBBLE_DEFINITIONS.find((def) => def.type === type) as BubbleDefinition | undefined;
}

/**
 * Get all bubble definitions
 */
export function getAllBubbleDefinitions(): readonly BubbleDefinition[] {
  return BUBBLE_DEFINITIONS as unknown as readonly BubbleDefinition[];
}

/**
 * Get bubbles by category
 */
export function getBubblesByCategory(
  category: 'style' | 'scene' | 'technical'
): readonly BubbleDefinition[] {
  return BUBBLE_DEFINITIONS.filter(
    (def) => def.category === category
  ) as unknown as readonly BubbleDefinition[];
}

/**
 * Get all available bubble types
 */
export function getAvailableBubbleTypes(): string[] {
  return BUBBLE_DEFINITIONS.map((def) => def.type);
}

/**
 * Check if a bubble type allows multiple instances
 */
export function canHaveMultipleBubbles(type: string): boolean {
  const def = getBubbleDefinition(type);
  return def?.allowMultiple ?? false;
}

/**
 * Check if a bubble type exists in registry
 */
export function isBubbleTypeRegistered(type: string): boolean {
  return BUBBLE_DEFINITIONS.some((def) => def.type === type);
}
