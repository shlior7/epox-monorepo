'use client';

import { useMemo, useState } from 'react';
import { Loader2, Sparkles, Save, Check, Minus, Plus } from 'lucide-react';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfigPanelProvider, useConfigPanelContext, type ConfigPanelState } from './ConfigPanelContext';
import { InspireSection } from './InspireSection';
import type { ImageAspectRatio, ImageQuality, InspirationBubbleValue } from 'visualizer-types';

// ===== MODE TYPES =====

export type ConfigPanelMode = 'studio-home' | 'collection-studio' | 'single-flow';

// ===== SCENE TYPE INFO =====

export interface SceneTypeInfo {
  sceneType: string;
  productCount: number;
  productIds: string[];
}

// ===== PROPS =====

export interface UnifiedStudioConfigPanelProps {
  mode: ConfigPanelMode;
  // Scene types (derived from products)
  sceneTypes: SceneTypeInfo[];
  // For single-flow mode
  selectedSceneType?: string;
  onSceneTypeChange?: (sceneType: string) => void;
  // Collection prompt (for single-flow mode, read-only display)
  collectionPrompt?: string;
  // Initial state
  initialState?: ConfigPanelState;
  // Actions
  onSave?: () => Promise<void>;
  onGenerate?: () => void;
  // Status
  isGenerating?: boolean;
  isSaving?: boolean;
  // Scroll sync (for collection-studio mode)
  activeSceneType?: string;
  onSceneTypeClick?: (sceneType: string) => void;
  // Product badge click
  onProductBadgeClick?: (sceneType: string) => void;
  // Bubble click (opens modal)
  onBubbleClick?: (sceneType: string, index: number, bubble: InspirationBubbleValue) => void;
  // Base image selection (single-flow mode)
  baseImages?: Array<{ id: string; url: string; thumbnailUrl?: string }>;
  selectedBaseImageId?: string;
  onBaseImageSelect?: (imageId: string) => void;
  // Style
  className?: string;
}

// ===== OUTPUT SETTINGS SECTION =====

const ASPECT_RATIO_OPTIONS: { value: ImageAspectRatio; label: string }[] = [
  { value: '1:1', label: 'Square' },
  { value: '16:9', label: 'Widescreen' },
  { value: '9:16', label: 'Social story' },
  { value: '2:3', label: 'Portrait' },
  { value: '3:2', label: 'Standard' },
  { value: '3:4', label: 'Traditional' },
  { value: '4:3', label: 'Classic' },
  { value: '21:9', label: 'Ultra-wide' },
];

const QUALITY_OPTIONS: { value: ImageQuality; label: string; description: string }[] = [
  { value: '1k', label: '1K', description: 'Fast' },
  { value: '2k', label: '2K', description: 'Balanced' },
  { value: '4k', label: '4K', description: 'High Quality' },
];

const VARIANT_OPTIONS = [1, 2, 4];

// ===== INTERNAL PANEL COMPONENT =====

