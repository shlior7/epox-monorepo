'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { SceneTypeAccordion } from './SceneTypeAccordion';
import type { SceneTypeInfo } from './UnifiedStudioConfigPanel';
import type { InspirationBubbleValue } from 'visualizer-types';

// ===== PROPS =====

export interface InspireSectionProps {
  sceneTypes: SceneTypeInfo[];
  // For scroll sync
  activeSceneType?: string;
  onSceneTypeClick?: (sceneType: string) => void;
  // Product badge click
  onProductBadgeClick?: (sceneType: string) => void;
  // Bubble click (opens modal)
  onBubbleClick?: (sceneType: string, index: number, bubble: InspirationBubbleValue) => void;
  // Whether to show product badges
  showProductBadges?: boolean;
  // Base image section (single-flow mode)
  showBaseImageSelector?: boolean;
  baseImages?: Array<{ id: string; url: string; thumbnailUrl?: string }>;
  selectedBaseImageId?: string;
  onBaseImageSelect?: (imageId: string) => void;
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
  className,
}: InspireSectionProps) {
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

      {/* Scene Type Accordions */}
      <div className="space-y-2" data-testid={buildTestId('inspire-section', 'scene-types')}>
        {sortedSceneTypes.map((st) => (
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
        ))}
      </div>

      {/* Empty state */}
      {sceneTypes.length === 0 && (
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
