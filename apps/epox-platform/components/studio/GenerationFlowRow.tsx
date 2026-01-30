'use client';

import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import {
  Bug,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { FlowDialogs } from './generation-flow/FlowDialogs';
import { DEFAULT_SCENE_TYPES } from './generation-flow/types';
import type { FlowCardBaseProps } from './generation-flow/types';
import { useFlowCardState } from './generation-flow/use-flow-card-state';

export function GenerationFlowRow({
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
  onOpenProductDetails,
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

  const [showCustomSceneInput, setShowCustomSceneInput] = useState(false);
  const [customSceneType, setCustomSceneType] = useState('');

  return (
    <>
      <Card
        className={cn(
          'group flex flex-row overflow-hidden transition-all',
          state.isGenerating && 'ring-2 ring-warning/50',
          isSelected && 'ring-2 ring-primary',
          !state.isGenerating && !isSelected && 'hover:ring-2 hover:ring-primary/50',
          className
        )}
        testId={testId}
        data-flow-id={flowId}
      >
        {/* Left: Product info column */}
        <div
          className="flex w-56 shrink-0 flex-col justify-between border-r border-border bg-card/50 p-3"
          data-testid={buildTestId(testId, 'info')}
        >
          <div className="space-y-2">
            {/* Base image + product name + more actions */}
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (baseImages.length > 0) {
                    state.setShowBaseImageModal(true);
                  }
                }}
                className="group/thumb relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary ring-1 ring-border transition-all hover:ring-primary/50"
                data-testid={buildTestId(testId, 'base-image')}
                disabled={baseImages.length === 0}
              >
                {state.selectedBaseImage?.url ? (
                  <>
                    <Image
                      src={state.selectedBaseImage.url}
                      alt="Base"
                      width={64}
                      height={64}
                      className="h-full w-full rounded object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded bg-black/60 opacity-0 transition-opacity group-hover/thumb:opacity-100">
                      <RefreshCw className="h-3.5 w-3.5 text-white/90" />
                    </div>
                  </>
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold"
                      data-testid={buildTestId(testId, 'name')}
                    >
                      {product.name}
                    </p>
                    {product.category && (
                      <p className="truncate text-xs text-muted-foreground">{product.category}</p>
                    )}
                  </div>
                  {/* More actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        data-testid={buildTestId(testId, 'action-more')}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenStudio?.();
                        }}
                        data-testid={buildTestId(testId, 'action-open-studio')}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Product Studio
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProductDetails?.();
                        }}
                        data-testid={buildTestId(testId, 'action-product-details')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Product Details
                      </DropdownMenuItem>
                      {debugMode && onDebug && state.hasRevisions && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              const revisionId = state.currentRevision?.id || revisions[0]?.id;
                              if (revisionId) onDebug(revisionId);
                            }}
                            data-testid={buildTestId(testId, 'action-debug')}
                          >
                            <Bug className="mr-2 h-4 w-4" />
                            Debug info
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Scene type dropdown */}
            <DropdownMenu open={showCustomSceneInput ? true : undefined}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                    sceneType
                      ? 'bg-muted text-muted-foreground hover:bg-accent'
                      : 'border border-dashed border-border text-muted-foreground hover:border-foreground/30'
                  )}
                  data-testid={buildTestId(testId, 'scene-type-dropdown')}
                >
                  <span className="max-w-[100px] truncate">{sceneType || 'Scene type'}</span>
                  <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                {showCustomSceneInput ? (
                  <div className="p-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="Enter scene type..."
                      value={customSceneType}
                      onChange={(e) => setCustomSceneType(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customSceneType.trim()) {
                          onChangeSceneType?.(customSceneType.trim());
                          setShowCustomSceneInput(false);
                          setCustomSceneType('');
                        } else if (e.key === 'Escape') {
                          setShowCustomSceneInput(false);
                          setCustomSceneType('');
                        }
                      }}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                      autoFocus
                    />
                    <div className="mt-2 flex gap-1">
                      <button
                        onClick={() => {
                          if (customSceneType.trim()) {
                            onChangeSceneType?.(customSceneType.trim());
                            setShowCustomSceneInput(false);
                            setCustomSceneType('');
                          }
                        }}
                        className="flex-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowCustomSceneInput(false);
                          setCustomSceneType('');
                        }}
                        className="flex-1 rounded border border-border px-2 py-1 text-xs hover:bg-accent"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {availableSceneTypes.map((type) => (
                      <DropdownMenuItem
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeSceneType?.(type);
                        }}
                        className={cn(
                          type === sceneType ? 'bg-primary/10 font-medium text-primary' : ''
                        )}
                        data-testid={buildTestId(testId, 'scene-type', type)}
                      >
                        {type}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCustomSceneInput(true);
                      }}
                      className="border-t border-border font-medium text-primary"
                      data-testid={buildTestId(testId, 'scene-type', 'custom')}
                    >
                      + Custom...
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Category tag */}
            {product.category && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                data-testid={buildTestId(testId, 'category-tag')}
              >
                <Tag className="h-2.5 w-2.5" />
                {product.category}
              </span>
            )}
          </div>

          {/* Bottom: checkbox + generate */}
          <div className="mt-2 flex items-center justify-between">
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-black"
                data-testid={buildTestId(testId, 'checkbox')}
              />
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerate?.();
                    }}
                    disabled={state.isGenerating}
                    className={cn(
                      'flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors',
                      state.isGenerating
                        ? 'cursor-not-allowed text-muted-foreground'
                        : 'text-primary hover:bg-primary/10'
                    )}
                    data-testid={buildTestId(testId, 'action-generate')}
                  >
                    {state.isGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Generate
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{state.isGenerating ? 'Generating...' : 'Generate images'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Right: Horizontal revision scroll */}
        <div
          className="flex min-w-0 flex-1 items-stretch overflow-x-auto p-2.5"
          data-testid={buildTestId(testId, 'revisions')}
        >
          {state.isGenerating && !state.hasRevisions ? (
            <div className="flex w-full items-center justify-center">
              <div className="flex flex-col items-center gap-1">
                <Loader2 className="h-6 w-6 animate-spin text-warning" />
                <span className="text-xs font-medium text-warning">Generating...</span>
              </div>
            </div>
          ) : state.hasRevisions ? (
            <div className="flex gap-2">
              {revisions.map((rev, idx) => (
                <div
                  key={rev.id}
                  className="group/rev relative flex-shrink-0"
                  data-testid={buildTestId(testId, 'revision', rev.id)}
                >
                  {/* Revision image */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      state.setCurrentRevisionIndex(idx);
                      state.setFullscreenImage(rev.imageUrl);
                    }}
                    className="relative block h-[184px] overflow-hidden rounded-md ring-1 ring-border transition-all hover:ring-primary/50"
                    data-testid={buildTestId(testId, 'revision', rev.id, 'select')}
                  >
                    <Image
                      src={rev.imageUrl}
                      alt={`Rev ${idx + 1}`}
                      width={230}
                      height={184}
                      className="h-full w-auto object-cover"
                      unoptimized
                    />

                    {/* Generating overlay on existing revision */}
                    {state.isGenerating && (
                      <div className="absolute inset-0 bg-black/30" />
                    )}

                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 flex flex-col justify-between opacity-0 transition-opacity group-hover/rev:opacity-100">
                      {/* Top actions */}
                      <div className="flex items-center justify-end gap-1 p-1.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onFavorite?.(rev.id);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                                data-testid={buildTestId(testId, 'revision', rev.id, 'favorite')}
                              >
                                <Heart
                                  className="h-3 w-3"
                                  fill={rev.isFavorite ? 'currentColor' : 'none'}
                                />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{rev.isFavorite ? 'Unfavorite' : 'Favorite'}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  state.handleDownload(rev.imageUrl);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                                data-testid={buildTestId(testId, 'revision', rev.id, 'download')}
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Download</p>
                            </TooltipContent>
                          </Tooltip>

                          {onDeleteRevision && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    state.setDeleteConfirmRevisionId(rev.id);
                                  }}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                                  data-testid={buildTestId(testId, 'revision', rev.id, 'delete')}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Delete</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* More dropdown */}
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                                    data-testid={buildTestId(testId, 'revision', rev.id, 'more')}
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>More</p>
                              </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  state.setCurrentRevisionIndex(idx);
                                  state.setFullscreenImage(rev.imageUrl);
                                }}
                                data-testid={buildTestId(testId, 'revision', rev.id, 'fullscreen')}
                              >
                                <Maximize2 className="mr-2 h-4 w-4" />
                                Fullscreen
                              </DropdownMenuItem>
                              {debugMode && onDebug && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDebug(rev.id);
                                    }}
                                    data-testid={buildTestId(testId, 'revision', rev.id, 'debug')}
                                  >
                                    <Bug className="mr-2 h-4 w-4" />
                                    Debug info
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TooltipProvider>
                      </div>

                      {/* Bottom actions */}
                      <div className="flex items-center justify-end gap-1 p-1.5">
                        <TooltipProvider>
                          {!rev.isVideo && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    state.handleOpenEditor(rev.id);
                                  }}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                                  data-testid={buildTestId(testId, 'revision', rev.id, 'edit')}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" collisionPadding={8}>
                                <p>Edit image</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onSync?.();
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                                data-testid={buildTestId(testId, 'revision', rev.id, 'sync')}
                              >
                                <Upload className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="center" collisionPadding={8}>
                              <p>Upload to store</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                  </button>
                </div>
              ))}
            </div>
          ) : status === 'pending' ? (
            <div className="flex w-full items-center justify-center">
              <div className="flex flex-col items-center gap-1">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Queued</span>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center">
              <span className="text-xs text-muted-foreground">No revisions</span>
            </div>
          )}
        </div>
      </Card>

      {/* Dialogs (portaled) */}
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
