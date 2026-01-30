'use client';

/**
 * CategoryWizardModal
 * Multi-step wizard that creates InspirationSection[] per category.
 * Steps: 1) Select categories → 2) Per-category config → 3) Summary → Done
 */

import { useState, useCallback, useMemo } from 'react';
import { Check, ChevronRight, ChevronLeft, Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import type { BubbleValue, InspirationSection, CategoryGenerationSettings } from 'visualizer-types';

// ===== PRESETS (shared with bubble modals) =====

const STYLE_PRESETS = [
  'Modern',
  'Minimalist',
  'Industrial',
  'Scandinavian',
  'Bohemian',
  'Mid-Century',
  'Contemporary',
  'Traditional',
  'Rustic',
  'Eclectic',
];

const LIGHTING_PRESETS = [
  'Natural Daylight',
  'Warm Evening',
  'Studio Soft Light',
  'Dramatic Side Light',
  'Sunset Glow',
  'Morning Light',
  'Overcast',
  'Golden Hour',
];

// ===== TYPES =====

export interface CategoryWizardCategory {
  id: string;
  name: string;
  productCount: number;
}

interface CategoryConfig {
  categoryId: string;
  style?: string;
  lighting?: string;
}

export interface CategoryWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryWizardCategory[];
  onComplete: (sections: InspirationSection[]) => void;
  /** If true, also saves defaults to each category via API */
  saveToCategories?: boolean;
}

type WizardStep = 'select' | 'configure' | 'summary';

// ===== COMPONENT =====

