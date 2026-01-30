'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { InspirationBubblesGrid } from './InspirationBubblesGrid';
import { useConfigPanelContext } from './ConfigPanelContext';
import type { BubbleType, BubbleValue } from 'visualizer-types';

// ===== PROPS =====

export interface GeneralBubblesSectionProps {
  isExpanded?: boolean;
  className?: string;
}

// ===== COMPONENT =====

export function GeneralBubblesSection({
  isExpanded = true,
  className,
}: GeneralBubblesSectionProps) {
  const {
    state,
    addGeneralInspiration,
    removeGeneralInspiration,
    updateGeneralInspiration,
    initializeDefaultGeneralInspiration,
  } = useConfigPanelContext();

  const bubbles = state.generalInspiration || [];

  // Initialize default empty bubbles on mount if none exist
  useEffect(() => {
    if (bubbles.length === 0) {
      initializeDefaultGeneralInspiration();
    }
  }, []); // Only run on mount

  const handleAddBubble = (type: BubbleType) => {
    const newBubble: BubbleValue = { type };
    addGeneralInspiration(newBubble);
  };

  const handleRemoveBubble = (index: number, bubble: BubbleValue) => {
    if (bubble.type === 'reference' && bubble.image) {
      updateGeneralInspiration(index, { type: 'reference', image: undefined });
    } else {
      removeGeneralInspiration(index);
    }
  };

  const handleUpdateBubble = (index: number, bubble: BubbleValue) => {
    updateGeneralInspiration(index, bubble);
  };

  const handleAddMultipleBubbles = (newBubbles: BubbleValue[]) => {
    for (const b of newBubbles) {
      addGeneralInspiration(b);
    }
  };

  return (
    <div
      className={cn('rounded-lg', className)}
      data-testid={buildTestId('general-bubbles-section')}
    >
      <div
        className="border-border pb-3 pt-2"
        data-testid={buildTestId('general-bubbles-section', 'content')}
      >
        <InspirationBubblesGrid
          bubbles={bubbles}
          sceneType="general"
          headerLabel="Inspire"
          onAddBubble={handleAddBubble}
          onRemoveBubble={handleRemoveBubble}
          onUpdateBubble={handleUpdateBubble}
          onAddMultipleBubbles={handleAddMultipleBubbles}
          maxBubbles={10}
        />
      </div>
    </div>
  );
}
