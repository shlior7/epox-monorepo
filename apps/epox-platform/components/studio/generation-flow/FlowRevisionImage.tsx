'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Pencil,
  Upload,
  X,
} from 'lucide-react';
import Image from 'next/image';
import type { Revision } from './types';
import { statusConfig } from './types';
import type { AssetStatus } from '@/lib/types';

interface FlowRevisionImageProps {
  testId?: string;
  currentRevision?: Revision;
  revisions: Revision[];
  currentRevisionIndex: number;
  status: AssetStatus;
  isGenerating: boolean;
  hasRevisions: boolean;
  showNavArrows?: boolean;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  aspectClassName?: string;
  onPrev: () => void;
  onNext: () => void;
  onClick: () => void;
  onEdit: (revisionId: string) => void;
  onSync?: () => void;
}

export function FlowRevisionImage({
  testId,
  currentRevision,
  revisions,
  currentRevisionIndex,
  status,
  isGenerating,
  hasRevisions,
  showNavArrows = true,
  canNavigatePrev,
  canNavigateNext,
  aspectClassName = 'aspect-video',
  onPrev,
  onNext,
  onClick,
  onEdit,
  onSync,
}: FlowRevisionImageProps) {
  if (isGenerating && !hasRevisions) {
    // Status placeholder when generating with no revisions yet
    const StatusIcon = status === 'generating' ? Loader2 : status === 'error' ? X : status === 'completed' ? Check : Clock;
    return (
      <div className={cn('flex flex-col items-center justify-center bg-warning/10', aspectClassName)}>
        <StatusIcon className={cn('mb-2 h-8 w-8', statusConfig[status].className)} />
        <span className="text-sm font-medium text-warning">{statusConfig[status].label}</span>
        <div className="mt-2 flex items-center gap-1">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (currentRevision) {
    return (
      <div
        className={cn('relative bg-black/20', aspectClassName)}
        data-testid={buildTestId(testId, 'preview')}
      >
        <Image
          src={currentRevision.imageUrl}
          alt="Generated"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          unoptimized
        />

        {/* Generating overlay */}
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex flex-col items-center">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-warning" />
              <span className="text-sm font-medium text-white">Generating...</span>
            </div>
          </div>
        )}

        {/* Bottom Left: Revision counter */}
        {revisions.length > 1 && (
          <div
            className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
            data-testid={buildTestId(testId, 'counter')}
          >
            {currentRevisionIndex + 1}/{revisions.length}
          </div>
        )}

        {/* Bottom Right: Edit + Upload */}
        {!isGenerating && (
          <div
            className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            data-testid={buildTestId(testId, 'hover-actions-bottom')}
          >
            <TooltipProvider>
              {/* Edit */}
              {!currentRevision.isVideo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit(currentRevision.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                      data-testid={buildTestId(testId, 'action-edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" collisionPadding={8}>
                    <p>Edit image</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Upload to store */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSync?.();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    data-testid={buildTestId(testId, 'action-sync')}
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center" collisionPadding={8}>
                  <p>Upload to store</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Navigation arrows */}
        {showNavArrows && revisions.length > 1 && !isGenerating && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPrev();
              }}
              className={cn(
                'absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-opacity',
                canNavigatePrev
                  ? 'opacity-0 hover:bg-black/70 group-hover:opacity-100'
                  : 'hidden'
              )}
              data-testid={buildTestId(testId, 'nav', 'prev')}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNext();
              }}
              className={cn(
                'absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-opacity',
                canNavigateNext
                  ? 'opacity-0 hover:bg-black/70 group-hover:opacity-100'
                  : 'hidden'
              )}
              data-testid={buildTestId(testId, 'nav', 'next')}
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </>
        )}
      </div>
    );
  }

  // Empty states
  if (status === 'pending') {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-secondary', aspectClassName)}>
        <Clock className="mb-2 h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Queued</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-destructive/10', aspectClassName)}>
        <X className="mb-2 h-8 w-8 text-destructive" />
        <span className="text-sm text-destructive">Error</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center bg-secondary', aspectClassName)}>
      <span className="text-sm text-muted-foreground">No revisions</span>
    </div>
  );
}
