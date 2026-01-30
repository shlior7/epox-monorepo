'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import type { BubbleValue } from 'visualizer-types';
import { getBubbleDefinition } from '../bubbles/registry';

// ===== COLOR MAPPING =====

const BUBBLE_COLORS: Record<string, { bgColor: string; borderColor: string }> = {
  style: {
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  scene: {
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  technical: {
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
};

// ===== PROPS =====

export interface BubbleChipProps {
  value: BubbleValue;
  sceneType: string;
  index: number;
  onClick?: () => void;
  onRemove?: () => void;
  isActive?: boolean;
  compact?: boolean;
  className?: string;
}

// ===== COMPONENT =====

export function BubbleChip({
  value,
  sceneType,
  index,
  onClick,
  onRemove,
  isActive = false,
  compact = false,
  className,
}: BubbleChipProps) {
  const definition = getBubbleDefinition(value.type);

  // Fallback if definition not found (shouldn't happen in normal use)
  if (!definition) {
    console.warn(`Bubble definition not found for type: ${value.type}`);
    return null;
  }

  const Icon = definition.icon;
  const colors = BUBBLE_COLORS[definition.category];

  // Use registry's isEmpty method to check if bubble has content
  const hasContent = !definition.isEmpty(value);

  return (
    <div
      className={cn('group relative', className)}
      data-testid={buildTestId('inspiration-bubble', sceneType, index)}
    >
      <button
        onClick={onClick}
        className={cn(
          'flex w-full flex-col items-center justify-center rounded-lg border-2 transition-all',
          compact ? 'aspect-[4/3]' : 'aspect-square',
          hasContent
            ? cn(colors.bgColor, colors.borderColor, 'hover:opacity-80')
            : 'border-dashed border-border hover:border-primary hover:bg-primary/5',
          isActive && 'ring-2 ring-primary ring-offset-2'
        )}
        data-testid={buildTestId('inspiration-bubble', 'button', sceneType, index)}
      >
        {hasContent ? (
          // Filled state - use registry's renderPreview
          <>{definition.renderPreview(value as any)}</>
        ) : (
          // Empty state
          <div className="flex flex-col items-center">
            <Icon className={cn(compact ? 'h-4 w-4' : 'h-6 w-6', 'text-muted-foreground')} />
            <span className={cn('mt-0.5 text-center leading-tight text-muted-foreground', compact ? 'text-[9px]' : 'text-[10px]')}>
              Click to add
            </span>
          </div>
        )}
      </button>

      {/* Remove button */}
      {hasContent && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
          data-testid={buildTestId('inspiration-bubble', 'remove', sceneType, index)}
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Type label */}
      <div className={cn('text-center', compact ? 'mt-0.5' : 'mt-1')}>
        <span className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-[12px]')}>
          {(value as any).label || definition.label}
        </span>
      </div>
    </div>
  );
}
