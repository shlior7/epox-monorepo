'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { CategoryBubble } from './CategoryBubble';
import { CategoryBubbleModal } from './CategoryBubbleModal';
import { AddSectionDropdown } from './AddSectionDropdown';
import { useConfigPanelContext } from './ConfigPanelContext';
import type { InspirationSection } from 'visualizer-types';

// ===== PROPS =====

export interface CategoryInfo {
  id: string;
  name: string;
  productCount?: number;
}

export interface CategoryBubblesSectionProps {
  categories: CategoryInfo[];
  availableSceneTypes: string[];
  visibleSections: InspirationSection[];
  unusedCategories: CategoryInfo[];
  categoryProductImages?: Record<string, string>;
  onAddSection: (categoryIds: string[], sceneTypes: string[]) => void;
  className?: string;
}

// ===== COMPONENT =====

export function CategoryBubblesSection({
  categories,
  availableSceneTypes,
  visibleSections,
  unusedCategories,
  categoryProductImages = {},
  onAddSection,
  className,
}: CategoryBubblesSectionProps) {
  const { removeSection } = useConfigPanelContext();
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  // Build a category name lookup
  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [categories]);

  // Resolve opened section for modal
  const openedSection = useMemo(() => {
    if (!openSectionId) return null;
    return visibleSections.find((s) => s.id === openSectionId) ?? null;
  }, [openSectionId, visibleSections]);

  const openedSectionCategoryName = useMemo(() => {
    if (!openedSection) return '';
    return openedSection.categoryIds.map((id) => categoryNameMap.get(id) || 'Unknown').join(', ');
  }, [openedSection, categoryNameMap]);

  const showSection = visibleSections.length > 0 || unusedCategories.length > 0;
  if (!showSection) return null;

  return (
    <div className={className} data-testid={buildTestId('category-bubbles-section')}>
      {/* Header row */}
      <div
        className="mb-2 flex items-center justify-between"
        data-testid={buildTestId('category-bubbles-section', 'header')}
      >
        <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Categories
        </span>
        {unusedCategories.length > 0 && (
          <AddSectionDropdown
            categories={unusedCategories}
            sceneTypes={availableSceneTypes}
            onAdd={onAddSection}
          >
            <button
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-md transition-all',
                'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              data-testid={buildTestId('category-bubbles-section', 'add-button')}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </AddSectionDropdown>
        )}
      </div>

      {/* Category Bubbles Grid */}
      {visibleSections.length > 0 && (
        <div
          className="grid w-full grid-cols-2 gap-2 md:grid-cols-3"
          data-testid={buildTestId('category-bubbles-section', 'grid')}
        >
          {visibleSections.map((section) => {
            const catName = section.categoryIds
              .map((id) => categoryNameMap.get(id) || 'Unknown')
              .join(', ');
            const firstCatId = section.categoryIds[0];
            const previewImage = firstCatId ? categoryProductImages[firstCatId] : undefined;

            return (
              <CategoryBubble
                key={section.id}
                section={section}
                categoryName={catName}
                previewImageUrl={previewImage}
                bubbleCount={section.bubbles.length}
                onClick={() => setOpenSectionId(section.id)}
                onRemove={() => removeSection(section.id)}
              />
            );
          })}
        </div>
      )}

      {/* Category Bubble Modal */}
      {openedSection && (
        <CategoryBubbleModal
          open={!!openSectionId}
          onOpenChange={(open) => {
            if (!open) setOpenSectionId(null);
          }}
          section={openedSection}
          categoryName={openedSectionCategoryName}
        />
      )}
    </div>
  );
}
