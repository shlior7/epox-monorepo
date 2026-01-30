'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buildTestId } from '@/lib/testing/testid';
import {
  Bug,
  Download,
  Heart,
  Image as ImageIcon,
  Maximize2,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import type { BaseImage, Revision } from './types';

interface FlowHeaderOverlayProps {
  testId?: string;
  product: {
    id: string;
    name: string;
  };
  sceneType?: string;
  selectedBaseImage?: BaseImage;
  baseImages: BaseImage[];
  currentRevision?: Revision;
  isGenerating: boolean;
  debugMode?: boolean;
  hasRevisions: boolean;
  revisions: Revision[];
  compact?: boolean;
  onBaseImageClick: () => void;
  onFavorite?: (revisionId: string) => void;
  onDownload: (imageUrl: string) => void;
  onDeleteRevision?: (revisionId: string) => void;
  onSetDeleteConfirm: (revisionId: string) => void;
  onOpenStudio?: () => void;
  onFullscreen: (imageUrl: string) => void;
  onDebug?: (revisionId: string) => void;
}

export function FlowHeaderOverlay({
  testId,
  product,
  sceneType,
  selectedBaseImage,
  baseImages,
  currentRevision,
  isGenerating,
  debugMode,
  hasRevisions,
  revisions,
  compact,
  onBaseImageClick,
  onFavorite,
  onDownload,
  onSetDeleteConfirm,
  onOpenStudio,
  onFullscreen,
  onDebug,
}: FlowHeaderOverlayProps) {
  return (
    <div
      className="absolute left-0 right-0 top-0 z-10 flex items-center gap-3 px-3 py-2"
      data-testid={buildTestId(testId, 'header')}
    >
      {/* Base Image Thumbnail */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (baseImages.length > 0) {
                  onBaseImageClick();
                }
              }}
              className={`group/thumb relative flex shrink-0 items-center justify-center overflow-hidden rounded bg-secondary ring-2 ring-white/20 transition-all hover:ring-white/50 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}
              data-testid={buildTestId(testId, 'base-image')}
              disabled={baseImages.length === 0}
            >
              {selectedBaseImage?.url ? (
                <>
                  <Image
                    src={selectedBaseImage.url}
                    alt="Base"
                    width={40}
                    height={40}
                    className="h-full w-full rounded object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded bg-black/60 opacity-0 transition-opacity group-hover/thumb:opacity-100">
                    <RefreshCw className="h-4 w-4 text-white/90" />
                  </div>
                </>
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to change base image</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Product Name */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}
          data-testid={buildTestId(testId, 'name')}
        >
          {product.name}
        </p>
        {sceneType && <p className="truncate text-xs text-white/60">{sceneType}</p>}
      </div>

      {/* Header Right Actions */}
      <div
        className="flex items-center gap-1"
        data-testid={buildTestId(testId, 'header-actions')}
      >
        {/* Debug button */}
        {debugMode && hasRevisions && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const revisionId = currentRevision?.id || revisions[0]?.id;
              if (revisionId && onDebug) {
                onDebug(revisionId);
              }
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
            title="Debug info"
            data-testid={buildTestId(testId, 'debug-button')}
          >
            <Bug className="h-3.5 w-3.5" />
          </button>
        )}
        {/* Hover action buttons — visible on card hover */}
        {!isGenerating && (
          <TooltipProvider>
            <div
              className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
              data-testid={buildTestId(testId, 'hover-actions-top')}
            >
              {/* Favorite */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentRevision) onFavorite?.(currentRevision.id);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    data-testid={buildTestId(testId, 'action-favorite')}
                  >
                    <Heart
                      className="h-3.5 w-3.5"
                      fill={currentRevision?.isFavorite ? 'currentColor' : 'none'}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{currentRevision?.isFavorite ? 'Unfavorite' : 'Favorite'}</p>
                </TooltipContent>
              </Tooltip>

              {/* Download */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (currentRevision) onDownload(currentRevision.imageUrl);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    data-testid={buildTestId(testId, 'action-download')}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Download</p>
                </TooltipContent>
              </Tooltip>

              {/* Delete revision */}
              {currentRevision && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetDeleteConfirm(currentRevision.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                      data-testid={buildTestId(testId, 'action-delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Delete revision</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* More Options */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                        data-testid={buildTestId(testId, 'action-more')}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>More options</p>
                  </TooltipContent>
                </Tooltip>
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
                      if (currentRevision) onFullscreen(currentRevision.imageUrl);
                    }}
                    data-testid={buildTestId(testId, 'action-fullscreen')}
                  >
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Fullscreen
                  </DropdownMenuItem>
                  {debugMode && currentRevision && onDebug && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDebug(currentRevision.id);
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
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
