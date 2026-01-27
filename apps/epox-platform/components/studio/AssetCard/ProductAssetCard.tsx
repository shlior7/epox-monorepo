'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Settings2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { ImageEditOverlay } from '@/components/ui/image-edit-overlay';
import { ImageEditorModal } from '@/components/studio/modals/ImageEditorModal';
import {
  type AssetConfiguration,
  AssetCardWrapper,
  AssetCardHeader,
  AssetCardContent,
  ImageThumbnail,
  ConfigBadges,
  StatusBadges,
  AssetActionBar,
  GalleryNavigation,
  ThumbnailStrip,
} from './AssetCardContent';
import { AssetCardFooter } from './AssetCardFooter';
import type { ImageAspectRatio } from 'visualizer-types';

interface Revision {
  id: string;
  imageUrl: string;
  timestamp: Date;
  type: 'generated' | 'original' | 'edited';
  isVideo?: boolean;
  aspectRatio?: ImageAspectRatio;
}

interface ProductAssetCardProps {
  product: {
    id: string;
    name: string;
    sku?: string;
    thumbnailUrl?: string;
  };
  revisions: Revision[];
  currentIndex?: number;
  configuration?: AssetConfiguration;
  isPinned?: boolean;
  isApproved?: boolean;
  isGenerating?: boolean;
  onPin?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDownload?: () => void;
  onDelete?: (revisionId: string) => void;
  onGenerate?: () => void;
  onOpenStudio?: () => void;
  onImageEdited?: (revisionId: string, result: { mode: 'overwrite' | 'copy'; imageDataUrl: string; imageUrl?: string; assetId?: string }) => void;
  className?: string;
  testId?: string;
}

export function ProductAssetCard({
  product,
  revisions,
  currentIndex: controlledIndex,
  configuration,
  isPinned = false,
  isApproved = false,
  isGenerating = false,
  onPin,
  onApprove,
  onReject,
  onDownload,
  onDelete,
  onGenerate,
  onOpenStudio,
  onImageEdited,
  className,
  testId,
}: ProductAssetCardProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const currentIndex = controlledIndex ?? internalIndex;

  const currentRevision = revisions[currentIndex];
  const hasRevisions = revisions.length > 0;
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < revisions.length - 1;

  const handlePrev = () => {
    if (canNavigatePrev) setInternalIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (canNavigateNext) setInternalIndex(currentIndex + 1);
  };

  const handleImageSave = useCallback((result: { mode: 'overwrite' | 'copy'; imageDataUrl: string; imageUrl?: string; assetId?: string }) => {
    if (currentRevision && onImageEdited) {
      onImageEdited(currentRevision.id, result);
    }
  }, [currentRevision, onImageEdited]);

  return (
    <AssetCardWrapper className={className} testId={testId}>
      {/* Header */}
      <AssetCardHeader testId={buildTestId(testId, 'header')}>
        {/* Product Thumbnail */}
        <ImageThumbnail
          src={product.thumbnailUrl || ''}
          alt={product.name}
          size="md"
          testId={buildTestId(testId, 'thumbnail')}
        />

        {/* Product Name */}
        <div className="min-w-0 flex-1" data-testid={buildTestId(testId, 'product')}>
          <p className="truncate text-sm font-medium" data-testid={buildTestId(testId, 'name')}>
            {product.name}
          </p>
          {product.sku && (
            <p
              className="truncate text-xs text-muted-foreground"
              data-testid={buildTestId(testId, 'sku')}
            >
              {product.sku}
            </p>
          )}
        </div>

        {/* Config and Status */}
        <div className="hidden sm:block" data-testid={buildTestId(testId, 'config')}>
          <ConfigBadges configuration={configuration} testId={buildTestId(testId, 'config', 'badges')} />
        </div>
        <StatusBadges
          isPinned={isPinned}
          isApproved={isApproved}
          testId={buildTestId(testId, 'status')}
        />
      </AssetCardHeader>

      {/* Content */}
      <AssetCardContent aspectRatio={currentRevision?.aspectRatio} testId={buildTestId(testId, 'content')}>
        {isGenerating ? (
          // Generating state - show loader overlay with existing content behind
          <div className="relative h-full w-full">
            {hasRevisions && currentRevision && (
              <Image
                src={currentRevision.imageUrl}
                alt={`${product.name} - Revision ${currentIndex + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain opacity-30"
                unoptimized
              />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="rounded-full bg-primary/10 p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Generating...</p>
            </div>
          </div>
        ) : hasRevisions && currentRevision ? (
          <>
            {currentRevision.isVideo ? (
              <video
                src={currentRevision.imageUrl}
                className="h-full w-full object-contain"
                controls
                muted
                playsInline
              />
            ) : (
              <ImageEditOverlay
                onEdit={() => setEditorOpen(true)}
                className="h-full w-full"
                testId={buildTestId(testId, 'image', 'edit-overlay')}
              >
                <Image
                  src={currentRevision.imageUrl}
                  alt={`${product.name} - Revision ${currentIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
                  unoptimized
                />
              </ImageEditOverlay>
            )}

            {/* Gallery Navigation */}
            <GalleryNavigation
              canPrev={canNavigatePrev}
              canNext={canNavigateNext}
              onPrev={handlePrev}
              onNext={handleNext}
              currentIndex={currentIndex}
              totalCount={revisions.length}
              testId={buildTestId(testId, 'gallery')}
            />
          </>
        ) : (
          // Empty state
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-full bg-muted p-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No images yet</p>
              <p className="text-xs text-muted-foreground">Generate images for this product</p>
            </div>
            {onGenerate && (
              <Button size="sm" onClick={onGenerate} className="mt-2">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </Button>
            )}
          </div>
        )}
      </AssetCardContent>

      {/* Footer */}
      <AssetCardFooter testId={buildTestId(testId, 'footer')}>
        {hasRevisions ? (
          <AssetActionBar
            isPinned={isPinned}
            isApproved={isApproved}
            showLabels={false}
            onPin={onPin}
            onApprove={onApprove}
            onReject={onReject}
            onDownload={onDownload}
            onDelete={currentRevision ? () => onDelete?.(currentRevision.id) : undefined}
            additionalActions={
              <ThumbnailStrip
                thumbnails={revisions.map((r) => ({ id: r.id, url: r.imageUrl }))}
                currentIndex={currentIndex}
                onSelect={setInternalIndex}
                testId={buildTestId(testId, 'thumbnails')}
              />
            }
            testId={buildTestId(testId, 'actions')}
          />
        ) : (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={onOpenStudio}
              testId={buildTestId(testId, 'open-studio')}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="text-xs">Open Studio</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  testId={buildTestId(testId, 'menu')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" testId={buildTestId(testId, 'menu', 'content')}>
                {onOpenStudio && (
                  <DropdownMenuItem
                    onClick={onOpenStudio}
                    testId={buildTestId(testId, 'menu', 'open-studio')}
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Open Studio
                  </DropdownMenuItem>
                )}
                {onGenerate && (
                  <DropdownMenuItem
                    onClick={onGenerate}
                    testId={buildTestId(testId, 'menu', 'generate')}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </AssetCardFooter>

      {/* Image Editor Modal */}
      {currentRevision && !currentRevision.isVideo && (
        <ImageEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          imageUrl={currentRevision.imageUrl}
          imageType="generated"
          imageId={currentRevision.id}
          productId={product.id}
          onSave={handleImageSave}
        />
      )}
    </AssetCardWrapper>
  );
}
