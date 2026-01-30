'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ImageEditorModal } from '@/components/studio/modals/ImageEditorModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import type { BaseImage, Revision } from './types';

interface FlowDialogsProps {
  testId?: string;
  productId: string;

  // Base image modal
  showBaseImageModal: boolean;
  setShowBaseImageModal: (open: boolean) => void;
  baseImages: BaseImage[];
  selectedBaseImageId: string;
  onChangeBaseImage?: (baseImageId: string) => void;

  // Scene type modal
  showSceneTypeModal: boolean;
  setShowSceneTypeModal: (open: boolean) => void;
  sceneType?: string;
  availableSceneTypes: string[];
  onChangeSceneType?: (sceneType: string) => void;

  // Fullscreen dialog
  fullscreenImage: string | null;
  setFullscreenImage: (url: string | null) => void;
  revisions: Revision[];
  currentRevisionIndex: number;
  setCurrentRevisionIndex: (index: number | ((i: number) => number)) => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;

  // Delete confirmation
  deleteConfirmRevisionId: string | null;
  setDeleteConfirmRevisionId: (id: string | null) => void;
  handleConfirmDelete: () => void;

  // Image editor
  editorOpen: boolean;
  setEditorOpen: (open: boolean) => void;
  editingRevision: Revision | null | undefined;
  handleImageSave: (result: {
    mode: 'overwrite' | 'copy';
    imageDataUrl: string;
    imageUrl?: string;
    assetId?: string;
  }) => void;
}

export function FlowDialogs({
  testId,
  productId,
  showBaseImageModal,
  setShowBaseImageModal,
  baseImages,
  selectedBaseImageId,
  onChangeBaseImage,
  showSceneTypeModal,
  setShowSceneTypeModal,
  sceneType,
  availableSceneTypes,
  onChangeSceneType,
  fullscreenImage,
  setFullscreenImage,
  revisions,
  currentRevisionIndex,
  setCurrentRevisionIndex,
  canNavigatePrev,
  canNavigateNext,
  deleteConfirmRevisionId,
  setDeleteConfirmRevisionId,
  handleConfirmDelete,
  editorOpen,
  setEditorOpen,
  editingRevision,
  handleImageSave,
}: FlowDialogsProps) {
  return (
    <>
      {/* Base Image Modal */}
      <Dialog open={showBaseImageModal} onOpenChange={setShowBaseImageModal}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Select Base Image</DialogTitle>
            <DialogDescription>Choose a base image for this generation flow</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            {baseImages.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeBaseImage?.(img.id);
                  setShowBaseImageModal(false);
                }}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-lg ring-2 transition-all hover:scale-105',
                  img.id === selectedBaseImageId
                    ? 'ring-primary ring-offset-2'
                    : 'ring-border hover:ring-primary/50'
                )}
                data-testid={buildTestId(testId, 'base-image-option', img.id)}
              >
                <Image
                  src={img.url}
                  alt="Base option"
                  fill
                  className="object-cover"
                  sizes="120px"
                  unoptimized
                />
                {img.id === selectedBaseImageId && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Scene Type Modal */}
      <Dialog open={showSceneTypeModal} onOpenChange={setShowSceneTypeModal}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Change Scene Type</DialogTitle>
            <DialogDescription>Select a scene type for this product</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {availableSceneTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeSceneType?.(type);
                  setShowSceneTypeModal(false);
                }}
                className={cn(
                  'rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all hover:bg-accent',
                  type === sceneType
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
                data-testid={buildTestId(testId, 'scene-type-option', type)}
              >
                {type}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Dialog */}
      <Dialog open={!!fullscreenImage} onOpenChange={(open) => !open && setFullscreenImage(null)}>
        <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-hidden border-none bg-black/95 p-0">
          {fullscreenImage && (
            <div className="relative flex h-full w-full items-center justify-center">
              <Image
                src={fullscreenImage}
                alt="Fullscreen preview"
                width={1920}
                height={1080}
                className="max-h-[85vh] max-w-full object-contain"
                unoptimized
              />
              {revisions.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (canNavigatePrev) {
                        const newIndex = currentRevisionIndex - 1;
                        setCurrentRevisionIndex(newIndex);
                        setFullscreenImage(revisions[newIndex].imageUrl);
                      }
                    }}
                    className={cn(
                      'absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-all hover:bg-black/70',
                      !canNavigatePrev && 'cursor-not-allowed opacity-30'
                    )}
                    disabled={!canNavigatePrev}
                  >
                    <ChevronLeft className="h-6 w-6 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (canNavigateNext) {
                        const newIndex = currentRevisionIndex + 1;
                        setCurrentRevisionIndex(newIndex);
                        setFullscreenImage(revisions[newIndex].imageUrl);
                      }
                    }}
                    className={cn(
                      'absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-all hover:bg-black/70',
                      !canNavigateNext && 'cursor-not-allowed opacity-30'
                    )}
                    disabled={!canNavigateNext}
                  >
                    <ChevronRight className="h-6 w-6 text-white" />
                  </button>
                </>
              )}
              {revisions.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                  {currentRevisionIndex + 1} / {revisions.length}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmRevisionId}
        onOpenChange={(open) => !open && setDeleteConfirmRevisionId(null)}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete revision?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this generated image. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid={buildTestId(testId, 'confirm-delete')}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Editor Modal */}
      {editingRevision && !editingRevision.isVideo && (
        <ImageEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          imageUrl={editingRevision.imageUrl}
          imageType="generated"
          imageId={editingRevision.id}
          productId={productId}
          onSave={handleImageSave}
        />
      )}
    </>
  );
}
