'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { InspirationImage, InspirationSourceType } from 'visualizer-types';
import { InspirationStep } from '../wizard';

interface InspirationImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    items: Array<{ url: string; sourceType: InspirationSourceType }>
  ) => Promise<void> | void;
  existingImages?: InspirationImage[];
  isProcessing?: boolean;
}

export function InspirationImageModal({
  isOpen,
  onClose,
  onSubmit,
  existingImages = [],
  isProcessing = false,
}: InspirationImageModalProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    Array<{ url: string; sourceType: InspirationSourceType }>
  >([]);

  const existingUrlSet = useMemo(
    () => new Set(existingImages.map((img) => img.url)),
    [existingImages]
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedImages(existingImages.map((img) => img.url));
    setSelectedItems(existingImages.map((img) => ({ url: img.url, sourceType: img.sourceType })));
  }, [existingImages, isOpen]);

  const newSelections = useMemo(
    () => selectedItems.filter((item) => !existingUrlSet.has(item.url)),
    [existingUrlSet, selectedItems]
  );

  const handleSubmit = async () => {
    if (isProcessing || newSelections.length === 0) {
      onClose();
      return;
    }
    await onSubmit(newSelections);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-5xl flex-col overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto p-6">
          <InspirationStep
            selectedImages={selectedImages}
            onImagesChange={setSelectedImages}
            selectedItems={selectedItems}
            onSelectedItemsChange={setSelectedItems}
          />
        </div>
        <div className="flex items-center justify-between border-t border-border bg-card/80 px-6 py-4">
          <p className="text-xs text-muted-foreground">{selectedImages.length} selected</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isProcessing || newSelections.length === 0}>
              {isProcessing ? 'Analyzing...' : `Add Selected (${newSelections.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
