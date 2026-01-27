/**
 * Bubble System Exports
 * Central export point for the extensible bubble system
 */

// Registry
export {
  getBubbleDefinition,
  getAllBubbleDefinitions,
  getBubblesByCategory,
  getAvailableBubbleTypes,
  canHaveMultipleBubbles,
  isBubbleTypeRegistered,
  type BubbleType,
} from './registry';

// Types
export type { BubbleDefinition, BubbleModalProps } from './types';

// Re-export bubble value types from visualizer-types
export type {
  BubbleValue,
  BaseBubbleValue,
  StyleBubbleValue,
  LightingBubbleValue,
  CameraAngleBubbleValue,
  ReferenceBubbleValue,
  ColorPaletteBubbleValue,
  MoodBubbleValue,
  CustomBubbleValue,
} from 'visualizer-types';
