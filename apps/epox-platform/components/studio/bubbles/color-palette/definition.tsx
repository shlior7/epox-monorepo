/**
 * Color Palette Bubble Definition
 * Registry definition for the color palette bubble type
 */

import { Palette } from 'lucide-react';
import type { ColorPaletteBubbleValue } from 'visualizer-types';
import type { BubbleDefinition } from '../types';
import { ColorPaletteModal } from './ColorPaletteModal';

export const colorPaletteBubble: BubbleDefinition<ColorPaletteBubbleValue> = {
  type: 'color-palette',
  label: 'Color Palette',
  icon: Palette,
  category: 'style',
  mergeStrategy: 'additive',
  allowMultiple: false,

  Modal: ColorPaletteModal,

  renderPreview: (value) => {
    if (value.colors && value.colors.length > 0) {
      return (
        <div className="flex h-full w-full flex-wrap gap-0.5 rounded-md p-1">
          {value.colors.slice(0, 4).map((color, i) => (
            <div key={i} className="h-1/2 flex-1 rounded-sm" style={{ backgroundColor: color }} />
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center px-1">
        <Palette className="h-6 w-6 text-foreground" />
        <span className="mt-0.5 text-center text-[12px] font-medium leading-tight text-foreground">
          Colors
        </span>
      </div>
    );
  },

  extractPromptContext: (value) => {
    if (value.colors && value.colors.length > 0) {
      const colorNames = value.colors.join(', ');
      return [`color palette: ${colorNames}`];
    }
    return [];
  },

  isEmpty: (value) => !value.colors || value.colors.length === 0,

  getDefaultValue: () => ({ type: 'color-palette' }),
};
