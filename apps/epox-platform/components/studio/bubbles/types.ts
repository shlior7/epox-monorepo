/**
 * Bubble Registry Types
 * Type definitions for the extensible bubble system
 */

import type { BaseBubbleValue } from 'visualizer-types';
import type { LucideIcon } from 'lucide-react';

// ===== BUBBLE MODAL PROPS =====

export interface BubbleModalProps<T extends BaseBubbleValue = BaseBubbleValue> {
  value: Partial<T>;
  onSave: (value: T | T[]) => void;
  onClose: () => void;
}

// ===== BUBBLE DEFINITION =====

export interface BubbleDefinition<T extends BaseBubbleValue = BaseBubbleValue> {
  // Metadata
  type: string;
  label: string;
  icon: LucideIcon;
  category: 'style' | 'scene' | 'technical';
  allowMultiple: boolean;

  // UI Components
  Modal: React.ComponentType<BubbleModalProps<T>>;
  renderPreview: (value: T) => React.ReactNode;

  // Prompt Enhancement
  extractPromptContext: (value: T) => string[];

  // Value Helpers
  isEmpty: (value: Partial<T>) => boolean;
  getDefaultValue: () => Partial<T>;
}
