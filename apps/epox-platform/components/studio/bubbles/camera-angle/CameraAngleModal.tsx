'use client';

/**
 * Camera Angle Bubble Modal
 * Modal component for editing camera angle bubble values
 */

import { useState } from 'react';
import type { CameraAngleBubbleValue } from 'visualizer-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildTestId } from '@/lib/testing/testid';
import type { BubbleModalProps } from '../types';

const CAMERA_ANGLE_PRESETS = [
  'Eye Level',
  "Bird's Eye View",
  'Low Angle',
  'Wide Shot',
  'Close-Up',
  '45° Angle',
  'Isometric',
  'Dutch Angle',
];

export function CameraAngleModal({ value, onSave, onClose }: BubbleModalProps<CameraAngleBubbleValue>) {
  const [selectedAngle, setSelectedAngle] = useState(value.preset || '');

  const handleSave = () => {
    onSave({
      type: 'camera-angle',
      preset: selectedAngle,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid={buildTestId('bubble-modal', 'camera-angle')}>
        <DialogHeader>
          <DialogTitle>Camera Angle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {CAMERA_ANGLE_PRESETS.map((angle) => (
              <button
                key={angle}
                onClick={() => setSelectedAngle(angle)}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selectedAngle === angle
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
                data-testid={buildTestId('bubble-modal', 'camera-angle-preset', angle)}
              >
                {angle}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedAngle}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
