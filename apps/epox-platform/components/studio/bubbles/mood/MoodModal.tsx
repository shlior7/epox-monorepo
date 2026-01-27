'use client';

/**
 * Mood Bubble Modal
 * Modal component for editing mood bubble values
 */

import { useState } from 'react';
import type { MoodBubbleValue } from 'visualizer-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildTestId } from '@/lib/testing/testid';
import type { BubbleModalProps } from '../types';

const MOOD_PRESETS = [
  'Calm & Peaceful',
  'Energetic & Vibrant',
  'Cozy & Intimate',
  'Sophisticated',
  'Playful',
  'Serene',
  'Dramatic',
  'Fresh & Airy',
];

export function MoodModal({ value, onSave, onClose }: BubbleModalProps<MoodBubbleValue>) {
  const [selectedMood, setSelectedMood] = useState(value.preset || '');

  const handleSave = () => {
    onSave({
      type: 'mood',
      preset: selectedMood,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid={buildTestId('bubble-modal', 'mood')}>
        <DialogHeader>
          <DialogTitle>Mood</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {MOOD_PRESETS.map((mood) => (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selectedMood === mood
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
                data-testid={buildTestId('bubble-modal', 'mood-preset', mood)}
              >
                {mood}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedMood}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
