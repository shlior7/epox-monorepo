/**
 * Style Bubble Definition
 * Registry definition for the style bubble type
 */

import { Sparkles } from 'lucide-react';
import type { StyleBubbleValue } from 'visualizer-types';
import type { BubbleDefinition } from '../types';
import { StyleModal } from './StyleModal';

export const styleBubble: BubbleDefinition<StyleBubbleValue> = {
  type: 'style',
  label: 'Style',
  icon: Sparkles,
  category: 'style',
  allowMultiple: false,

  Modal: StyleModal,

  renderPreview: (value) => (
    <div className="flex flex-col items-center px-1">
      <Sparkles className="h-4 w-4 text-foreground" />
      <span className="mt-0.5 text-center text-[9px] font-medium leading-tight text-foreground">
        {value.preset || value.customValue || 'Style'}
      </span>
    </div>
  ),

  extractPromptContext: (value) => {
    if (value.preset) {
      return [`${value.preset} style`];
    }
    if (value.customValue) {
      return [value.customValue];
    }
    return [];
  },

  isEmpty: (value) => !value.preset && !value.customValue,

  getDefaultValue: () => ({ type: 'style' }),
};
