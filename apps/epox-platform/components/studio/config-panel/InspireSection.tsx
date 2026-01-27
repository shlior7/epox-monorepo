'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { Checkbox } from '@/components/ui/checkbox';
import { SceneTypeAccordion } from './SceneTypeAccordion';
import { GeneralBubblesSection } from './GeneralBubblesSection';
import { useConfigPanelContext } from './ConfigPanelContext';
import type { SceneTypeInfo } from './UnifiedStudioConfigPanel';
import type { BubbleValue } from 'visualizer-types';

// ===== PROPS =====

export interface InspireSectionProps {
  sceneTypes: SceneTypeInfo[];
  // For scroll sync
  activeSceneType?: string;
  onSceneTypeClick?: (sceneType: string) => void;
  // Product badge click
  onProductBadgeClick?: (sceneType: string) => void;
  // Bubble click (opens modal)
  onBubbleClick?: (sceneType: string, index: number, bubble: BubbleValue) => void;
  // Whether to show product badges
  showProductBadges?: boolean;
  // Base image section (single-flow mode)
  showBaseImageSelector?: boolean;
  baseImages?: Array<{ id: string; url: string; thumbnailUrl?: string }>;
  selectedBaseImageId?: string;
  onBaseImageSelect?: (imageId: string) => void;
  // Single-flow mode (show simple title instead of accordion)
  isSingleFlowMode?: boolean;
  // Selected scene type (for single-flow mode to show bubbles even when no scene type)
  selectedSceneType?: string;
  className?: string;
}

// ===== COMPONENT =====

export function InspireSection({
  sceneTypes,
  activeSceneType,
  onSceneTypeClick,
  onProductBadgeClick,
  onBubbleClick,
  showProductBadges = true,
  showBaseImageSelector = false,
  baseImages = [],
  selectedBaseImageId,
  onBaseImageSelect,
  isSingleFlowMode = false,
  selectedSceneType = '',
  className,
}: InspireSectionProps) {
  const { state, setUseSceneTypeInspiration } = useConfigPanelContext();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(sceneTypes.slice(0, 1).map((st) => st.sceneType))
  );

  // Track which sections are expanded
  const toggleSection = (sceneType: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sceneType)) {
        next.delete(sceneType);
      } else {
        next.add(sceneType);
      }
      return next;
    });
  };

  // Sort scene types by product count (most products first)
  const sortedSceneTypes = useMemo(() => {
    return [...sceneTypes].sort((a, b) => b.productCount - a.productCount);
  }, [sceneTypes]);

  return (
    <section className={className} data-testid={buildTestId('inspire-section')}>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Inspire
      </h3>

      {/* Base Image Selector (single-flow mode only) */}
      {showBaseImageSelector && baseImages.length > 0 && (
        <div className="mb-4" data-testid={buildTestId('inspire-section', 'base-images')}>
          <p className="mb-2 text-xs text-muted-foreground">Base Image</p>
          <div className="flex flex-wrap gap-2">
            {baseImages.map((img) => (
              <button
                key={img.id}
                onClick={() => onBaseImageSelect?.(img.id)}
                className={cn(
                  'relative aspect-square h-16 w-16 overflow-hidden rounded-lg border-2 transition-all',
                  selectedBaseImageId === img.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
                data-testid={buildTestId('inspire-section', 'base-image', img.id)}
              >
                <Image
                  src={img.thumbnailUrl || img.url}
                  alt="Base"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* General Bubbles Section (collection studio mode only) */}
      {!isSingleFlowMode && (
        <GeneralBubblesSection className="mb-4" />
      )}

      {/* Scene Type Inspiration Toggle (collection studio mode only) */}
      {!isSingleFlowMode && sortedSceneTypes.length > 0 && (
        <div
          className="mb-3 flex items-center gap-2"
          data-testid={buildTestId('inspire-section', 'scene-type-toggle')}
        >
          <Checkbox
            id="use-scene-type-inspiration"
            checked={state.useSceneTypeInspiration}
            onCheckedChange={(checked) => setUseSceneTypeInspiration(!!checked)}
          />
          <label
            htmlFor="use-scene-type-inspiration"
            className="cursor-pointer text-xs font-medium text-muted-foreground"
          >
            Per-scene-type inspiration
          </label>
        </div>
      )}

      {/* Scene Type Display */}
      <div className="space-y-2" data-testid={buildTestId('inspire-section', 'scene-types')}>
        {isSingleFlowMode ? (
          // Single-flow mode: just bubbles, no title - always show using selectedSceneType
          <div data-testid={buildTestId('inspire-section', 'scene-type-simple', selectedSceneType || 'none')}>
            <SceneTypeAccordion
              sceneType={selectedSceneType || ''}
              productCount={sortedSceneTypes[0]?.productCount || 1}
              productIds={sortedSceneTypes[0]?.productIds || []}
              isExpanded={true}
              isActive={false}
              onToggle={() => {}}
              onSceneTypeClick={() => onSceneTypeClick?.(selectedSceneType || '')}
              onProductBadgeClick={() => onProductBadgeClick?.(selectedSceneType || '')}
              onBubbleClick={(index, bubble) => onBubbleClick?.(selectedSceneType || '', index, bubble)}
              showProductBadge={false}
              hideHeader={true}
            />
          </div>
        ) : state.useSceneTypeInspiration ? (
          // Collection studio mode: accordions
          sortedSceneTypes.map((st) => (
            <SceneTypeAccordion
              key={st.sceneType}
              sceneType={st.sceneType}
              productCount={st.productCount}
              productIds={st.productIds}
              isExpanded={expandedSections.has(st.sceneType)}
              isActive={activeSceneType === st.sceneType}
              onToggle={() => toggleSection(st.sceneType)}
              onSceneTypeClick={() => onSceneTypeClick?.(st.sceneType)}
              onProductBadgeClick={() => onProductBadgeClick?.(st.sceneType)}
              onBubbleClick={(index, bubble) => onBubbleClick?.(st.sceneType, index, bubble)}
              showProductBadge={showProductBadges}
            />
          ))
        ) : null}
      </div>

      {/* Empty state */}
      {sceneTypes.length === 0 && !isSingleFlowMode && (
        <div
          className="rounded-lg border border-dashed border-border p-6 text-center"
          data-testid={buildTestId('inspire-section', 'empty')}
        >
          <p className="text-sm text-muted-foreground">
            No products selected. Add products to start configuring.
          </p>
        </div>
      )}
    </section>
  );
}
