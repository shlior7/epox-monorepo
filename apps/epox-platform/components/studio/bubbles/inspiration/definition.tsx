/**
 * Inspiration Bubble Definition
 * Registry definition for the inspiration bubble type (reference images)
 */

import { Lightbulb } from 'lucide-react';
import Image from 'next/image';
import type { ReferenceBubbleValue } from 'visualizer-types';
import type { BubbleDefinition } from '../types';
import { InspirationModal } from './InspirationModal';

export const referenceBubble: BubbleDefinition<ReferenceBubbleValue> = {
  type: 'reference',
  label: 'Reference',
  icon: Lightbulb,
  category: 'scene',
  allowMultiple: true, // Can have multiple reference images

  Modal: InspirationModal,

  renderPreview: (value) => {
    if (value.image) {
      return (
        <div className="relative h-full w-full overflow-hidden rounded-md">
          <Image
            src={value.image.thumbnailUrl || value.image.url}
            alt="Reference"
            fill
            sizes="56px"
            className="object-cover"
            unoptimized
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center px-1">
        <Lightbulb className="h-4 w-4 text-foreground" />
        <span className="mt-0.5 text-center text-[9px] font-medium leading-tight text-foreground">
          Reference
        </span>
      </div>
    );
  },

  extractPromptContext: (value) => {
    if (value.image) {
      return ['inspired by reference image'];
    }
    return [];
  },

  isEmpty: (value) => !value.image,

  getDefaultValue: () => ({ type: 'reference' }),
};
