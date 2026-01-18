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
import { cn } from '@/lib/utils';
import type { AssetStatus, ApprovalStatus } from '@/lib/types';

interface Revision {
  id: string;
  imageUrl: string;
  timestamp: Date;
  prompt?: string;
  type: 'original' | 'generated' | 'edited';
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

  const StatusIcon = statusConfig[status].icon;
  const isCompleted = status === 'completed';
  const selectedBaseImage =
    baseImages.find((img) => img.id === selectedBaseImageId) || baseImages[0];
  const currentRevision = revisions[currentRevisionIndex];

  const canNavigatePrev = currentRevisionIndex > 0;
  const canNavigateNext = currentRevisionIndex < revisions.length - 1;

  const isGenerating = status === 'generating';

  const cardContent = (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50',
        isGenerating && 'ring-2 ring-warning/50 animate-pulse',
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
                        <Image src={img.url} alt="Base" width={40} height={40} className="h-full w-full object-cover" unoptimized />
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
        {!isCompleted ? (
          // Status placeholder when not completed
          <div className={cn(
            'flex aspect-video flex-col items-center justify-center',
            isGenerating ? 'bg-warning/10' : 'bg-secondary'
          )}>
            <StatusIcon className={cn('mb-2 h-8 w-8', statusConfig[status].className)} />
            <span className={cn(
              'text-sm',
              isGenerating ? 'text-warning font-medium' : 'text-muted-foreground'
            )}>
              {statusConfig[status].label}
            </span>
            {isGenerating && (
              <div className="mt-2 flex items-center gap-1">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning" style={{ animationDelay: '0ms' }} />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning" style={{ animationDelay: '150ms' }} />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-warning" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        ) : currentRevision ? (
          // Current revision preview
          <div className="relative aspect-video bg-black/20">
            <Image src={currentRevision.imageUrl} alt="Generated" fill className="object-cover" unoptimized />
            {/* Navigation overlay */}
            {revisions.length > 1 && (
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
                    canNavigatePrev
                      ? 'opacity-0 hover:bg-black/70 group-hover:opacity-100'
                      : 'hidden'
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
                    canNavigateNext
                      ? 'opacity-0 hover:bg-black/70 group-hover:opacity-100'
                      : 'hidden'
                  )}
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              </>
            )}
            {/* Revision counter */}
            {revisions.length > 1 && (
              <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                {currentRevisionIndex + 1}/{revisions.length}
              </div>
            )}
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-secondary">
            <span className="text-sm text-muted-foreground">No revisions</span>
          </div>
        )}

        {/* Horizontal Revision Gallery */}
        {isCompleted && revisions.length > 0 && (
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

  // If onClick is provided, use it directly; otherwise wrap in Link
  if (onClick) {
    return cardContent;
  }

  return (
    <Link href={`/studio/collections/${collectionId}/flow/${flowId}`}>
      {cardContent}
    </Link>
  );
}
