'use client';

/**
 * Bubble Modals
 *
 * Modal components for editing bubble values.
 * Each bubble type can have its own modal interface.
 */

import { useState, useMemo } from 'react';
import type { BubbleValue, BubbleType, InspirationSourceType } from 'visualizer-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { buildTestId } from '@/lib/testing/testid';
import { InspirationStep } from '@/components/wizard';

// ===== COMMON PRESETS =====

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

const CAMERA_ANGLE_PRESETS = [
  'Eye Level',
  'Bird\'s Eye View',
  'Low Angle',
  'Wide Shot',
  'Close-Up',
  '45° Angle',
  'Isometric',
  'Dutch Angle',
];

// ===== MODAL PROPS =====

interface BubbleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bubbleValue: BubbleValue;
  onSave: (value: BubbleValue | BubbleValue[]) => void;
}

// ===== STYLE MODAL =====

export function StyleBubbleModal({ isOpen, onClose, bubbleValue, onSave }: BubbleModalProps) {
  const [selectedStyle, setSelectedStyle] = useState(
    bubbleValue.type === 'style' ? (bubbleValue.preset || '') : ''
  );
  const [customStyle, setCustomStyle] = useState(
    bubbleValue.type === 'style' ? (bubbleValue.customValue || '') : ''
  );

  const handleSave = () => {
    onSave({
      type: 'style',
      preset: selectedStyle || undefined,
      customValue: selectedStyle === 'Custom' ? customStyle : undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
            <Button onClick={handleSave} disabled={!selectedStyle}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== LIGHTING MODAL =====

export function LightingBubbleModal({ isOpen, onClose, bubbleValue, onSave }: BubbleModalProps) {
  const [selectedLighting, setSelectedLighting] = useState(
    bubbleValue.type === 'lighting' ? (bubbleValue.preset || '') : ''
  );
  const [customLighting, setCustomLighting] = useState(
    bubbleValue.type === 'lighting' ? (bubbleValue.customValue || '') : ''
  );

  const handleSave = () => {
    onSave({
      type: 'lighting',
      preset: selectedLighting || undefined,
      customValue: selectedLighting === 'Custom' ? customLighting : undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
            <Button onClick={handleSave} disabled={!selectedLighting}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== MOOD MODAL =====

export function MoodBubbleModal({ isOpen, onClose, bubbleValue, onSave }: BubbleModalProps) {
  const [selectedMood, setSelectedMood] = useState(
    bubbleValue.type === 'mood' ? (bubbleValue.preset || '') : ''
  );

  const handleSave = () => {
    onSave({
      type: 'mood',
      preset: selectedMood,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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

// ===== CAMERA ANGLE MODAL =====

export function CameraAngleBubbleModal({ isOpen, onClose, bubbleValue, onSave }: BubbleModalProps) {
  const [selectedAngle, setSelectedAngle] = useState(
    bubbleValue.type === 'camera-angle' ? (bubbleValue.preset || '') : ''
  );

  const handleSave = () => {
    onSave({
      type: 'camera-angle',
      preset: selectedAngle,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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

// ===== INSPIRATION IMAGE MODAL =====

export function InspirationBubbleModal({ isOpen, onClose, bubbleValue, onSave }: BubbleModalProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>(
    bubbleValue.type === 'reference' && bubbleValue.image ? [bubbleValue.image.url] : []
  );
  const [selectedItems, setSelectedItems] = useState<
    Array<{ url: string; sourceType: InspirationSourceType }>
  >(
    bubbleValue.type === 'reference' && bubbleValue.image
      ? [{ url: bubbleValue.image.url, sourceType: bubbleValue.image.sourceType }]
      : []
  );

  // Track initial selection to detect changes
  const initialUrl = bubbleValue.type === 'reference' && bubbleValue.image ? bubbleValue.image.url : '';
  const initialUrlSet = useMemo(() => new Set([initialUrl].filter(Boolean)), [initialUrl]);

  const hasNewSelection = useMemo(() => {
    // Check if there are any new selections (not in the initial set)
    const newSelections = selectedItems.filter((item) => !initialUrlSet.has(item.url));
    if (newSelections.length > 0) return true;

    // Check if the selection changed (cleared or different)
    if (initialUrl !== '' && selectedItems.length === 0) return true;
    if (selectedItems.length > 0 && selectedItems[0].url !== initialUrl) return true;

    return false;
  }, [selectedItems, initialUrl, initialUrlSet]);

  const handleSave = () => {
    if (selectedItems.length === 0) {
      // Clear the inspiration image
      onSave({
        type: 'reference',
        image: undefined,
      });
    } else if (selectedItems.length === 1) {
      // Single selection - update the current bubble
      onSave({
        type: 'reference',
        image: {
          url: selectedItems[0].url,
          sourceType: selectedItems[0].sourceType,
          addedAt: new Date().toISOString(),
        },
      });
    } else {
      // Multiple selections - return array of bubbles
      const bubbles: Array<BubbleValue & { type: 'reference' }> = selectedItems.map((item) => ({
        type: 'reference' as const,
        image: {
          url: item.url,
          sourceType: item.sourceType,
          addedAt: new Date().toISOString(),
        },
      }));
      onSave(bubbles);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="flex max-h-[85vh] max-w-5xl flex-col overflow-hidden p-0"
        data-testid={buildTestId('bubble-modal', 'inspiration')}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Add Inspiration Images</h2>
            <p className="text-sm text-muted-foreground">
              Choose from explore, saved images, or upload your own. Select multiple to add as separate bubbles.
            </p>
          </div>
          <InspirationStep
            selectedImages={selectedImages}
            onImagesChange={setSelectedImages}
            selectedItems={selectedItems}
            onSelectedItemsChange={setSelectedItems}
          />
        </div>
        <div className="flex items-center justify-between border-t border-border bg-card/80 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {selectedImages.length > 0
              ? selectedImages.length === 1
                ? '1 image selected'
                : `${selectedImages.length} images selected`
              : 'No images selected'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasNewSelection}>
              {selectedItems.length === 0
                ? 'Clear'
                : selectedItems.length === 1
                ? 'Save Image'
                : `Add ${selectedItems.length} Images`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== CUSTOM BUBBLE MODAL =====

export function CustomBubbleModal({ isOpen, onClose, bubbleValue, onSave }: BubbleModalProps) {
  const [customValue, setCustomValue] = useState(
    bubbleValue.type === 'custom' ? (bubbleValue.value || '') : ''
  );

  const handleSave = () => {
    onSave({
      type: 'custom',
      value: customValue,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid={buildTestId('bubble-modal', 'custom')}>
        <DialogHeader>
          <DialogTitle>Custom Inspiration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Describe your custom inspiration..."
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="min-h-[120px]"
            data-testid={buildTestId('bubble-modal', 'custom-input')}
          />

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

// ===== MODAL ROUTER =====

/**
 * Renders the appropriate modal based on bubble type
 */
export function BubbleModal({
  type,
  isOpen,
  onClose,
  bubbleValue,
  onSave,
}: {
  type: BubbleType;
  isOpen: boolean;
  onClose: () => void;
  bubbleValue: BubbleValue;
  onSave: (value: BubbleValue | BubbleValue[]) => void;
}) {
  switch (type) {
    case 'style':
      return <StyleBubbleModal isOpen={isOpen} onClose={onClose} bubbleValue={bubbleValue} onSave={onSave} />;
    case 'lighting':
      return <LightingBubbleModal isOpen={isOpen} onClose={onClose} bubbleValue={bubbleValue} onSave={onSave} />;
    case 'mood':
      return <MoodBubbleModal isOpen={isOpen} onClose={onClose} bubbleValue={bubbleValue} onSave={onSave} />;
    case 'camera-angle':
      return <CameraAngleBubbleModal isOpen={isOpen} onClose={onClose} bubbleValue={bubbleValue} onSave={onSave} />;
    case 'reference':
      return <InspirationBubbleModal isOpen={isOpen} onClose={onClose} bubbleValue={bubbleValue} onSave={onSave} />;
    case 'custom':
      return <CustomBubbleModal isOpen={isOpen} onClose={onClose} bubbleValue={bubbleValue} onSave={onSave} />;
    default:
      return null;
  }
}
