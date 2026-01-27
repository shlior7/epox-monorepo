'use client';

/**
 * Style Bubble Modal
 * Modal component for editing style bubble values
 */

import { useState } from 'react';
import type { StyleBubbleValue } from 'visualizer-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { buildTestId } from '@/lib/testing/testid';
import type { BubbleModalProps } from '../types';

const STYLE_PRESETS = [
  'Modern',
  'Minimalist',
  'Industrial',
  'Scandinavian',
  'Bohemian',
  'Mid-Century',
  'Contemporary',
  'Traditional',
  'Rustic',
  'Eclectic',
];

export function StyleModal({ value, onSave, onClose }: BubbleModalProps<StyleBubbleValue>) {
  const [selectedStyle, setSelectedStyle] = useState(value.preset || '');
  const [customStyle, setCustomStyle] = useState(value.customValue || '');

  const handleSave = () => {
    onSave({
      type: 'style',
      preset: selectedStyle !== 'Custom' ? selectedStyle : undefined,
      customValue: selectedStyle === 'Custom' ? customStyle : undefined,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid={buildTestId('bubble-modal', 'style')}>
        <DialogHeader>
          <DialogTitle>Style</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selectedStyle === style
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
                data-testid={buildTestId('bubble-modal', 'style-preset', style)}
              >
                {style}
              </button>
            ))}
            <button
              onClick={() => setSelectedStyle('Custom')}
              className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                selectedStyle === 'Custom'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
              data-testid={buildTestId('bubble-modal', 'style-preset', 'custom')}
            >
              Custom
            </button>
          </div>

          {selectedStyle === 'Custom' && (
            <Textarea
              placeholder="Describe your custom style..."
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              className="min-h-[80px]"
              data-testid={buildTestId('bubble-modal', 'style-custom-input')}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedStyle || (selectedStyle === 'Custom' && !customStyle)}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
