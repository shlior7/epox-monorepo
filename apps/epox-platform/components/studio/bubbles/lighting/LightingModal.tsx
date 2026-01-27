'use client';

/**
 * Lighting Bubble Modal
 * Modal component for editing lighting bubble values
 */

import { useState } from 'react';
import type { LightingBubbleValue } from 'visualizer-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { buildTestId } from '@/lib/testing/testid';
import type { BubbleModalProps } from '../types';

const LIGHTING_PRESETS = [
  'Natural Daylight',
  'Warm Evening',
  'Studio Soft Light',
  'Dramatic Side Light',
  'Sunset Glow',
  'Morning Light',
  'Overcast',
  'Golden Hour',
];

export function LightingModal({ value, onSave, onClose }: BubbleModalProps<LightingBubbleValue>) {
  const [selectedLighting, setSelectedLighting] = useState(value.preset || '');
  const [customLighting, setCustomLighting] = useState(value.customValue || '');

  const handleSave = () => {
    onSave({
      type: 'lighting',
      preset: selectedLighting !== 'Custom' ? selectedLighting : undefined,
      customValue: selectedLighting === 'Custom' ? customLighting : undefined,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid={buildTestId('bubble-modal', 'lighting')}>
        <DialogHeader>
          <DialogTitle>Lighting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {LIGHTING_PRESETS.map((lighting) => (
              <button
                key={lighting}
                onClick={() => setSelectedLighting(lighting)}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selectedLighting === lighting
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
                data-testid={buildTestId('bubble-modal', 'lighting-preset', lighting)}
              >
                {lighting}
              </button>
            ))}
            <button
              onClick={() => setSelectedLighting('Custom')}
              className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                selectedLighting === 'Custom'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
              data-testid={buildTestId('bubble-modal', 'lighting-preset', 'custom')}
            >
              Custom
            </button>
          </div>

          {selectedLighting === 'Custom' && (
            <Textarea
              placeholder="Describe your custom lighting..."
              value={customLighting}
              onChange={(e) => setCustomLighting(e.target.value)}
              className="min-h-[80px]"
              data-testid={buildTestId('bubble-modal', 'lighting-custom-input')}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedLighting || (selectedLighting === 'Custom' && !customLighting)}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
