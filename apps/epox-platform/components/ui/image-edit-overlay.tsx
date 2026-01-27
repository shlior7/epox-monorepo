'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ImageEditOverlayProps {
  children: React.ReactNode;
  onEdit: () => void;
  className?: string;
  iconSize?: 'sm' | 'md';
  position?: 'top-right' | 'bottom-right';
  testId?: string;
}

/**
 * A wrapper component that adds an edit icon overlay to images.
 * The edit icon appears on hover (default: top-right corner).
 */
export function ImageEditOverlay({
  children,
  onEdit,
  className,
  iconSize = 'md',
  position = 'top-right',
  testId,
}: ImageEditOverlayProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onEdit();
  };

  const iconSizeClass = iconSize === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const buttonSizeClass = iconSize === 'sm' ? 'h-5 w-5' : 'h-6 w-6';

  const positionClass = position === 'bottom-right' ? 'bottom-1 right-1' : 'right-1 top-1';

  return (
    <TooltipProvider>
      <div className={cn('group relative', className)} data-testid={testId}>
        {children}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleClick}
              className={cn(
                'absolute z-10 flex items-center justify-center rounded-md',
                'bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80',
                'group-hover:opacity-100 focus:opacity-100',
                positionClass,
                buttonSizeClass
              )}
              data-testid={testId ? `${testId}-edit-button` : 'image-edit-button'}
            >
              <Pencil className={iconSizeClass} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Edit image</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
