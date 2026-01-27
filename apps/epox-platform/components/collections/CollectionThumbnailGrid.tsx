'use client';

import Image from 'next/image';
import { FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CollectionThumbnailGridProps {
  thumbnails: string[];
  className?: string;
}

export function CollectionThumbnailGrid({ thumbnails, className }: CollectionThumbnailGridProps) {
  // Fallback to icon if no thumbnails
  if (!thumbnails || thumbnails.length === 0) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center', className)}>
        <FolderKanban className="h-10 w-10 text-muted-foreground/50" />
      </div>
    );
  }

  // Limit to 4 images max
  const displayThumbnails = thumbnails.slice(0, 4);
  const count = displayThumbnails.length;

  // Layout based on count
  // 1 image: full width
  // 2 images: 2 columns
  // 3 images: 2 columns, last image spans
  // 4 images: 2x2 grid

  return (
    <div
      className={cn(
        'grid h-full w-full gap-0.5',
        count === 1 && 'grid-cols-1',
        count === 2 && 'grid-cols-2',
        count >= 3 && 'grid-cols-2 grid-rows-2',
        className
      )}
    >
      {displayThumbnails.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className={cn(
            'relative overflow-hidden bg-muted',
            // For 3 images, make the last one span 2 columns
            count === 3 && index === 2 && 'col-span-2'
          )}
        >
          <Image
            src={url}
            alt={`Thumbnail ${index + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
      ))}
    </div>
  );
}
