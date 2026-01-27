/**
 * Mood Bubble Definition
 * Registry definition for the mood bubble type
 */

import { Heart } from 'lucide-react';
import type { MoodBubbleValue } from 'visualizer-types';
import type { BubbleDefinition } from '../types';
import { MoodModal } from './MoodModal';

export const moodBubble: BubbleDefinition<MoodBubbleValue> = {
  type: 'mood',
  label: 'Mood',
  icon: Heart,
  category: 'style',
  allowMultiple: false,

  Modal: MoodModal,

  renderPreview: (value) => (
    <div className="flex flex-col items-center px-1">
      <Heart className="h-4 w-4 text-foreground" />
      <span className="mt-0.5 text-center text-[9px] font-medium leading-tight text-foreground">
        {value.preset || 'Mood'}
      </span>
    </div>
  ),

  extractPromptContext: (value) => {
    if (value.preset) {
      return [`${value.preset.toLowerCase()} mood and atmosphere`];
    }
    return [];
  },

  isEmpty: (value) => !value.preset,

  getDefaultValue: () => ({ type: 'mood' }),
};
