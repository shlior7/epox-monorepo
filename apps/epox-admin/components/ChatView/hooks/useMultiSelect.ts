// hooks/useMultiSelect.ts
import { useState } from 'react';

export function useMultiSelect() {
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [multiSelectAction, setMultiSelectAction] = useState<'favorite' | 'download' | null>(null);

  const handleStartMultiSelect = (action: 'favorite' | 'download') => {
    setIsMultiSelectMode(true);
    setMultiSelectAction(action);
    setSelectedImages(new Set());
  };

  const handleCancelMultiSelect = () => {
    setIsMultiSelectMode(false);
    setMultiSelectAction(null);
    setSelectedImages(new Set());
  };

  const handleToggleImageSelection = (imageId: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const handleSelectAllImages = (allImageIds: string[]) => {
    setSelectedImages(new Set(allImageIds));
  };

  return {
    isMultiSelectMode,
    selectedImages,
    multiSelectAction,
    handleStartMultiSelect,
    handleCancelMultiSelect,
    handleToggleImageSelection,
    handleSelectAllImages,
  };
}
