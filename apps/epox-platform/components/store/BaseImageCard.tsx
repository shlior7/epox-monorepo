'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Heart,
  ImageIcon,
  MoreVertical,
  Edit3,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImageEditorModal } from '@/components/studio/modals/ImageEditorModal';
import type { ProductImage } from 'visualizer-types';

// Extended type with URL from API transformation
interface BaseImageWithUrl extends ProductImage {
  url?: string;
  isFavorite?: boolean;
}

interface BaseImageCardProps {
  image: BaseImageWithUrl;
  isFromStore?: boolean;
  onImageEdited?: () => void;
  onToggleFavorite?: () => void;
  testId?: string;
}

export function BaseImageCard({
  image,
  isFromStore = false,
  onImageEdited,
  onToggleFavorite,
  testId,
}: BaseImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  // Use the pre-computed URL from the API, or fallback to constructing it
  const imageUrl = image.url || '';

  const handleImageSave = () => {
    onImageEdited?.();
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  return (
    <>
      <div
        className={cn(
          'group relative rounded-lg border bg-card overflow-hidden transition-all',
          isHovered && 'shadow-md'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={testId}
      >
        {/* Top Right Actions */}
        <div
          className={cn(
            'absolute top-2 right-2 z-10 flex flex-col items-end gap-1.5 transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-background/80 backdrop-blur hover:bg-background"
                data-testid={`${testId}-more-btn`}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                No actions available
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Favorite Button */}
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-background/80 backdrop-blur hover:bg-background"
              onClick={onToggleFavorite}
              data-testid={`${testId}-favorite-btn`}
            >
              <Heart
                className={cn(
                  'h-3.5 w-3.5',
                  image.isFavorite && 'fill-red-500 text-red-500'
                )}
              />
            </Button>
          )}

          {/* Download Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/80 backdrop-blur hover:bg-background"
            onClick={handleDownload}
            disabled={!imageUrl}
            data-testid={`${testId}-download-btn`}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Image */}
        <div className="relative aspect-square bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="Product image"
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {/* Edit Button - Bottom Right */}
          <div
            className={cn(
              'absolute bottom-2 right-2 z-10 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-background/80 backdrop-blur hover:bg-background"
              onClick={() => setEditorOpen(true)}
              disabled={!imageUrl}
              data-testid={`${testId}-edit-btn`}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Image Editor Modal */}
      {imageUrl && (
        <ImageEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          imageUrl={imageUrl}
          imageType="base"
          imageId={image.id}
          productId={image.productId}
          onSave={handleImageSave}
          isSyncedWithStore={isFromStore}
        />
      )}
    </>
  );
}