function ConfigPanelContent({
  mode,
  sceneTypes,
  selectedSceneType,
  onSceneTypeChange,
  collectionPrompt,
  onSave,
  onGenerate,
  isGenerating = false,
  isSaving = false,
  activeSceneType,
  onSceneTypeClick,
  onProductBadgeClick,
  onBubbleClick,
  baseImages = [],
  selectedBaseImageId,
  onBaseImageSelect,
  className,
}: Omit<UnifiedStudioConfigPanelProps, 'initialState'>) {
  const {
    state,
    isDirty,
    setUserPrompt,
    setApplyCollectionPrompt,
    setOutputSettings,
  } = useConfigPanelContext();

  // Determine which scene types to show based on mode
  const displaySceneTypes = useMemo(() => {
    if (mode === 'single-flow' && selectedSceneType) {
      return sceneTypes.filter((st) => st.sceneType === selectedSceneType);
    }
    return sceneTypes;
  }, [mode, sceneTypes, selectedSceneType]);

  // Whether to show product badges
  const showProductBadges = mode !== 'single-flow';

  // Whether to show base image selector
  const showBaseImageSelector = mode === 'single-flow';

  // Whether to show collection prompt (read-only)
  const showCollectionPrompt = mode === 'single-flow' && !!collectionPrompt;

  // Whether to show scene type selector dropdown
  const showSceneTypeSelector = mode === 'single-flow' && sceneTypes.length > 1;

  return (
    <aside
      className={cn('flex w-80 shrink-0 flex-col border-r border-border bg-card/30', className)}
      data-testid={buildTestId('unified-config-panel')}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-border p-3"
        data-testid={buildTestId('unified-config-panel', 'header')}
      >
        <h2 className="text-sm font-semibold">Configuration</h2>
        <button
          onClick={() => isDirty && onSave?.()}
          disabled={isSaving || !isDirty}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            isDirty
              ? 'text-amber-500 hover:bg-amber-500/10'
              : 'text-green-500 hover:bg-green-500/10'
          )}
          data-testid={buildTestId('unified-config-panel', 'save-indicator')}
          title={isDirty ? 'Unsaved changes' : 'Saved'}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isDirty ? (
            <Save className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4"
        data-testid={buildTestId('unified-config-panel', 'content')}
      >
        {/* Scene Type Selector (single-flow mode only) */}
        {showSceneTypeSelector && (
          <div className="mb-4" data-testid={buildTestId('unified-config-panel', 'scene-type-selector')}>
            <p className="mb-1.5 text-xs text-muted-foreground">Scene Type</p>
            <Select value={selectedSceneType || ''} onValueChange={(v) => onSceneTypeChange?.(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select scene type" />
              </SelectTrigger>
              <SelectContent>
                {sceneTypes.map((st) => (
                  <SelectItem key={st.sceneType} value={st.sceneType}>
                    {st.sceneType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Inspire Section (Top) */}
        <InspireSection
          sceneTypes={displaySceneTypes}
          activeSceneType={activeSceneType}
          onSceneTypeClick={onSceneTypeClick}
          onProductBadgeClick={onProductBadgeClick}
          onBubbleClick={onBubbleClick}
          showProductBadges={showProductBadges}
          showBaseImageSelector={showBaseImageSelector}
          baseImages={baseImages}
          selectedBaseImageId={selectedBaseImageId}
          onBaseImageSelect={onBaseImageSelect}
        />

        {/* Prompt Section (Bottom) */}
        <section className="mt-6" data-testid={buildTestId('unified-config-panel', 'prompt-section')}>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prompt
          </h3>

          {/* Collection Prompt (read-only, single-flow mode) */}
          {showCollectionPrompt && (
            <div className="mb-3" data-testid={buildTestId('unified-config-panel', 'collection-prompt-display')}>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="apply-collection-prompt"
                  checked={state.applyCollectionPrompt}
                  onCheckedChange={(checked) => setApplyCollectionPrompt(!!checked)}
                  data-testid={buildTestId('unified-config-panel', 'collection-prompt-toggle')}
                />
                <label
                  htmlFor="apply-collection-prompt"
                  className="text-xs text-muted-foreground"
                >
                  Apply collection prompt
                </label>
              </div>
              {state.applyCollectionPrompt && (
                <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                  {collectionPrompt}
                </div>
              )}
            </div>
          )}

          {/* User Prompt */}
          <div data-testid={buildTestId('unified-config-panel', 'user-prompt')}>
            <Textarea
              placeholder="Add additional prompt details..."
              value={state.userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
            />
          </div>
        </section>

        {/* Output Settings */}
        <section className="mt-6" data-testid={buildTestId('unified-config-panel', 'output-settings')}>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Output
          </h3>

          <div className="flex flex-col gap-2">
            {/* Variants Counter */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Variants</span>
              <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
                <button
                  onClick={() =>
                    setOutputSettings({
                      variantsCount: Math.max(1, state.outputSettings.variantsCount - 1),
                    })
                  }
                  disabled={state.outputSettings.variantsCount <= 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  data-testid={buildTestId('unified-config-panel', 'variants-decrease')}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span
                  className="min-w-[20px] text-center text-sm font-medium"
                  data-testid={buildTestId('unified-config-panel', 'variants-count')}
                >
                  {state.outputSettings.variantsCount}
                </span>
                <button
                  onClick={() =>
                    setOutputSettings({
                      variantsCount: Math.min(4, state.outputSettings.variantsCount + 1),
                    })
                  }
                  disabled={state.outputSettings.variantsCount >= 4}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  data-testid={buildTestId('unified-config-panel', 'variants-increase')}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Aspect Ratio Dropdown */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Aspect Ratio</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex min-w-[100px] items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
                    data-testid={buildTestId('unified-config-panel', 'aspect-ratio-trigger')}
                  >
                    <span className="font-medium">{state.outputSettings.aspectRatio}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setOutputSettings({ aspectRatio: opt.value })}
                      className="flex items-center justify-between"
                      data-testid={buildTestId('unified-config-panel', 'aspect-ratio', opt.value)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{opt.value}</span>
                        <span className="text-sm">{opt.label}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Quality Dropdown */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Quality</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex min-w-[100px] items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
                    data-testid={buildTestId('unified-config-panel', 'quality-trigger')}
                  >
                    <span className="font-medium">{state.outputSettings.quality.toUpperCase()}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  {QUALITY_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setOutputSettings({ quality: opt.value })}
                      className="flex items-center justify-between"
                      data-testid={buildTestId('unified-config-panel', 'quality', opt.value)}
                    >
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.description}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </section>
      </div>

      {/* Footer - Generate Button */}
      <div
        className="shrink-0 border-t border-border bg-card p-3"
        data-testid={buildTestId('unified-config-panel', 'footer')}
      >
        <Button
          variant="glow"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full"
          data-testid={buildTestId('unified-config-panel', 'generate-button')}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Generate
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

// ===== MAIN COMPONENT (with Provider) =====

export function UnifiedStudioConfigPanel(props: UnifiedStudioConfigPanelProps) {
  const { initialState, ...contentProps } = props;

  return (
    <ConfigPanelProvider initialState={initialState}>
      <ConfigPanelContent {...contentProps} />
    </ConfigPanelProvider>
  );
}
