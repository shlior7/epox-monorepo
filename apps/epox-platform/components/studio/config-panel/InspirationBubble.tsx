'use client';

import Image from 'next/image';
import { X, ImageIcon, Palette, Sun, Sparkles, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import type { InspirationBubbleType, InspirationBubbleValue } from 'visualizer-types';

// ===== BUBBLE TYPE CONFIG =====

interface BubbleTypeConfig {
  icon: React.ElementType;
  label: string;
  emptyLabel: string;
  bgColor: string;
  borderColor: string;
}

const BUBBLE_TYPE_CONFIG: Record<InspirationBubbleType, BubbleTypeConfig> = {
  inspiration: {
    icon: ImageIcon,
    label: 'Inspiration',
    emptyLabel: 'Add image',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  style: {
    icon: Sparkles,
    label: 'Style',
    emptyLabel: 'Choose style',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  'color-palette': {
    icon: Palette,
    label: 'Colors',
    emptyLabel: 'Pick colors',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
  },
  lighting: {
    icon: Sun,
    label: 'Lighting',
    emptyLabel: 'Set lighting',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  custom: {
    icon: MoreHorizontal,
    label: 'Custom',
    emptyLabel: 'Add custom',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
};

// ===== PROPS =====

export interface InspirationBubbleProps {
  value: InspirationBubbleValue;
  sceneType: string;
  index: number;
  onClick?: () => void;
  onRemove?: () => void;
  isActive?: boolean;
  className?: string;
}

// ===== COMPONENT =====

export function InspirationBubble({
  value,
  sceneType,
  index,
  onClick,
  onRemove,
  isActive = false,
  className,
}: InspirationBubbleProps) {
  const config = BUBBLE_TYPE_CONFIG[value.type];
  const Icon = config.icon;
  const hasContent = !!(value.image || value.colorPalette?.length || value.preset);

  return (
    <div
      className={cn('group relative', className)}
      data-testid={buildTestId('inspiration-bubble', sceneType, index)}
    >
      <button
        onClick={onClick}
        className={cn(
          'flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 transition-all',
          hasContent
            ? cn(config.bgColor, config.borderColor)
            : 'border-dashed border-border hover:border-primary hover:bg-primary/5',
          isActive && 'ring-2 ring-primary ring-offset-2'
        )}
        data-testid={buildTestId('inspiration-bubble', 'button', sceneType, index)}
      >
        {hasContent ? (
          // Filled state
          value.image ? (
            <div className="relative h-full w-full overflow-hidden rounded-md">
              <Image
                src={value.image.thumbnailUrl || value.image.url}
                alt={config.label}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
          ) : value.colorPalette && value.colorPalette.length > 0 ? (
            <div className="flex h-full w-full flex-wrap gap-0.5 rounded-md p-1">
              {value.colorPalette.slice(0, 4).map((color, i) => (
                <div
                  key={i}
                  className="h-1/2 flex-1 rounded-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {value.preset || config.label}
              </span>
            </div>
          )
        ) : (
          // Empty state
          <div className="flex flex-col items-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="mt-0.5 text-center text-[9px] leading-tight text-muted-foreground">
              {config.emptyLabel}
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
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
          data-testid={buildTestId('inspiration-bubble', 'remove', sceneType, index)}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}

      {/* Type label */}
      <div className="mt-1 text-center">
        <span className="text-[10px] text-muted-foreground">{config.label}</span>
      </div>
    </div>
  );
}

// ===== EMPTY BUBBLE (for adding new) =====

export interface EmptyBubbleSlotProps {
  type: InspirationBubbleType;
  onClick?: () => void;
  className?: string;
}

export function EmptyBubbleSlot({ type, onClick, className }: EmptyBubbleSlotProps) {
  const config = BUBBLE_TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className={cn('group', className)} data-testid={buildTestId('empty-bubble-slot', type)}>
      <button
        onClick={onClick}
        className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary hover:bg-primary/5"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="mt-0.5 text-center text-[9px] leading-tight text-muted-foreground">
          {config.emptyLabel}
        </span>
      </button>
      <div className="mt-1 text-center">
        <span className="text-[10px] text-muted-foreground">{config.label}</span>
      </div>
    </div>
  );
}
