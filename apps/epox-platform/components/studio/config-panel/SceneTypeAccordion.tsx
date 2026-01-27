'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Briefcase, Bed, Sofa, UtensilsCrossed, Bath, TreePine, Building2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { BubbleChip } from './InspirationBubble';
import { AddBubbleButton } from './AddBubbleButton';
import { ProductCountBadge } from './ProductCountBadge';
import { useConfigPanelContext } from './ConfigPanelContext';
import { BubbleModalRouter } from './BubbleModalRouter';
import type { BubbleType, BubbleValue } from 'visualizer-types';

// ===== SCENE TYPE ICONS =====

const SCENE_TYPE_ICONS: Record<string, React.ElementType> = {
  'Living Room': Sofa,
  'Bedroom': Bed,
  'Office': Briefcase,
  'Kitchen': UtensilsCrossed,
  'Dining Room': UtensilsCrossed,
  'Bathroom': Bath,
  'Outdoor': TreePine,
  'Urban': Building2,
  'Studio': Camera,
};

function getSceneTypeIcon(sceneType: string): React.ElementType {
  // Try exact match
  if (SCENE_TYPE_ICONS[sceneType]) {
    return SCENE_TYPE_ICONS[sceneType];
  }
  // Try partial match
  const lowerType = sceneType.toLowerCase();
  for (const [key, icon] of Object.entries(SCENE_TYPE_ICONS)) {
    if (lowerType.includes(key.toLowerCase())) {
      return icon;
    }
  }
  // Default
  return Camera;
}

// ===== PROPS =====

export interface SceneTypeAccordionProps {
  sceneType: string;
  productCount: number;
  productIds: string[];
  isExpanded?: boolean;
  isActive?: boolean;
  onToggle?: () => void;
  onSceneTypeClick?: () => void;
  onProductBadgeClick?: () => void;
  onBubbleClick?: (index: number, bubble: BubbleValue) => void;
  showProductBadge?: boolean;
  hideHeader?: boolean;
  className?: string;
}

// ===== COMPONENT =====

export function SceneTypeAccordion({
  sceneType,
  productCount,
  productIds,
  isExpanded = true,
  isActive = false,
  onToggle,
  onSceneTypeClick,
  onProductBadgeClick,
  onBubbleClick,
  showProductBadge = true,
  hideHeader = false,
  className,
}: SceneTypeAccordionProps) {
  const { state, addBubble, removeBubble, updateBubble, initializeDefaultBubbles } = useConfigPanelContext();
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const [editingBubble, setEditingBubble] = useState<{ index: number; value: BubbleValue } | null>(null);

  const expanded = onToggle ? isExpanded : localExpanded;
  const toggleExpanded = onToggle || (() => setLocalExpanded(!localExpanded));

  const Icon = getSceneTypeIcon(sceneType);
  const bubbles = state.sceneTypeInspiration[sceneType]?.bubbles || [];

  // Initialize default bubbles on mount if none exist
  useEffect(() => {
    if (bubbles.length === 0) {
      initializeDefaultBubbles(sceneType);
    }
  }, [sceneType]); // Only run when scene type changes or on mount

  const handleAddBubble = (type: BubbleType) => {
    // Create empty bubble and open modal for editing
    const newBubble: BubbleValue = { type };
    addBubble(sceneType, newBubble);
    // Open modal for the newly added bubble
    const newIndex = bubbles.length;
    setEditingBubble({ index: newIndex, value: newBubble });
  };

  const handleRemoveBubble = (index: number, bubble: BubbleValue) => {
    // For inspiration bubbles with an image, first delete clears the image
    if (bubble.type === 'reference' && bubble.image) {
      // Clear the image first
      updateBubble(sceneType, index, {
        type: 'reference',
        image: undefined,
      });
    } else {
      // For empty bubbles or non-inspiration bubbles, delete the bubble
      removeBubble(sceneType, index);
    }
  };

  const handleBubbleClick = (index: number, bubble: BubbleValue) => {
    // Open modal for editing
    setEditingBubble({ index, value: bubble });
    // Also call the external handler if provided
    onBubbleClick?.(index, bubble);
  };

  const handleBubbleSave = (values: BubbleValue | BubbleValue[]) => {
    if (editingBubble !== null) {
      // Handle array of values (multi-select for inspiration bubbles)
      if (Array.isArray(values)) {
        // First, update the existing bubble with the first value
        if (values.length > 0) {
          updateBubble(sceneType, editingBubble.index, values[0]);

          // Add additional bubbles for the rest
          for (let i = 1; i < values.length; i++) {
            addBubble(sceneType, values[i]);
          }
        }
      } else {
        // Single value
        updateBubble(sceneType, editingBubble.index, values);
      }
      setEditingBubble(null);
    }
  };

  // If hideHeader is true, just render bubbles without container
  if (hideHeader) {
    return (
      <>
        <div
          className={cn('flex flex-wrap gap-3', className)}
          data-testid={buildTestId('scene-type-accordion', sceneType)}
          data-scene-type={sceneType}
        >
          {/* Existing bubbles */}
          {bubbles.map((bubble, index) => (
            <BubbleChip
              key={index}
              value={bubble}
              sceneType={sceneType}
              index={index}
              onClick={() => handleBubbleClick(index, bubble)}
              onRemove={() => handleRemoveBubble(index, bubble)}
              isActive={false}
            />
          ))}

          {/* Add bubble button */}
          <AddBubbleButton
            sceneType={sceneType}
            onAddBubble={handleAddBubble}
            currentCount={bubbles.length}
            maxBubbles={10}
          />
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
      </>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        isActive ? 'border-primary/50 bg-primary/5' : 'border-border',
        className
      )}
      data-testid={buildTestId('scene-type-accordion', sceneType)}
      data-scene-type={sceneType}
    >
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className="flex w-full items-center gap-2 p-3"
        data-testid={buildTestId('scene-type-accordion', 'header', sceneType)}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span
          className="flex-1 text-left text-sm font-medium hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onSceneTypeClick?.();
          }}
        >
          {sceneType}
        </span>
        {showProductBadge && (
          <ProductCountBadge
            sceneType={sceneType}
            count={productCount}
            isActive={isActive}
            asButton={false}
            onClick={(e) => {
              e.stopPropagation();
              onProductBadgeClick?.();
            }}
          />
        )}
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
          data-testid={buildTestId('scene-type-accordion', 'content', sceneType)}
        >
          {/* Bubbles Grid */}
          <div className="flex flex-wrap gap-3">
            {/* Existing bubbles */}
            {bubbles.map((bubble, index) => (
              <BubbleChip
                key={index}
                value={bubble}
                sceneType={sceneType}
                index={index}
                onClick={() => handleBubbleClick(index, bubble)}
                onRemove={() => handleRemoveBubble(index, bubble)}
                isActive={false}
              />
            ))}

            {/* Add bubble button */}
            <AddBubbleButton
              sceneType={sceneType}
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
