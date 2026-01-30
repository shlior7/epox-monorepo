'use client';

import { useMemo } from 'react';
import { buildTestId } from '@/lib/testing/testid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { InspirationBubblesGrid } from './InspirationBubblesGrid';
import { useConfigPanelContext } from './ConfigPanelContext';
import { getAllBubbleDefinitions } from '../bubbles/registry';
import type { BubbleType, BubbleValue, InspirationSection } from 'visualizer-types';

// ===== PROPS =====

export interface CategoryBubbleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: InspirationSection;
  categoryName: string;
}

// ===== HELPERS =====

/** Registry-ordered bubble types */
const ALL_BUBBLE_TYPES = getAllBubbleDefinitions().map((def) => def.type);

/**
 * Build display list: one slot per registry type, in registry order.
 * Existing configured bubbles are placed in their type's slot;
 * missing types get an empty placeholder.
 */
function buildCompleteBubbleList(sectionBubbles: BubbleValue[]): BubbleValue[] {
  const byType = new Map<string, BubbleValue>();
  for (const b of sectionBubbles) {
    // Keep the first occurrence per type (the configured one)
    if (!byType.has(b.type)) {
      byType.set(b.type, b);
    }
  }
  return ALL_BUBBLE_TYPES.map((type) => byType.get(type) ?? ({ type } as BubbleValue));
}

// ===== COMPONENT =====

export function CategoryBubbleModal({
  open,
  onOpenChange,
  section,
  categoryName,
}: CategoryBubbleModalProps) {
  const { addSectionBubble, updateSectionBubble, removeSectionBubble } = useConfigPanelContext();

  // Display list: always shows all bubble types in registry order
  const displayBubbles = useMemo(() => buildCompleteBubbleList(section.bubbles), [section.bubbles]);

  // Map display index → section.bubbles index (or null for placeholders)
  const sectionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < section.bubbles.length; i++) {
      const type = section.bubbles[i].type;
      if (!map.has(type)) map.set(type, i);
    }
    return map;
  }, [section.bubbles]);

  const handleAddBubble = (type: BubbleType) => {
    addSectionBubble(section.id, { type } as BubbleValue);
  };

  const handleRemoveBubble = (displayIndex: number, bubble: BubbleValue) => {
    const realIndex = sectionIndexMap.get(bubble.type);
    if (realIndex === undefined) return; // placeholder, nothing to remove
    if (bubble.type === 'reference' && bubble.image) {
      updateSectionBubble(section.id, realIndex, { type: 'reference', image: undefined });
    } else {
      removeSectionBubble(section.id, realIndex);
    }
  };

  const handleUpdateBubble = (displayIndex: number, bubble: BubbleValue) => {
    const realIndex = sectionIndexMap.get(displayBubbles[displayIndex].type);
    if (realIndex !== undefined) {
      updateSectionBubble(section.id, realIndex, bubble);
    } else {
      // Placeholder being configured for the first time — add to section
      addSectionBubble(section.id, bubble);
    }
  };

  const handleAddMultipleBubbles = (newBubbles: BubbleValue[]) => {
    for (const b of newBubbles) {
      addSectionBubble(section.id, b);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[660px]"
        testId={buildTestId('category-bubble-modal', section.id)}
        onPointerDownOutside={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>{categoryName}</DialogTitle>
          <DialogDescription>Configure generation settings for this category</DialogDescription>
        </DialogHeader>

        <InspirationBubblesGrid
          bubbles={displayBubbles}
          sceneType={section.id}
          headerLabel="Generation Settings"
          onAddBubble={handleAddBubble}
          onRemoveBubble={handleRemoveBubble}
          onUpdateBubble={handleUpdateBubble}
          onAddMultipleBubbles={handleAddMultipleBubbles}
          maxBubbles={10}
          columns={4}
        />
      </DialogContent>
    </Dialog>
  );
}
