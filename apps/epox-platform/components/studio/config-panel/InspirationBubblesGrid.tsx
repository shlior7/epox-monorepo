'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { BubbleChip } from './InspirationBubble';
import { AddBubbleButton } from './AddBubbleButton';
import { BubbleModalRouter } from './BubbleModalRouter';
import type { BubbleType, BubbleValue } from 'visualizer-types';

// ===== PROPS =====

export interface InspirationBubblesGridProps {
  bubbles: BubbleValue[];
  sceneType: string;
  headerLabel?: string;
  onAddBubble: (type: BubbleType) => void;
  onRemoveBubble: (index: number, bubble: BubbleValue) => void;
  onUpdateBubble: (index: number, bubble: BubbleValue) => void;
  onAddMultipleBubbles?: (bubbles: BubbleValue[]) => void;
  maxBubbles?: number;
  columns?: number;
  compact?: boolean;
  className?: string;
}

// ===== COMPONENT =====

export function InspirationBubblesGrid({
  bubbles,
  sceneType,
  headerLabel,
  onAddBubble,
  onRemoveBubble,
  onUpdateBubble,
  onAddMultipleBubbles,
  maxBubbles = 10,
  columns,
  compact = false,
  className,
}: InspirationBubblesGridProps) {
  const [editingBubble, setEditingBubble] = useState<{ index: number; value: BubbleValue } | null>(
    null
  );

  const handleAddBubble = (type: BubbleType) => {
    const newBubble: BubbleValue = { type };
    onAddBubble(type);
    const newIndex = bubbles.length;
    setEditingBubble({ index: newIndex, value: newBubble });
  };

  const handleRemoveBubble = (index: number, bubble: BubbleValue) => {
    if (bubble.type === 'reference' && bubble.image) {
      onUpdateBubble(index, { type: 'reference', image: undefined });
    } else {
      onRemoveBubble(index, bubble);
    }
  };

  const handleBubbleClick = (index: number, bubble: BubbleValue) => {
    setEditingBubble({ index, value: bubble });
  };

  const handleBubbleSave = (values: BubbleValue | BubbleValue[]) => {
    if (editingBubble !== null) {
      if (Array.isArray(values)) {
        if (values.length > 0) {
          onUpdateBubble(editingBubble.index, values[0]);
          if (onAddMultipleBubbles) {
            onAddMultipleBubbles(values.slice(1));
          } else {
            // Fallback: add one by one via onAddBubble won't work for values,
            // so just update the first one
          }
        }
      } else {
        onUpdateBubble(editingBubble.index, values);
      }
      setEditingBubble(null);
    }
  };

  return (
    <div
      className={cn('rounded-lg', className)}
      data-testid={buildTestId('inspiration-bubbles-grid', sceneType)}
    >
      {/* Header row */}
      <div
        className={cn('flex items-center justify-between', compact ? 'mb-2' : 'mb-4')}
        data-testid={buildTestId('inspiration-bubbles-grid', 'header', sceneType)}
      >
        <span className={cn('font-medium uppercase tracking-wide text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          {headerLabel ?? 'Inspire'}
        </span>
        <AddBubbleButton
          sceneType={sceneType}
          onAddBubble={handleAddBubble}
          currentCount={bubbles.length}
          maxBubbles={maxBubbles}
          variant="header"
        />
      </div>

      {/* Bubbles Grid */}
      <div
        className={cn('grid w-full gap-2', !columns && 'grid-cols-2 md:grid-cols-3')}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {bubbles.map((bubble, index) => (
          <BubbleChip
            key={index}
            value={bubble}
            sceneType={sceneType}
            index={index}
            onClick={() => handleBubbleClick(index, bubble)}
            onRemove={() => handleRemoveBubble(index, bubble)}
            isActive={false}
            compact={compact}
          />
        ))}
      </div>

      {/* Bubble Edit Modal */}
      {editingBubble && (
        <BubbleModalRouter
          bubbleType={editingBubble.value.type}
          value={editingBubble.value}
          onSave={handleBubbleSave}
          onClose={() => setEditingBubble(null)}
        />
      )}
    </div>
  );
}
