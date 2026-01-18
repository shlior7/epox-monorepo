'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Star, Pin, Download, RefreshCw, Trash2, Maximize2, Check } from 'lucide-react';

interface ImageCardProps {
  image: {
    id: string;
    url: string;
    productName?: string;
    sceneType?: string;
    rating?: number;
    isPinned?: boolean;
  };
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onView?: () => void;
  onStar?: (rating: number) => void;
  onPin?: (pinned: boolean) => void;
  onDownload?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function ImageCard({
  image,
  selectable = false,
  selected = false,
  onSelect,
  onView,
  onStar,
  onPin,
  onDownload,
  onRegenerate,
  onDelete,
  className,
}: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleStarClick = () => {
    const newRating = (image.rating || 0) >= 5 ? 0 : (image.rating || 0) + 1;
    onStar?.(newRating);
  };

  return (
    <Card
      className={cn(
        'group relative cursor-pointer overflow-hidden',
        selected && 'ring-2 ring-primary',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-square">
        <img
          src={image.url}
          alt={image.productName || 'Generated image'}
          className="h-full w-full object-cover"
          onClick={onView}
        />

        {/* Hover overlay */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Selection checkbox */}
        {selectable && (
          <div className="absolute left-2 top-2 z-10">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelect?.(checked as boolean)}
              className={cn(
                'bg-background/80 backdrop-blur-sm',
                !isHovered && !selected && 'opacity-0'
              )}
            />
          </div>
        )}

        {/* Pin indicator */}
        {image.isPinned && (
          <div className="absolute right-2 top-2 z-10">
            <div className="rounded-full bg-primary p-1.5 text-primary-foreground">
              <Pin className="h-3 w-3" />
            </div>
          </div>
        )}

        {/* Hover actions */}
        <div
          className={cn(
            'absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleStarClick();
              }}
              title={`Rating: ${image.rating || 0}/5`}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  (image.rating || 0) > 0 && 'fill-yellow-400 text-yellow-400'
                )}
              />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onPin?.(!image.isPinned);
              }}
            >
              <Pin className={cn('h-4 w-4', image.isPinned && 'fill-primary text-primary')} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.();
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onView?.();
              }}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Product info */}
      {(image.productName || image.sceneType) && (
        <div className="border-t border-border p-3">
          {image.productName && <p className="truncate text-sm font-medium">{image.productName}</p>}
          {image.sceneType && <p className="text-xs text-muted-foreground">{image.sceneType}</p>}
        </div>
      )}
    </Card>
  );
}
