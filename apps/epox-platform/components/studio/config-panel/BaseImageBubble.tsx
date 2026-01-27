'use client';

import Image from 'next/image';
import { ImageIcon, Check } from 'lucide-react';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';

// ===== BASE IMAGE INFO =====

export interface BaseImageInfo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  label?: string;
}

// ===== PROPS =====

export interface BaseImageBubbleProps {
  image: BaseImageInfo;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

// ===== COMPONENT =====

export function BaseImageBubble({
  image,
  isSelected = false,
  onClick,
  className,
}: BaseImageBubbleProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative aspect-square h-16 w-16 overflow-hidden rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50',
        className
      )}
      data-testid={buildTestId('base-image-bubble', image.id)}
    >
      <Image
        src={image.thumbnailUrl || image.url}
        alt={image.label || 'Base image'}
        fill
        sizes="64px"
        className="object-cover"
      />
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
          <Check className="h-5 w-5 text-primary" />
        </div>
      )}
    </button>
  );
}

// ===== BASE IMAGE SELECTOR =====

export interface BaseImageSelectorProps {
  images: BaseImageInfo[];
  selectedId?: string;
  onSelect?: (imageId: string) => void;
  className?: string;
}

export function BaseImageSelector({
  images,
  selectedId,
  onSelect,
  className,
}: BaseImageSelectorProps) {
  if (images.length === 0) {
    return (
      <div
        className={cn(
          'flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground',
          className
        )}
        data-testid={buildTestId('base-image-selector', 'empty')}
      >
        <ImageIcon className="mr-2 h-4 w-4" />
        <span className="text-xs">No base images available</span>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      data-testid={buildTestId('base-image-selector')}
    >
      {images.map((image) => (
        <BaseImageBubble
          key={image.id}
          image={image}
          isSelected={selectedId === image.id}
          onClick={() => onSelect?.(image.id)}
        />
      ))}
    </div>
  );
}
