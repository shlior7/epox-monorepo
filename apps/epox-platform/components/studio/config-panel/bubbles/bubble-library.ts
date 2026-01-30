/**
 * Bubble Library
 *
 * Centralized registry for all inspiration bubble types.
 * Each bubble has a type, configuration, and behavior.
 */

import type { BubbleType } from 'visualizer-types';
import { Palette, Lightbulb, Camera, Sparkles, Droplet, Eye, Heart, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ===== BUBBLE DEFINITION =====

export interface BubbleDefinition {
  type: BubbleType;
  label: string;
  icon: LucideIcon;
  description: string;
  category: 'style' | 'scene' | 'technical';
  // Whether this bubble requires user input (opens modal)
  requiresInput: boolean;
  // Whether this bubble can have multiple instances
  allowMultiple: boolean;
}

// ===== BUBBLE REGISTRY =====

export const BUBBLE_LIBRARY: Record<string, BubbleDefinition> = {
  style: {
    type: 'style',
    label: 'Style',
    icon: Sparkles,
    description: 'Define the artistic style and aesthetic',
    category: 'style',
    requiresInput: true,
    allowMultiple: false,
  },

  reference: {
    type: 'reference',
    label: 'Reference',
    icon: Lightbulb,
    description: 'Add reference images for inspiration',
    category: 'scene',
    requiresInput: true,
    allowMultiple: true,
  },

  lighting: {
    type: 'lighting',
    label: 'Lighting',
    icon: Lightbulb,
    description: 'Set the lighting preset or mood',
    category: 'technical',
    requiresInput: true,
    allowMultiple: false,
  },

  'camera-angle': {
    type: 'camera-angle',
    label: 'Camera Angle',
    icon: Camera,
    description: 'Choose the camera perspective',
    category: 'technical',
    requiresInput: true,
    allowMultiple: false,
  },

  'color-palette': {
    type: 'color-palette',
    label: 'Color Palette',
    icon: Palette,
    description: 'Define the color scheme',
    category: 'style',
    requiresInput: true,
    allowMultiple: false,
  },

  mood: {
    type: 'mood',
    label: 'Mood',
    icon: Heart,
    description: 'Set the emotional tone and atmosphere',
    category: 'style',
    requiresInput: true,
    allowMultiple: false,
  },

  custom: {
    type: 'custom',
    label: 'Custom',
    icon: Eye,
    description: 'Custom inspiration',
    category: 'scene',
    requiresInput: true,
    allowMultiple: true,
  },
};

// ===== HELPER FUNCTIONS =====

/**
 * Get bubble definition by type
 */
export function getBubbleDefinition(type: string): BubbleDefinition | undefined {
  return BUBBLE_LIBRARY[type];
}

/**
 * Get all bubble definitions grouped by category
 */
export function getBubblesByCategory() {
  const byCategory: Record<string, BubbleDefinition[]> = {
    style: [],
    scene: [],
    technical: [],
  };

  Object.values(BUBBLE_LIBRARY).forEach((bubble) => {
    byCategory[bubble.category].push(bubble);
  });

  return byCategory;
}

/**
 * Get available bubble types (for "Add" menu)
 */
export function getAvailableBubbleTypes(): string[] {
  return Object.keys(BUBBLE_LIBRARY);
}

/**
 * Check if a bubble type can have multiple instances
 */
export function canHaveMultipleBubbles(type: string): boolean {
  return BUBBLE_LIBRARY[type]?.allowMultiple ?? false;
}
