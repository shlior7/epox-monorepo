/**
 * Inspiration Bubble Definition
 * Registry definition for the inspiration bubble type (reference images)
 */

import { Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import type { ReferenceBubbleValue } from 'visualizer-types';
import type { BubbleDefinition } from '../types';
import { ReferenceModal } from './referenceModal';

export const referenceBubble: BubbleDefinition<ReferenceBubbleValue> = {
  type: 'reference',
  label: 'Reference',
  icon: ImageIcon,
  category: 'scene',
  mergeStrategy: 'additive',
  allowMultiple: true, // Can have multiple reference images

  Modal: ReferenceModal,

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
        <ImageIcon className="h-6 w-6 text-foreground" />
        <span className="mt-0.5 text-center text-[12px] font-medium leading-tight text-foreground">
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
