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

export interface HumanInteractionBubbleValue extends BaseBubbleValue {
  type: 'human-interaction';
  preset?: 'none' | 'partial' | 'full' | 'contextual'; // none = no human, partial = hands/arms only, full = full person, contextual = depends on product
  customValue?: string; // e.g., "Person sitting naturally on the chair"
}

export interface PropsBubbleValue extends BaseBubbleValue {
  type: 'props';
  preset?: 'none' | 'minimal' | 'styled' | 'lifestyle'; // none = no props, minimal = few props, styled = curated, lifestyle = lived-in
  customValue?: string; // e.g., "Coffee table books, small plant, textured throw"
}

export interface BackgroundBubbleValue extends BaseBubbleValue {
  type: 'background';
  preset?: string; // e.g., "Clean wall", "Window view", "Urban loft"
  customValue?: string;
}

// ===== DISCRIMINATED UNION =====

export type BubbleValue =
  | StyleBubbleValue
  | LightingBubbleValue
  | CameraAngleBubbleValue
  | ReferenceBubbleValue
  | ColorPaletteBubbleValue
  | MoodBubbleValue
  | CustomBubbleValue
  | HumanInteractionBubbleValue
  | PropsBubbleValue
  | BackgroundBubbleValue;

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
    'human-interaction',
    'props',
    'background',
  ].includes(type);
}
