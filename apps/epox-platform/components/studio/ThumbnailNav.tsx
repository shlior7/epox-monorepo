'use client';

import { useCallback, useRef } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThumbnailItem {
  id: string;
  thumbnailUrl: string;
  label?: string;
  isVideo?: boolean;
}

interface ThumbnailNavProps {
  items: ThumbnailItem[];
  onItemClick: (id: string) => void;
  activeId?: string;
  className?: string;
}

export function ThumbnailNav({
  items,
  onItemClick,
  activeId,
  className,
}: ThumbnailNavProps) {
  const navRef = useRef<HTMLDivElement>(null);

  const handleItemClick = useCallback(
    (id: string) => {
      onItemClick(id);
    },
    [onItemClick]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={navRef}
      className={cn(
        'flex w-16 flex-col gap-2 overflow-y-auto py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border',
        className
      )}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => handleItemClick(item.id)}
          className={cn(
            'group relative mx-auto aspect-square w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
            activeId === item.id
              ? 'border-primary ring-2 ring-primary/30'
              : 'border-transparent hover:border-primary/50 hover:ring-2 hover:ring-primary/20'
          )}
          title={item.label || `Item ${index + 1}`}
        >
          <Image
            src={item.thumbnailUrl}
            alt={item.label || `Thumbnail ${index + 1}`}
            fill
            className="object-cover"
            unoptimized
          />

          {/* Video indicator */}
          {item.isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90">
                <Play className="ml-0.5 h-2.5 w-2.5 text-foreground" />
              </div>
            </div>
          )}

          {/* Index indicator */}
          <div className="absolute bottom-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-black/60 px-1 text-[9px] font-medium text-white">
            {index + 1}
          </div>

          {/* Active indicator dot */}
          {activeId === item.id && (
            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-2 w-2 rounded-full bg-primary shadow-lg" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// Variant for product navigation (larger thumbnails with names)
interface ProductThumbnailItem {
  id: string;
  thumbnailUrl?: string;
  name: string;
  generatedCount?: number;
}

interface ProductThumbnailNavProps {
  items: ProductThumbnailItem[];
  onItemClick: (id: string) => void;
  activeId?: string;
  className?: string;
}

export function ProductThumbnailNav({
  items,
  onItemClick,
  activeId,
  className,
}: ProductThumbnailNavProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex w-20 flex-col gap-2 overflow-y-auto py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border',
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onItemClick(item.id)}
          className={cn(
            'group relative mx-auto flex w-16 flex-col items-center gap-1 rounded-lg p-1 transition-all',
            activeId === item.id
              ? 'bg-primary/10'
              : 'hover:bg-muted/50'
          )}
          title={item.name}
        >
          {/* Thumbnail */}
          <div
            className={cn(
              'relative aspect-square w-14 overflow-hidden rounded-md border-2 bg-muted transition-all',
              activeId === item.id
                ? 'border-primary'
                : 'border-transparent group-hover:border-primary/50'
            )}
          >
            {item.thumbnailUrl ? (
              <Image
                src={item.thumbnailUrl}
                alt={item.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <span className="text-lg">📦</span>
              </div>
            )}

            {/* Generated count badge */}
            {item.generatedCount !== undefined && item.generatedCount > 0 && (
              <div className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium text-primary-foreground shadow">
                {item.generatedCount}
              </div>
            )}
          </div>

          {/* Name (truncated) */}
          <span className="w-full truncate text-center text-[10px] text-muted-foreground group-hover:text-foreground">
            {item.name}
          </span>

          {/* Active indicator */}
          {activeId === item.id && (
            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-2 w-2 rounded-full bg-primary shadow-lg" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
