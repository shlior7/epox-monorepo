'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Common scene types
const COMMON_SCENE_TYPES = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Dining Room',
  'Bathroom',
  'Office',
  'Outdoor',
  'Garden',
  'Patio',
  'Balcony',
  'Studio',
  'Garage',
  'Hallway',
  'Closet',
  'Nursery',
  'Home Gym',
  'Library',
  'Entertainment Room',
];

// ===== PROPS =====

export interface ProductSectionProps {
  // Base images
  baseImages: Array<{ id: string; url: string; thumbnailUrl?: string }>;
  selectedBaseImageId?: string;
  onBaseImageSelect?: (imageId: string) => void;
  // Scene types
  sceneTypes: Array<{ sceneType: string }>;
  selectedSceneType?: string;
  onSceneTypeChange?: (sceneType: string) => void;
  className?: string;
}

// ===== COMPONENT =====

export function ProductSection({
  baseImages,
  selectedBaseImageId,
  onBaseImageSelect,
  sceneTypes,
  selectedSceneType,
  onSceneTypeChange,
  className,
}: ProductSectionProps) {
  const [baseImageModalOpen, setBaseImageModalOpen] = useState(false);
  const [sceneTypeModalOpen, setSceneTypeModalOpen] = useState(false);

  const selectedBaseImage = baseImages.find((img) => img.id === selectedBaseImageId);
  const hasMultipleBaseImages = baseImages.length > 1;
  const hasMultipleSceneTypes = sceneTypes.length > 1;

  // Combine product scene types with common scene types
  const allSceneTypes = Array.from(
    new Set([...sceneTypes.map((st) => st.sceneType), ...COMMON_SCENE_TYPES])
  ).sort();

  const handleBaseImageClick = () => {
    // Always open modal - user can select different base image
    setBaseImageModalOpen(true);
  };

  const handleSceneTypeClick = () => {
    // Always open modal - user can select/change scene type
    setSceneTypeModalOpen(true);
  };

  const handleBaseImageSelect = (imageId: string) => {
    onBaseImageSelect?.(imageId);
    setBaseImageModalOpen(false);
  };

  const handleSceneTypeSelect = (sceneType: string) => {
    onSceneTypeChange?.(sceneType);
    setSceneTypeModalOpen(false);
  };

  return (
    <>
      <section className={className} data-testid={buildTestId('product-section')}>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Product
        </h3>

        <div className="flex flex-wrap gap-2">
          {/* Base Image Bubble */}
          {selectedBaseImage && (
            <button
              onClick={handleBaseImageClick}
              className="group relative aspect-square h-16 w-16 cursor-pointer overflow-hidden rounded-lg border-2 border-primary ring-2 ring-primary/20 transition-all hover:ring-primary/40"
              data-testid={buildTestId('product-section', 'base-image-bubble')}
            >
              <Image
                src={selectedBaseImage.thumbnailUrl || selectedBaseImage.url}
                alt="Base"
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
              {/* Always show hover effect */}
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-80">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/40 shadow-lg">
                  <RefreshCw className="h-4 w-4 text-gray-900" />
                </div>
              </div>
            </button>
          )}

          {/* Scene Type Bubble */}
          {selectedSceneType ? (
            <button
              onClick={handleSceneTypeClick}
              className={cn(
                'group relative flex h-16 min-w-[64px] items-center justify-center rounded-lg border-2 px-3 transition-all',
                hasMultipleSceneTypes
                  ? 'cursor-pointer border-primary bg-primary/5 ring-2 ring-primary/20 hover:bg-primary/10 hover:ring-primary/40'
                  : 'cursor-pointer border-primary bg-primary/5 ring-2 ring-primary/20 hover:bg-primary/10 hover:ring-primary/40'
              )}
              data-testid={buildTestId('product-section', 'scene-type-bubble')}
            >
              <span className="text-xs font-medium text-foreground">{selectedSceneType}</span>
            </button>
          ) : (
            <button
              onClick={handleSceneTypeClick}
              className={cn(
                'group relative flex h-16 min-w-[64px] items-center justify-center rounded-lg border-2 border-dashed border-border px-3 transition-all hover:border-primary/50 hover:bg-accent'
              )}
              data-testid={buildTestId('product-section', 'scene-type-empty')}
            >
              <span className="text-xs font-medium text-muted-foreground">Select Scene Type</span>
            </button>
          )}
        </div>
      </section>

      {/* Base Image Selection Modal */}
      <Dialog open={baseImageModalOpen} onOpenChange={setBaseImageModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hasMultipleBaseImages ? 'Select Base Image' : 'Base Image'}
            </DialogTitle>
          </DialogHeader>
          {!hasMultipleBaseImages && (
            <p className="text-sm text-muted-foreground">
              This is the only available base image. Upload more images in Product Settings to have more options.
            </p>
          )}
          <div className="grid grid-cols-3 gap-3">
            {baseImages.map((img) => (
              <button
                key={img.id}
                onClick={() => handleBaseImageSelect(img.id)}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
                  selectedBaseImageId === img.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
                data-testid={buildTestId('product-section', 'modal-base-image', img.id)}
              >
                <Image
                  src={img.thumbnailUrl || img.url}
                  alt="Base"
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
                {selectedBaseImageId === img.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Scene Type Selection Modal */}
      <Dialog open={sceneTypeModalOpen} onOpenChange={setSceneTypeModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Scene Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            {allSceneTypes.map((sceneType) => (
              <button
                key={sceneType}
                onClick={() => handleSceneTypeSelect(sceneType)}
                className={cn(
                  'flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
                  selectedSceneType === sceneType
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                )}
                data-testid={buildTestId('product-section', 'modal-scene-type', sceneType)}
              >
                <span>{sceneType}</span>
                {selectedSceneType === sceneType && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
