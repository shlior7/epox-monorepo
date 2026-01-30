'use client';

import { Card } from '@/components/ui/card';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import { FlowDialogs } from './generation-flow/FlowDialogs';
import { FlowFooter } from './generation-flow/FlowFooter';
import { FlowHeaderOverlay } from './generation-flow/FlowHeaderOverlay';
import { FlowRevisionImage } from './generation-flow/FlowRevisionImage';
import { DEFAULT_SCENE_TYPES } from './generation-flow/types';
import type { FlowCardBaseProps } from './generation-flow/types';
import { useFlowCardState } from './generation-flow/use-flow-card-state';

export function GenerationFlowCard({
  flowId,
  collectionId,
  product,
  baseImages,
  selectedBaseImageId,
  revisions,
  status,
  approvalStatus,
  isPinned,
  sceneType,
  availableSceneTypes = DEFAULT_SCENE_TYPES,
  onChangeBaseImage,
  onChangeSceneType,
  onApprove,
  onReject,
  onDeleteRevision,
  onImageEdited,
  onGenerate,
  onOpenStudio,
  onFavorite,
  onSync,
  debugMode = false,
  onDebug,
  isSelected = false,
  onSelect,
  className,
  testId,
}: FlowCardBaseProps) {
  const state = useFlowCardState({
    revisions,
    baseImages,
    selectedBaseImageId,
    status,
    productName: product.name,
    onDeleteRevision,
    onImageEdited,
  });

  const cardContent = (
    <Card
      className={cn(
        'group flex flex-col overflow-hidden transition-all',
        state.isGenerating && 'ring-2 ring-warning/50',
        isSelected && 'ring-2 ring-primary',
        !state.isGenerating && !isSelected && 'hover:ring-2 hover:ring-primary/50',
        className
      )}
      testId={testId}
      data-flow-id={flowId}
    >
      {/* Main Preview / Status — clicking opens fullscreen */}
      <div
        className="cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (state.currentRevision) {
            state.setFullscreenImage(state.currentRevision.imageUrl);
          }
        }}
      >
        {/* Header Overlay — absolute on top of image (only when we have a revision) */}
        {state.currentRevision && (
          <div className="relative">
            <FlowRevisionImage
              testId={testId}
              currentRevision={state.currentRevision}
              revisions={revisions}
              currentRevisionIndex={state.currentRevisionIndex}
              status={status}
              isGenerating={state.isGenerating}
              hasRevisions={state.hasRevisions}
              showNavArrows
              canNavigatePrev={state.canNavigatePrev}
              canNavigateNext={state.canNavigateNext}
              onPrev={() => state.setCurrentRevisionIndex((i) => i - 1)}
              onNext={() => state.setCurrentRevisionIndex((i) => i + 1)}
              onClick={() => {
                if (state.currentRevision) {
                  state.setFullscreenImage(state.currentRevision.imageUrl);
                }
              }}
              onEdit={state.handleOpenEditor}
              onSync={onSync}
            />
            <FlowHeaderOverlay
              testId={testId}
              product={product}
              sceneType={sceneType}
              selectedBaseImage={state.selectedBaseImage}
              baseImages={baseImages}
              currentRevision={state.currentRevision}
              isGenerating={state.isGenerating}
              debugMode={debugMode}
              hasRevisions={state.hasRevisions}
              revisions={revisions}
              onBaseImageClick={() => state.setShowBaseImageModal(true)}
              onFavorite={onFavorite}
              onDownload={state.handleDownload}
              onDeleteRevision={onDeleteRevision}
              onSetDeleteConfirm={state.setDeleteConfirmRevisionId}
              onOpenStudio={onOpenStudio}
              onFullscreen={state.setFullscreenImage}
              onDebug={onDebug}
            />
          </div>
        )}

        {/* Show non-revision states directly */}
        {!state.currentRevision && (
          <FlowRevisionImage
            testId={testId}
            currentRevision={undefined}
            revisions={revisions}
            currentRevisionIndex={state.currentRevisionIndex}
            status={status}
            isGenerating={state.isGenerating}
            hasRevisions={state.hasRevisions}
            canNavigatePrev={false}
            canNavigateNext={false}
            onPrev={() => {}}
            onNext={() => {}}
            onClick={() => {}}
            onEdit={() => {}}
          />
        )}
      </div>

      {/* Horizontal Revision Gallery */}
      {state.hasRevisions && (
        <div
          className="border-t border-border bg-card/30 p-1"
          data-testid={buildTestId(testId, 'revisions')}
        >
          <div className="flex gap-1.5 overflow-x-auto p-1">
            {revisions.map((rev, idx) => (
              <div
                key={rev.id}
                className="group/revision relative flex-shrink-0"
                data-testid={buildTestId(testId, 'revision', rev.id)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    state.setCurrentRevisionIndex(idx);
                  }}
                  className={cn(
                    'h-14 w-14 overflow-hidden rounded ring-2 transition-all',
                    idx === state.currentRevisionIndex
                      ? 'ring-primary'
                      : 'ring-transparent hover:ring-primary/50'
                  )}
                  data-testid={buildTestId(testId, 'revision', rev.id, 'select')}
                >
                  <Image
                    src={rev.imageUrl}
                    alt={`Rev ${idx + 1}`}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </button>
                {onDeleteRevision && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      state.setDeleteConfirmRevisionId(rev.id);
                    }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover/revision:opacity-100"
                    data-testid={buildTestId(testId, 'revision', rev.id, 'delete')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <FlowFooter
        testId={testId}
        sceneType={sceneType}
        category={product.category}
        availableSceneTypes={availableSceneTypes}
        isGenerating={state.isGenerating}
        isSelected={isSelected}
        onSelect={onSelect}
        onChangeSceneType={onChangeSceneType}
        onGenerate={onGenerate}
      />
    </Card>
  );

  return (
    <>
      {cardContent}
      <FlowDialogs
        testId={testId}
        productId={product.id}
        showBaseImageModal={state.showBaseImageModal}
        setShowBaseImageModal={state.setShowBaseImageModal}
        baseImages={baseImages}
        selectedBaseImageId={selectedBaseImageId}
        onChangeBaseImage={onChangeBaseImage}
        showSceneTypeModal={state.showSceneTypeModal}
        setShowSceneTypeModal={state.setShowSceneTypeModal}
        sceneType={sceneType}
        availableSceneTypes={availableSceneTypes}
        onChangeSceneType={onChangeSceneType}
        fullscreenImage={state.fullscreenImage}
        setFullscreenImage={state.setFullscreenImage}
        revisions={revisions}
        currentRevisionIndex={state.currentRevisionIndex}
        setCurrentRevisionIndex={state.setCurrentRevisionIndex}
        canNavigatePrev={state.canNavigatePrev}
        canNavigateNext={state.canNavigateNext}
        deleteConfirmRevisionId={state.deleteConfirmRevisionId}
        setDeleteConfirmRevisionId={state.setDeleteConfirmRevisionId}
        handleConfirmDelete={state.handleConfirmDelete}
        editorOpen={state.editorOpen}
        setEditorOpen={state.setEditorOpen}
        editingRevision={state.editingRevision}
        handleImageSave={state.handleImageSave}
      />
    </>
  );
}
