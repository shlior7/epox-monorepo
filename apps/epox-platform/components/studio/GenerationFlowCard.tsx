'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Clock,
  Check,
  X,
  Loader2,
  Pin,
  Settings2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { AssetStatus, ApprovalStatus } from '@/lib/types';
import type { ImageAspectRatio } from 'visualizer-types';

interface Revision {
  id: string;
  imageUrl: string;
  timestamp: Date;
  prompt?: string;
  type: 'original' | 'generated' | 'edited';
  isVideo?: boolean;
  aspectRatio?: ImageAspectRatio;
}

interface BaseImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface GenerationFlowCardProps {
  flowId: string;
  collectionId: string;
  product: {
    id: string;
    name: string;
    sku?: string;
    category?: string;
  };
  baseImages: BaseImage[];
  selectedBaseImageId: string;
  revisions: Revision[];
  status: AssetStatus;
  approvalStatus: ApprovalStatus;
  isPinned: boolean;
  sceneType?: string;
  onChangeBaseImage?: (baseImageId: string) => void;
  onPin?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDeleteRevision?: (revisionId: string) => void;
  onClick?: () => void;
  className?: string;
}

const statusConfig: Record<
  AssetStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: { label: 'Queued', icon: Clock, className: 'text-muted-foreground' },
  generating: { label: 'Generating', icon: Loader2, className: 'text-warning animate-spin' },
  completed: { label: 'Completed', icon: Check, className: 'text-success' },
  error: { label: 'Error', icon: X, className: 'text-destructive' },
};

const approvalConfig: Record<
  ApprovalStatus,
  { label: string; variant: 'default' | 'success' | 'destructive' | 'muted' }
