'use client';

/**
 * Inspiration Bubble Modal
 * Modal component for editing inspiration bubble values (reference images)
 */

import { useState, useMemo } from 'react';
import type { ReferenceBubbleValue, InspirationSourceType } from 'visualizer-types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildTestId } from '@/lib/testing/testid';
import { InspirationStep } from '@/components/wizard';
import type { BubbleModalProps } from '../types';

export function InspirationModal({ value, onSave, onClose }: BubbleModalProps<ReferenceBubbleValue>) {
  const [selectedImages, setSelectedImages] = useState<string[]>(
    value.image ? [value.image.url] : []
  );
  const [selectedItems, setSelectedItems] = useState<
    Array<{ url: string; sourceType: InspirationSourceType }>
  >(
    value.image
      ? [{ url: value.image.url, sourceType: value.image.sourceType }]
      : []
  );

  // Track initial selection to detect changes
  const initialUrl = value.image?.url || '';
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
      const bubbles: ReferenceBubbleValue[] = selectedItems.map((item) => ({
        type: 'reference',
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
    <Dialog open onOpenChange={onClose}>
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
