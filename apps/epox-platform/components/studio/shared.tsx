'use client';

import { forwardRef } from 'react';
import Image from 'next/image';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Package,
  Pin,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { InspirationImage } from 'visualizer-types';

// ============================================================================
// Types
// ============================================================================

export interface AssetConfiguration {
  sceneType?: string;
  stylePreset?: string;
  lightingPreset?: string;
  aspectRatio?: string;
  quality?: string;
  prompt?: string;
}

export interface AssetActionHandlers {
  onPin?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

// ============================================================================
// Image Thumbnails
// ============================================================================

interface ImageThumbnailProps {
  src: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  fallback?: React.ReactNode;
}

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

export function ImageThumbnail({
  src,
  alt,
  size = 'sm',
  className,
  fallback,
}: ImageThumbnailProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-md border border-border bg-background',
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" unoptimized />
      ) : (
        fallback || (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-1/2 w-1/2 text-muted-foreground" />
          </div>
        )
      )}
    </div>
  );
}

// ============================================================================
// Inspiration Images Stack
// ============================================================================

interface InspirationStackProps {
  images: InspirationImage[];
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md';
}

export function InspirationStack({
  images,
  maxVisible = 3,
  size = 'sm',
}: InspirationStackProps) {
  if (images.length === 0) return null;

  const visibleImages = images.slice(0, maxVisible);
  const remaining = images.length - maxVisible;
  const stackSizes = { xs: 'h-5 w-5', sm: 'h-7 w-7', md: 'h-9 w-9' };

  return (
    <div className="flex -space-x-2">
      {visibleImages.map((img, idx) => (
        <TooltipProvider key={idx}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'relative shrink-0 overflow-hidden rounded-md border-2 border-background bg-background ring-1 ring-border',
                  stackSizes[size]
                )}
              >
                <Image
                  src={img.url}
                  alt={img.tags?.[0] || `Inspiration ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">{img.tags?.[0] || `Inspiration ${idx + 1}`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-md border-2 border-background bg-muted text-[10px] font-medium ring-1 ring-border',
            stackSizes[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Config Badges
// ============================================================================

interface ConfigBadgesProps {
  configuration?: AssetConfiguration;
  maxVisible?: number;
}

export function ConfigBadges({ configuration, maxVisible = 2 }: ConfigBadgesProps) {
  if (!configuration) return null;

  const badges = [
    configuration.sceneType,
    configuration.stylePreset,
    configuration.quality ? configuration.quality.toUpperCase() : null,
  ].filter(Boolean) as string[];

  if (badges.length === 0) return null;

  const visibleBadges = badges.slice(0, maxVisible);
  const remaining = badges.length - maxVisible;

  return (
    <div className="flex items-center gap-1.5">
      {visibleBadges.map((badge, idx) => (
        <Badge key={idx} variant="outline" className="text-[10px] font-normal">
          {badge}
        </Badge>
      ))}
      {remaining > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-[10px] font-normal">
                +{remaining}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="space-y-1 text-xs">
                {configuration.stylePreset && <p>Style: {configuration.stylePreset}</p>}
                {configuration.lightingPreset && (
                  <p>Lighting: {configuration.lightingPreset}</p>
                )}
                {configuration.aspectRatio && <p>Aspect: {configuration.aspectRatio}</p>}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ============================================================================
// Status Badges
// ============================================================================

interface StatusBadgesProps {
  isPinned?: boolean;
  isApproved?: boolean;
  isRejected?: boolean;
}

export function StatusBadges({ isPinned, isApproved, isRejected }: StatusBadgesProps) {
  return (
    <div className="flex items-center gap-2">
      {isPinned && <Pin className="h-4 w-4 text-primary" />}
      {isApproved && (
        <Badge variant="success" className="text-[10px]">
          Approved
        </Badge>
      )}
      {isRejected && (
        <Badge variant="destructive" className="text-[10px]">
          Rejected
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Asset Action Bar
// ============================================================================

interface AssetActionBarProps extends AssetActionHandlers {
  isPinned?: boolean;
  isApproved?: boolean;
  showLabels?: boolean;
  additionalActions?: React.ReactNode;
  className?: string;
}

export function AssetActionBar({
  isPinned = false,
  isApproved = false,
  showLabels = true,
  onPin,
  onApprove,
  onReject,
  onDownload,
  onDelete,
  additionalActions,
  className,
}: AssetActionBarProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 gap-1.5', isPinned && 'text-primary')}
          onClick={onPin}
        >
          <Pin className="h-3.5 w-3.5" />
          {showLabels && (
            <span className="text-xs">{isPinned ? 'Pinned' : 'Pin'}</span>
          )}
        </Button>

        <Button
          variant={isApproved ? 'default' : 'ghost'}
          size="sm"
          className={cn('h-8 gap-1.5', isApproved && 'bg-green-600 hover:bg-green-700')}
          onClick={onApprove}
        >
          <Check className="h-3.5 w-3.5" />
          {showLabels && (
            <span className="text-xs">{isApproved ? 'Approved' : 'Approve'}</span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onDownload}
        >
          <Download className="h-3.5 w-3.5" />
          {showLabels && <span className="text-xs">Download</span>}
        </Button>
      </div>

      <div className="flex items-center gap-1">
        {additionalActions}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isApproved && onReject && (
              <DropdownMenuItem onClick={onReject}>
                <X className="mr-2 h-4 w-4 text-destructive" />
                Reject
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================================================
// Gallery Navigation Overlay
// ============================================================================

interface GalleryNavigationProps {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  totalCount: number;
  showOnHover?: boolean;
}

export function GalleryNavigation({
  canPrev,
  canNext,
  onPrev,
  onNext,
  currentIndex,
  totalCount,
  showOnHover = true,
}: GalleryNavigationProps) {
  if (totalCount <= 1) return null;

  const hoverClass = showOnHover ? 'opacity-0 group-hover:opacity-100' : '';

  return (
    <>
      {/* Previous Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        disabled={!canPrev}
        className={cn(
          'absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70',
          hoverClass,
          !canPrev && 'hidden'
        )}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {/* Next Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        disabled={!canNext}
        className={cn(
          'absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70',
          hoverClass,
          !canNext && 'hidden'
        )}
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Counter Badge */}
      <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
        {currentIndex + 1} / {totalCount}
      </div>
    </>
  );
}

// ============================================================================
// Video Player Overlay
// ============================================================================

interface VideoOverlayProps {
  isPlaying: boolean;
  onPlay: () => void;
  duration?: string;
}

export function VideoOverlay({ isPlaying, onPlay, duration = '5s' }: VideoOverlayProps) {
  if (isPlaying) return null;

  return (
    <>
      {/* Play Button */}
      <button
        onClick={onPlay}
        className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
          <Play className="ml-1 h-8 w-8 text-foreground" />
        </div>
      </button>

      {/* Duration Badge */}
      <div className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
        {duration}
      </div>
    </>
  );
}

// ============================================================================
// Mini Thumbnail Strip
// ============================================================================

interface ThumbnailStripProps {
  thumbnails: Array<{ id: string; url: string }>;
  currentIndex: number;
  onSelect: (index: number) => void;
  maxVisible?: number;
}

export function ThumbnailStrip({
  thumbnails,
  currentIndex,
  onSelect,
  maxVisible = 5,
}: ThumbnailStripProps) {
  if (thumbnails.length <= 1) return null;

  const visibleThumbnails = thumbnails.slice(0, maxVisible);
  const remaining = thumbnails.length - maxVisible;

  return (
    <div className="flex gap-1">
      {visibleThumbnails.map((thumb, idx) => (
        <button
          key={thumb.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(idx);
          }}
          className={cn(
            'relative h-6 w-6 overflow-hidden rounded border transition-all',
            idx === currentIndex
              ? 'border-primary ring-1 ring-primary/50'
              : 'border-border hover:border-primary/50'
          )}
        >
          <Image
            src={thumb.url}
            alt={`Thumbnail ${idx + 1}`}
            fill
            className="object-cover"
            unoptimized
          />
        </button>
      ))}
      {remaining > 0 && (
        <div className="flex h-6 w-6 items-center justify-center rounded border border-border bg-muted text-[9px] font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Card Wrapper
// ============================================================================

interface AssetCardWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const AssetCardWrapper = forwardRef<HTMLDivElement, AssetCardWrapperProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={cn(
        'group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  )
);
AssetCardWrapper.displayName = 'AssetCardWrapper';

// ============================================================================
// Card Header
// ============================================================================

interface AssetCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function AssetCardHeader({ children, className }: AssetCardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Card Content
// ============================================================================

interface AssetCardContentProps {
  children: React.ReactNode;
  aspectRatio?: 'square' | '4/3' | '16/9' | '3/4';
  className?: string;
}

export function AssetCardContent({
  children,
  aspectRatio = 'square',
  className,
}: AssetCardContentProps) {
  const aspectClasses = {
    square: 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '3/4': 'aspect-[3/4]',
  };

  return (
    <div className={cn('relative bg-black/5', aspectClasses[aspectRatio], className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Card Footer
// ============================================================================

interface AssetCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function AssetCardFooter({ children, className }: AssetCardFooterProps) {
  return (
    <div className={cn('border-t border-border bg-card px-2 py-2', className)}>
      {children}
    </div>
  );
}
