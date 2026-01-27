/**
 * Bubble Value Types
 * Extensible bubble system for generation settings
 */

import type { InspirationImage } from './settings';

// ===== BASE INTERFACE =====

export interface BaseBubbleValue {
  type: string;
}

// ===== BUBBLE VALUE TYPES =====

export interface StyleBubbleValue extends BaseBubbleValue {
  type: 'style';
  preset?: string; // e.g., "Modern Minimalist"
  customValue?: string; // For custom styles
}

export interface LightingBubbleValue extends BaseBubbleValue {
  type: 'lighting';
  preset?: string; // e.g., "Natural Daylight"
  customValue?: string; // For custom lighting
}

export interface CameraAngleBubbleValue extends BaseBubbleValue {
  type: 'camera-angle';
  preset?: string; // e.g., "Eye Level"
}

export interface ReferenceBubbleValue extends BaseBubbleValue {
  type: 'reference';
  image?: InspirationImage;
}

export interface ColorPaletteBubbleValue extends BaseBubbleValue {
  type: 'color-palette';
  colors?: string[]; // Hex colors
}

export interface MoodBubbleValue extends BaseBubbleValue {
  type: 'mood';
  preset?: string; // e.g., "Calm & Peaceful"
}

export interface CustomBubbleValue extends BaseBubbleValue {
  type: 'custom';
  label?: string;
  value?: string;
}

// ===== DISCRIMINATED UNION =====

export type BubbleValue =
  | StyleBubbleValue
  | LightingBubbleValue
  | CameraAngleBubbleValue
  | ReferenceBubbleValue
  | ColorPaletteBubbleValue
  | MoodBubbleValue
  | CustomBubbleValue;

// ===== BUBBLE TYPE HELPERS =====

export type BubbleType = BubbleValue['type'];

export function isBubbleType(type: string): type is BubbleType {
  return [
    'style',
    'lighting',
    'camera-angle',
    'reference',
    'color-palette',
    'mood',
    'custom',
  ].includes(type);
}
