'use client';

/**
 * Color Palette Bubble Modal
 * Modal component for editing color palette bubble values
 */

import { useState } from 'react';
import type { ColorPaletteBubbleValue } from 'visualizer-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import { buildTestId } from '@/lib/testing/testid';
import type { BubbleModalProps } from '../types';

export function ColorPaletteModal({ value, onSave, onClose }: BubbleModalProps<ColorPaletteBubbleValue>) {
  const [colors, setColors] = useState<string[]>(value.colors || ['#000000']);

  const addColor = () => {
    if (colors.length < 6) {
      setColors([...colors, '#000000']);
    }
  };

  const removeColor = (index: number) => {
    if (colors.length > 1) {
      setColors(colors.filter((_, i) => i !== index));
    }
  };

  const updateColor = (index: number, color: string) => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
  };

  const handleSave = () => {
    onSave({
      type: 'color-palette',
      colors: colors.filter((c) => c && c !== '#000000' || colors.length === 1),
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid={buildTestId('bubble-modal', 'color-palette')}>
        <DialogHeader>
          <DialogTitle>Color Palette</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {colors.map((color, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => updateColor(index, e.target.value)}
                  className="h-10 w-16 cursor-pointer p-1"
                  data-testid={buildTestId('bubble-modal', 'color-input', index)}
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => updateColor(index, e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#000000"
                  data-testid={buildTestId('bubble-modal', 'color-text', index)}
                />
                {colors.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeColor(index)}
                    data-testid={buildTestId('bubble-modal', 'remove-color', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {colors.length < 6 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addColor}
              className="w-full"
              data-testid={buildTestId('bubble-modal', 'add-color')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Color
            </Button>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
