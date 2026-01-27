'use client';

/**
 * Custom Bubble Modal
 * Modal component for editing custom bubble values
 */

import { useState } from 'react';
import type { CustomBubbleValue } from 'visualizer-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { buildTestId } from '@/lib/testing/testid';
import type { BubbleModalProps } from '../types';

export function CustomModal({ value, onSave, onClose }: BubbleModalProps<CustomBubbleValue>) {
  const [label, setLabel] = useState(value.label || '');
  const [customValue, setCustomValue] = useState(value.value || '');

  const handleSave = () => {
    onSave({
      type: 'custom',
      label: label || undefined,
      value: customValue,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid={buildTestId('bubble-modal', 'custom')}>
        <DialogHeader>
          <DialogTitle>Custom Inspiration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Label (optional)</label>
            <Input
              placeholder="e.g., Props, Accessories..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1"
              data-testid={buildTestId('bubble-modal', 'custom-label')}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe your custom inspiration..."
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="mt-1 min-h-[120px]"
              data-testid={buildTestId('bubble-modal', 'custom-input')}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!customValue}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
