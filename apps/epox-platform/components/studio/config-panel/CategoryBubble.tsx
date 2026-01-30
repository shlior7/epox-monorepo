'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { getBubbleDefinition } from '../bubbles/registry';
import type { BubbleValue, InspirationSection } from 'visualizer-types';

// ===== PROPS =====

export interface CategoryBubbleProps {
  section: InspirationSection;
  categoryName: string;
  previewImageUrl?: string;
  bubbleCount: number;
  onClick: () => void;
  onRemove: () => void;
  className?: string;
}

// ===== HELPERS =====

/** Extract a human-readable label from any bubble value */
function getBubbleLabel(bubble: BubbleValue): string {
  switch (bubble.type) {
    case 'style':
    case 'lighting':
      return bubble.preset || bubble.customValue || '';
    case 'camera-angle':
    case 'mood':
      return bubble.preset || '';
    case 'custom':
      return bubble.value || bubble.label || '';
    case 'color-palette':
      return bubble.colors?.length ? `${bubble.colors.length} colors` : '';
    case 'reference':
      return bubble.image ? 'Image' : '';
    default:
      return (bubble as any).preset || (bubble as any).value || (bubble as any).label || '';
  }
}

/** Shows configured bubble values as prominent pills with icons on hover */
function HoverBubblesSummary({ bubbles }: { bubbles: BubbleValue[] }) {
  const configured = bubbles.filter((b) => {
    const def = getBubbleDefinition(b.type);
    return def && !def.isEmpty(b);
  });

  if (configured.length === 0) {
    return (
      <span className="text-[11px] font-medium text-white/70">No settings</span>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-1 px-1.5">
      {configured.map((bubble, i) => {
        const def = getBubbleDefinition(bubble.type);
        if (!def) return null;
        const Icon = def.icon;
        const label = getBubbleLabel(bubble);
        return (
          <div
            key={i}
            className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-sm"
          >
            <Icon className="h-3 w-3 shrink-0 text-white/90" />
            <span className="max-w-[60px] truncate text-[10px] font-medium text-white">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ===== COMPONENT =====

export function CategoryBubble({
  section,
  categoryName,
  previewImageUrl,
  bubbleCount,
  onClick,
  onRemove,
  className,
}: CategoryBubbleProps) {
  return (
    <div
      className={cn('group relative', className)}
      data-testid={buildTestId('category-bubble', section.id)}
    >
      <button
        onClick={onClick}
        className={cn(
          'relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 transition-all',
          section.enabled ? 'border-border hover:border-primary/50' : 'border-border/50 opacity-60'
        )}
        data-testid={buildTestId('category-bubble', 'button', section.id)}
      >
        {/* Background product image — muted by default, darker on hover */}
        {previewImageUrl && (
          <Image
            src={previewImageUrl}
            alt={categoryName}
            fill
            sizes="200px"
            className="object-cover brightness-75 transition-all group-hover:brightness-[0.3]"
          />
        )}

        {/* Dark overlay for non-image fallback */}
        {!previewImageUrl && (
          <div className="absolute inset-0 bg-muted/50" />
        )}

        {/* Hover overlay: bubble value pills */}
        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <HoverBubblesSummary bubbles={section.bubbles} />
        </div>
      </button>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -right-1 -top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
        data-testid={buildTestId('category-bubble', 'remove', section.id)}
      >
        <X className="h-3 w-3" />
      </button>

      {/* Category name label */}
      <div className="mt-1 text-center">
        <span className="block truncate text-[12px] text-muted-foreground">{categoryName}</span>
      </div>
    </div>
  );
}
