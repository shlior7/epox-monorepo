'use client';

import { useMemo } from 'react';
import { Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { GeneralBubblesSection } from './GeneralBubblesSection';
import { CategoryBubblesSection } from './CategoryBubblesSection';
import { useConfigPanelContext } from './ConfigPanelContext';
import type { BubbleValue, InspirationSection } from 'visualizer-types';

// ===== PROPS =====

export interface CategoryInfo {
  id: string;
  name: string;
  productCount?: number;
}

export interface InspireSectionProps {
  categories?: CategoryInfo[];
  sceneTypes?: Array<{ sceneType: string; productCount: number; productIds: string[] }>;
  isSingleFlowMode?: boolean;
  selectedSceneType?: string;
  selectedCategoryIds?: string[];
  onBubbleClick?: (sceneType: string, index: number, bubble: BubbleValue) => void;
  onOpenCategoryWizard?: () => void;
  categoryProductImages?: Record<string, string>;
  className?: string;
}

// ===== COMPONENT =====

export function InspireSection({
  categories = [],
  sceneTypes = [],
  isSingleFlowMode = false,
  selectedSceneType = '',
  selectedCategoryIds = [],
  onBubbleClick,
  onOpenCategoryWizard,
  categoryProductImages = {},
  className,
}: InspireSectionProps) {
  const { state, addSection } = useConfigPanelContext();

  // Derive available scene type names
  const availableSceneTypes = useMemo(() => {
    return sceneTypes.map((st) => st.sceneType);
  }, [sceneTypes]);

  // Filter out categories that already have a dedicated section
  const unusedCategories = useMemo(() => {
    const usedCategoryIds = new Set(state.inspirationSections.flatMap((s) => s.categoryIds));
    return categories.filter((c) => !usedCategoryIds.has(c.id));
  }, [categories, state.inspirationSections]);

  const handleAddSection = (categoryIds: string[], sectionSceneTypes: string[]) => {
    if (categoryIds.length === 0) return;
    const section: InspirationSection = {
      id: crypto.randomUUID(),
      categoryIds,
      sceneTypes: sectionSceneTypes,
      bubbles: [
        { type: 'style' },
        { type: 'lighting' },
        { type: 'camera-angle' },
        { type: 'mood' },
        { type: 'reference' },
        { type: 'color-palette' },
        { type: 'custom' },
      ],
      enabled: true,
    };
    addSection(section);
  };

  // Filter sections for single-flow mode
  const visibleSections = useMemo(() => {
    if (!isSingleFlowMode) return state.inspirationSections;

    return state.inspirationSections.filter((section) => {
      const categoryMatch =
        section.categoryIds.length === 0 ||
        section.categoryIds.some((id) => selectedCategoryIds.includes(id));
      const sceneTypeMatch =
        section.sceneTypes.length === 0 || section.sceneTypes.includes(selectedSceneType);
      return categoryMatch && sceneTypeMatch;
    });
  }, [state.inspirationSections, isSingleFlowMode, selectedSceneType, selectedCategoryIds]);

  // Show category wizard button when: not single-flow, categories exist, no sections yet
  const showWizardButton =
    !isSingleFlowMode &&
    categories.length > 0 &&
    state.inspirationSections.length === 0 &&
    !!onOpenCategoryWizard;

  return (
    <section className={className} data-testid={buildTestId('inspire-section')}>
      {/* General Bubbles Section */}
      <GeneralBubblesSection className="mb-4" />

      {/* Category Wizard prompt (when no sections and categories exist) */}
      {showWizardButton && (
        <button
          onClick={onOpenCategoryWizard}
          className={cn(
            'mb-3 flex w-full items-center gap-2.5 rounded-lg border border-dashed border-primary/30',
            'bg-primary/5 px-3 py-3 text-left transition-colors',
            'hover:border-primary/50 hover:bg-primary/10'
          )}
          data-testid={buildTestId('inspire-section', 'category-wizard-trigger')}
        >
          <Wand2 className="h-4 w-4 shrink-0 text-primary" />
          <div>
            <div className="text-xs font-medium text-primary">Set up category defaults</div>
            <div className="text-[10px] text-muted-foreground">
              Configure style & lighting per category
            </div>
          </div>
        </button>
      )}

      {/* Category Bubbles Section */}
      <CategoryBubblesSection
        categories={categories}
        availableSceneTypes={availableSceneTypes}
        visibleSections={visibleSections}
        unusedCategories={unusedCategories}
        categoryProductImages={categoryProductImages}
        onAddSection={handleAddSection}
      />

      {/* Empty state */}
      {visibleSections.length === 0 &&
        state.generalInspiration.length === 0 &&
        !isSingleFlowMode &&
        !showWizardButton && (
          <div
            className="rounded-lg border border-dashed border-border p-6 text-center"
            data-testid={buildTestId('inspire-section', 'empty')}
          >
            <p className="text-sm text-muted-foreground">
              No inspiration configured. Add general inspiration or create sections above.
            </p>
          </div>
        )}
    </section>
  );
}
