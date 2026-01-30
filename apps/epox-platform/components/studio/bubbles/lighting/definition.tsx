/**
 * Lighting Bubble Definition
 * Registry definition for the lighting bubble type
 */

import { Lightbulb } from 'lucide-react';
import type { LightingBubbleValue } from 'visualizer-types';
import type { BubbleDefinition } from '../types';
import { LightingModal } from './LightingModal';

export const lightingBubble: BubbleDefinition<LightingBubbleValue> = {
  type: 'lighting',
  label: 'Lighting',
  icon: Lightbulb,
  category: 'technical',
  mergeStrategy: 'single',
  allowMultiple: false,

  Modal: LightingModal,

  renderPreview: (value) => (
    <div className="flex flex-col items-center px-1">
      <Lightbulb className="h-6 w-6 text-foreground" />
      <span className="mt-0.5 text-center text-[12px] font-medium leading-tight text-foreground">
        {value.preset || value.customValue || 'Lighting'}
      </span>
    </div>
  ),

  extractPromptContext: (value) => {
    if (value.preset) {
      return [`${value.preset} lighting`];
    }
    if (value.customValue) {
      return [value.customValue];
    }
    return [];
  },

  isEmpty: (value) => !value.preset && !value.customValue,

  getDefaultValue: () => ({ type: 'lighting' }),
};
