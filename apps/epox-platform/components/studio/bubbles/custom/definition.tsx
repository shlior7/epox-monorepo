/**
 * Custom Bubble Definition
 * Registry definition for the custom bubble type
 */

import { Eye } from 'lucide-react';
import type { CustomBubbleValue } from 'visualizer-types';
import type { BubbleDefinition } from '../types';
import { CustomModal } from './CustomModal';

export const customBubble: BubbleDefinition<CustomBubbleValue> = {
  type: 'custom',
  label: 'Custom',
  icon: Eye,
  category: 'scene',
  allowMultiple: true, // Can have multiple custom bubbles

  Modal: CustomModal,

  renderPreview: (value) => (
    <div className="flex flex-col items-center px-1">
      <Eye className="h-4 w-4 text-foreground" />
      <span className="mt-0.5 text-center text-[9px] font-medium leading-tight text-foreground">
        {value.label || value.value?.substring(0, 12) || 'Custom'}
      </span>
    </div>
  ),

  extractPromptContext: (value) => {
    if (value.value) {
      return [value.value];
    }
    return [];
  },

  isEmpty: (value) => !value.value,

  getDefaultValue: () => ({ type: 'custom' }),
};