> = {
  pending: { label: 'Pending', variant: 'muted' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

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
  onChangeBaseImage,
  onPin,
  onApprove,
  onReject,
  onDeleteRevision,
  onClick,
  className,
}: GenerationFlowCardProps) {
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState(0);
  const [showBaseImageSelector, setShowBaseImageSelector] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const StatusIcon = statusConfig[status].icon;
  const isCompleted = status === 'completed';
  const selectedBaseImage =
    baseImages.find((img) => img.id === selectedBaseImageId) || baseImages[0];
  const currentRevision = revisions[currentRevisionIndex];

  const canNavigatePrev = currentRevisionIndex > 0;
  const canNavigateNext = currentRevisionIndex < revisions.length - 1;

  const isGenerating = status === 'generating';
  const hasRevisions = revisions.length > 0;

  const cardContent = (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50',
        isGenerating && 'animate-pulse ring-2 ring-warning/50',
        className
      )}
      onClick={onClick}
    >
      {/* Product Info Header */}
      <div className="border-b border-border bg-card/50 p-3">
        <div className="flex items-center gap-3">
          {/* Base Image Thumbnail with selector */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowBaseImageSelector(!showBaseImageSelector);
              }}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-secondary ring-2 ring-border transition-all hover:ring-primary"
            >
              {selectedBaseImage?.url ? (
                <Image
                  src={selectedBaseImage.url}
                  alt="Base"
                  width={40}
                  height={40}
                  className="h-full w-full rounded object-cover"
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
              {baseImages.length > 1 && selectedBaseImage?.url && (
                <div className="absolute inset-0 flex items-center justify-center rounded bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                  <ImageIcon className="h-4 w-4 text-white" />
                </div>
              )}
            </button>

            {/* Base Image Selector Dropdown */}
            {showBaseImageSelector && baseImages.length > 1 && (
              <div
                className="absolute left-0 top-full z-50 mt-1 min-w-[120px] rounded-lg border border-border bg-popover p-2 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-2 px-1 text-xs text-muted-foreground">Select base image</p>
                <div className="flex gap-1">
                  {baseImages.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onChangeBaseImage?.(img.id);
                        setShowBaseImageSelector(false);
                      }}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center overflow-hidden rounded ring-2 transition-all',
                        img.id === selectedBaseImageId
                          ? 'ring-primary'
                          : 'ring-transparent hover:ring-primary/50'
                      )}
                    >
                      <Image
                        src={img.url}
                        alt="Base"
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Name */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isPinned && <Pin className="h-4 w-4 text-primary" />}
            <Badge variant={approvalConfig[approvalStatus].variant} className="text-[10px]">
              {approvalConfig[approvalStatus].label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={onApprove}>
                  <Check className="mr-2 h-4 w-4 text-success" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onReject}>
                  <X className="mr-2 h-4 w-4 text-destructive" />
                  Reject
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPin}>
                  <Pin className="mr-2 h-4 w-4" />
                  {isPinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Preview / Status */}
      {isGenerating && !hasRevisions ? (
        // Status placeholder when generating with no revisions yet
        <div className="flex aspect-video flex-col items-center justify-center bg-warning/10">
          <StatusIcon className={cn('mb-2 h-8 w-8', statusConfig[status].className)} />
          <span className="text-sm font-medium text-warning">{statusConfig[status].label}</span>
          <div className="mt-2 flex items-center gap-1">
            <div
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      ) : currentRevision ? (
        // Current revision preview (show even when generating if we have revisions)
        <div className="relative aspect-video bg-black/20">
          <Image
            src={currentRevision.imageUrl}
            alt="Generated"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
          {/* Generating overlay - show on top of image when generating */}
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="flex flex-col items-center">
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-warning" />
                <span className="text-sm font-medium text-white">Generating...</span>
              </div>
            </div>
          )}
          {/* Navigation overlay */}
          {revisions.length > 1 && !isGenerating && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (canNavigatePrev) setCurrentRevisionIndex((i) => i - 1);
                }}
                className={cn(
                  'absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-opacity',
                  canNavigatePrev ? 'opacity-0 hover:bg-black/70 group-hover:opacity-100' : 'hidden'
                )}
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (canNavigateNext) setCurrentRevisionIndex((i) => i + 1);
                }}
                className={cn(
                  'absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition-opacity',
                  canNavigateNext ? 'opacity-0 hover:bg-black/70 group-hover:opacity-100' : 'hidden'
                )}
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            </>
          )}
          {/* Fullscreen button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFullscreenImage(currentRevision.imageUrl);
            }}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
          >
            <Maximize2 className="h-4 w-4 text-white" />
          </button>
          {/* Revision counter */}
          {revisions.length > 1 && (
            <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              {currentRevisionIndex + 1}/{revisions.length}
            </div>
          )}
        </div>
      ) : status === 'pending' ? (
        <div className="flex aspect-video flex-col items-center justify-center bg-secondary">
          <Clock className="mb-2 h-8 w-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Queued</span>
        </div>
      ) : status === 'error' ? (
        <div className="flex aspect-video flex-col items-center justify-center bg-destructive/10">
          <X className="mb-2 h-8 w-8 text-destructive" />
          <span className="text-sm text-destructive">Error</span>
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-secondary">
          <span className="text-sm text-muted-foreground">No revisions</span>
        </div>
      )}

      {/* Horizontal Revision Gallery - show whenever there are revisions */}
      {hasRevisions && (
        <div className="border-t border-border bg-card/30 p-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {revisions.map((rev, idx) => (
              <div key={rev.id} className="group/revision relative flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentRevisionIndex(idx);
                  }}
                  className={cn(
                    'h-12 w-12 overflow-hidden rounded ring-2 transition-all',
                    idx === currentRevisionIndex
                      ? 'ring-primary'
                      : 'ring-transparent hover:ring-primary/50'
                  )}
                >
                  <Image
                    src={rev.imageUrl}
                    alt={`Rev ${idx + 1}`}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </button>
                {/* Delete button - appears on hover */}
                {onDeleteRevision && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteRevision(rev.id);
                      // Adjust current index if needed
                      if (idx <= currentRevisionIndex && currentRevisionIndex > 0) {
                        setCurrentRevisionIndex((i) => i - 1);
                      }
                    }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover/revision:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );

  // Fullscreen image dialog
  const fullscreenDialog = (
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
            {/* Navigation in fullscreen */}
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
            {/* Counter */}
            {revisions.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                {currentRevisionIndex + 1} / {revisions.length}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // If onClick is provided, use it directly; otherwise wrap in Link
  if (onClick) {
    return (
      <>
        {cardContent}
        {fullscreenDialog}
      </>
    );
  }

  return (
    <>
      <Link href={`/studio/collections/${collectionId}/flow/${flowId}`}>{cardContent}</Link>
      {fullscreenDialog}
    </>
  );
}
