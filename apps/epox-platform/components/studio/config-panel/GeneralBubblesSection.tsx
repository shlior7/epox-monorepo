'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { BubbleChip } from './InspirationBubble';
import { AddBubbleButton } from './AddBubbleButton';
import { useConfigPanelContext } from './ConfigPanelContext';
import { BubbleModalRouter } from './BubbleModalRouter';
import type { BubbleType, BubbleValue } from 'visualizer-types';

// ===== PROPS =====

export interface GeneralBubblesSectionProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

// ===== COMPONENT =====

export function GeneralBubblesSection({
  isExpanded = true,
  onToggle,
  className,
}: GeneralBubblesSectionProps) {
  const { state, addGeneralInspiration, removeGeneralInspiration, updateGeneralInspiration, initializeDefaultGeneralInspiration } = useConfigPanelContext();
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const [editingBubble, setEditingBubble] = useState<{ index: number; value: BubbleValue } | null>(null);

  const expanded = onToggle ? isExpanded : localExpanded;
  const toggleExpanded = onToggle || (() => setLocalExpanded(!localExpanded));

  const bubbles = state.generalInspiration || [];

  // Initialize default empty bubbles on mount if none exist
  useEffect(() => {
    if (bubbles.length === 0) {
      initializeDefaultGeneralInspiration();
    }
  }, []); // Only run on mount

  const handleAddBubble = (type: BubbleType) => {
    // Create empty bubble and open modal for editing
    const newBubble: BubbleValue = { type };
    addGeneralInspiration(newBubble);
    // Open modal for the newly added bubble
    const newIndex = bubbles.length;
    setEditingBubble({ index: newIndex, value: newBubble });
  };

  const handleRemoveBubble = (index: number, bubble: BubbleValue) => {
    // For inspiration bubbles with an image, first delete clears the image
    if (bubble.type === 'reference' && bubble.image) {
      // Clear the image first
      updateGeneralInspiration(index, {
        type: 'reference',
        image: undefined,
      });
    } else {
      // For empty bubbles or non-reference bubbles, delete the bubble
      removeGeneralInspiration(index);
    }
  };

  const handleBubbleClick = (index: number, bubble: BubbleValue) => {
    // Open modal for editing
    setEditingBubble({ index, value: bubble });
  };

  const handleBubbleSave = (values: BubbleValue | BubbleValue[]) => {
    if (editingBubble !== null) {
      // Handle array of values (multi-select for inspiration bubbles)
      if (Array.isArray(values)) {
        // First, update the existing bubble with the first value
        if (values.length > 0) {
          updateGeneralInspiration(editingBubble.index, values[0]);

          // Add additional bubbles for the rest
          for (let i = 1; i < values.length; i++) {
            addGeneralInspiration(values[i]);
          }
        }
      } else {
        // Single value
        updateGeneralInspiration(editingBubble.index, values);
      }
      setEditingBubble(null);
    }
  };

  return (
    <div
      className={cn('rounded-lg border border-border bg-accent/5', className)}
      data-testid={buildTestId('general-bubbles-section')}
    >
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className="flex w-full items-center gap-2 p-3"
        data-testid={buildTestId('general-bubbles-section', 'header')}
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-left text-sm font-medium">
          General
        </span>
        <span className="text-xs text-muted-foreground">
          Applies to all scene types
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div
          className="border-t border-border px-3 pb-3 pt-2"
          data-testid={buildTestId('general-bubbles-section', 'content')}
        >
          {/* Bubbles Grid */}
          <div className="flex flex-wrap gap-3">
            {/* Existing bubbles */}
            {bubbles.map((bubble, index) => (
              <BubbleChip
                key={index}
                value={bubble}
                sceneType="general"
                index={index}
                onClick={() => handleBubbleClick(index, bubble)}
                onRemove={() => handleRemoveBubble(index, bubble)}
                isActive={false}
              />
            ))}

            {/* Add bubble button */}
            <AddBubbleButton
              sceneType="general"
              onAddBubble={handleAddBubble}
              currentCount={bubbles.length}
              maxBubbles={10}
            />
          </div>
        </div>
      )}

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