export function CategoryWizardModal({
  open,
  onOpenChange,
  categories,
  onComplete,
  saveToCategories = true,
}: CategoryWizardModalProps) {
  const [step, setStep] = useState<WizardStep>('select');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [configs, setConfigs] = useState<Map<string, CategoryConfig>>(new Map());
  const [configIndex, setConfigIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Ordered list of selected categories for step-by-step config
  const selectedCategories = useMemo(() => {
    return categories.filter((c) => selectedCategoryIds.has(c.id));
  }, [categories, selectedCategoryIds]);

  const currentCategory = selectedCategories[configIndex];

  const currentConfig = currentCategory
    ? configs.get(currentCategory.id) || { categoryId: currentCategory.id }
    : null;

  // ===== HANDLERS =====

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedCategoryIds(new Set(categories.map((c) => c.id)));
  }, [categories]);

  const updateCurrentConfig = useCallback(
    (update: Partial<CategoryConfig>) => {
      if (!currentCategory) return;
      setConfigs((prev) => {
        const next = new Map(prev);
        const existing = next.get(currentCategory.id) || { categoryId: currentCategory.id };
        next.set(currentCategory.id, { ...existing, ...update });
        return next;
      });
    },
    [currentCategory]
  );

  const goToNextCategory = useCallback(() => {
    if (configIndex < selectedCategories.length - 1) {
      setConfigIndex((i) => i + 1);
    } else {
      setStep('summary');
    }
  }, [configIndex, selectedCategories.length]);

  const goToPrevCategory = useCallback(() => {
    if (configIndex > 0) {
      setConfigIndex((i) => i - 1);
    } else {
      setStep('select');
    }
  }, [configIndex]);

  const buildSections = useCallback((): InspirationSection[] => {
    return selectedCategories.map((cat) => {
      const config = configs.get(cat.id) || { categoryId: cat.id };
      const bubbles: BubbleValue[] = [];

      if (config.style) {
        bubbles.push({ type: 'style', preset: config.style });
      }
      if (config.lighting) {
        bubbles.push({ type: 'lighting', preset: config.lighting });
      }

      return {
        id: crypto.randomUUID(),
        categoryIds: [cat.id],
        sceneTypes: [], // applies to all scene types
        bubbles,
        enabled: true,
      };
    });
  }, [selectedCategories, configs]);

  const handleComplete = useCallback(async () => {
    const sections = buildSections();

    // Optionally save defaults to each category via API
    if (saveToCategories) {
      setIsSaving(true);
      try {
        await Promise.allSettled(
          selectedCategories.map(async (cat) => {
            const config = configs.get(cat.id);
            if (!config) return;

            const bubbles: BubbleValue[] = [];
            if (config.style) bubbles.push({ type: 'style', preset: config.style });
            if (config.lighting) bubbles.push({ type: 'lighting', preset: config.lighting });

            if (bubbles.length === 0) return;

            const settings: CategoryGenerationSettings = {
              defaultBubbles: bubbles,
              sceneTypeSettings: {},
            };

            await fetch(`/api/categories/${cat.id}/settings`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settings),
            });
          })
        );
      } finally {
        setIsSaving(false);
      }
    }

    onComplete(sections);
    handleClose();
  }, [buildSections, saveToCategories, selectedCategories, configs, onComplete]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset state after dialog animation
    setTimeout(() => {
      setStep('select');
      setSelectedCategoryIds(new Set());
      setConfigs(new Map());
      setConfigIndex(0);
    }, 200);
  }, [onOpenChange]);

  // ===== STEP INDICATOR =====

  const steps: { key: WizardStep; label: string }[] = [
    { key: 'select', label: 'Categories' },
    { key: 'configure', label: 'Configure' },
    { key: 'summary', label: 'Summary' },
  ];

  const stepOrder: WizardStep[] = ['select', 'configure', 'summary'];
  const currentStepIndex = stepOrder.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        testId={buildTestId('category-wizard-modal')}
      >
        {/* Step indicator */}
        <div
          className="flex items-center gap-2 px-1 pt-1"
          data-testid={buildTestId('category-wizard-modal', 'steps')}
        >
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
              )}
              <span
                className={cn(
                  'text-xs font-medium transition-colors',
                  i === currentStepIndex
                    ? 'text-primary'
                    : i < currentStepIndex
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/40'
                )}
              >
                {i < currentStepIndex && (
                  <Check className="mr-1 inline h-3 w-3" />
                )}
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Select Categories */}
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>Set up category defaults</DialogTitle>
              <DialogDescription>
                These categories were found on your imported products. Set default style and lighting for each — these will automatically apply when generating images for products in these categories.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[350px] space-y-1.5 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                    selectedCategoryIds.has(cat.id)
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border hover:border-border/80 hover:bg-accent/50'
                  )}
                  data-testid={buildTestId('category-wizard-modal', 'category-row', cat.id)}
                >
                  <Checkbox
                    checked={selectedCategoryIds.has(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                    data-testid={buildTestId('category-wizard-modal', 'category-checkbox', cat.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{cat.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {cat.productCount} product{cat.productCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </label>
              ))}

              {categories.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No categories found. Create categories first in Settings.
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={categories.length === 0}
                data-testid={buildTestId('category-wizard-modal', 'select-all')}
              >
                Select all
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setConfigIndex(0);
                  setStep('configure');
                }}
                disabled={selectedCategoryIds.size === 0}
                data-testid={buildTestId('category-wizard-modal', 'next-step')}
              >
                Configure ({selectedCategoryIds.size})
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Per-Category Config */}
        {step === 'configure' && currentCategory && currentConfig && (
          <>
            <DialogHeader>
              <DialogTitle>{currentCategory.name}</DialogTitle>
              <DialogDescription>
                Category {configIndex + 1} of {selectedCategories.length} — Set default style preferences
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Style Selection */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Style
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      key={style}
                      onClick={() => updateCurrentConfig({
                        style: currentConfig.style === style ? undefined : style,
                      })}
                      className={cn(
                        'rounded-md border px-2.5 py-2 text-xs font-medium transition-all',
                        currentConfig.style === style
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40 hover:bg-accent/50'
                      )}
                      data-testid={buildTestId('category-wizard-modal', 'style', style)}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lighting Selection */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Lighting
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {LIGHTING_PRESETS.map((lighting) => (
                    <button
                      key={lighting}
                      onClick={() => updateCurrentConfig({
                        lighting: currentConfig.lighting === lighting ? undefined : lighting,
                      })}
                      className={cn(
                        'rounded-md border px-2.5 py-2 text-xs font-medium transition-all',
                        currentConfig.lighting === lighting
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40 hover:bg-accent/50'
                      )}
                      data-testid={buildTestId('category-wizard-modal', 'lighting', lighting)}
                    >
                      {lighting}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevCategory}
                data-testid={buildTestId('category-wizard-modal', 'prev-category')}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                {configIndex === 0 ? 'Back' : 'Previous'}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextCategory}
                  data-testid={buildTestId('category-wizard-modal', 'skip-category')}
                >
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={goToNextCategory}
                  data-testid={buildTestId('category-wizard-modal', 'next-category')}
                >
                  {configIndex < selectedCategories.length - 1 ? (
                    <>
                      Next
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </>
                  ) : (
                    'Review'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Summary */}
        {step === 'summary' && (
          <>
            <DialogHeader>
              <DialogTitle>Review category defaults</DialogTitle>
              <DialogDescription>
                {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} configured.
                These defaults will be applied to matching products.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {selectedCategories.map((cat) => {
                const config = configs.get(cat.id);
                const hasBubbles = config?.style || config?.lighting;

                return (
                  <div
                    key={cat.id}
                    className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5"
                    data-testid={buildTestId('category-wizard-modal', 'summary-row', cat.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{cat.name}</div>
                      {hasBubbles ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {config?.style && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {config.style}
                            </span>
                          )}
                          {config?.lighting && (
                            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              {config.lighting}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs text-muted-foreground/60">
                          No defaults set (skipped)
                        </div>
                      )}
                    </div>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const idx = selectedCategories.findIndex((c) => c.id === cat.id);
                        if (idx !== -1) {
                          setConfigIndex(idx);
                          setStep('configure');
                        }
                      }}
                      data-testid={buildTestId('category-wizard-modal', 'edit-category', cat.id)}
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfigIndex(selectedCategories.length - 1);
                  setStep('configure');
                }}
                data-testid={buildTestId('category-wizard-modal', 'back-to-configure')}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={isSaving}
                data-testid={buildTestId('category-wizard-modal', 'complete')}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Apply defaults
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
