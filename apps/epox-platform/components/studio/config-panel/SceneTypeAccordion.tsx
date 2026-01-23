'use client';

import { useState } from 'react';
import { ChevronDown, Briefcase, Bed, Sofa, UtensilsCrossed, Bath, TreePine, Building2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { InspirationBubble } from './InspirationBubble';
import { AddBubbleButton } from './AddBubbleButton';
import { ProductCountBadge } from './ProductCountBadge';
import { useConfigPanelContext } from './ConfigPanelContext';
import type { InspirationBubbleType, InspirationBubbleValue } from 'visualizer-types';

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
  onBubbleClick?: (index: number, bubble: InspirationBubbleValue) => void;
  showProductBadge?: boolean;
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
  className,
}: SceneTypeAccordionProps) {
  const { state, addBubble, removeBubble } = useConfigPanelContext();
  const [localExpanded, setLocalExpanded] = useState(isExpanded);

  const expanded = onToggle ? isExpanded : localExpanded;
  const toggleExpanded = onToggle || (() => setLocalExpanded(!localExpanded));

  const Icon = getSceneTypeIcon(sceneType);
  const bubbles = state.sceneTypeBubbles[sceneType]?.bubbles || [];

  const handleAddBubble = (type: InspirationBubbleType) => {
    addBubble(sceneType, { type });
  };

  const handleRemoveBubble = (index: number) => {
    removeBubble(sceneType, index);
  };

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
              <InspirationBubble
                key={index}
                value={bubble}
                sceneType={sceneType}
                index={index}
                onClick={() => onBubbleClick?.(index, bubble)}
                onRemove={() => handleRemoveBubble(index)}
                isActive={false}
              />
            ))}

            {/* Add bubble button */}
            <AddBubbleButton
              sceneType={sceneType}
              onAddBubble={handleAddBubble}
              currentCount={bubbles.length}
              maxBubbles={5}
            />
          </div>
        </div>
      )}
    </div>
  );
}
