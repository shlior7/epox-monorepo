'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles, Save, Check, Minus, Plus, Image as ImageIcon, Video } from 'lucide-react';
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
import { ProductSection } from './ProductSection';
import { CollectionSettingsSection } from './CollectionSettingsSection';
import { OutputSettingsPanel } from './OutputSettings';
import type { ImageAspectRatio, ImageQuality, BubbleValue, SceneTypeInspirationMap } from 'visualizer-types';

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
  // Collection settings (for single-flow mode when flow belongs to collection)
  collectionSessionId?: string; // ID of the collection
  collectionName?: string; // Name of the collection
  collectionSettings?: {
    userPrompt?: string;
    generalInspiration?: BubbleValue[];
    sceneTypeInspiration?: SceneTypeInspirationMap;
  };
  flowSceneType?: string; // The scene type of this flow in the collection
  collectionPrompt?: string; // Deprecated - use collectionSettings.userPrompt
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
  onBubbleClick?: (sceneType: string, index: number, bubble: BubbleValue) => void;
  // Base image selection (single-flow mode)
  baseImages?: Array<{ id: string; url: string; thumbnailUrl?: string }>;
  selectedBaseImageId?: string;
  onBaseImageSelect?: (imageId: string) => void;
  // State change callback (bridges inner context to outer page state)
  onStateChange?: (state: ConfigPanelState) => void;
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
  collectionSessionId,
  collectionName,
  collectionSettings,
  flowSceneType,
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
  onStateChange,
  className,
}: Omit<UnifiedStudioConfigPanelProps, 'initialState'>) {
  const {
    state,
    isDirty,
    setUserPrompt,
    setApplyCollectionPrompt,
    setOutputSettings,
    migrateBubbles,
    markClean,
  } = useConfigPanelContext();

  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const prevSelectedSceneType = useRef<string | undefined>(selectedSceneType);

  // Migrate bubbles when scene type changes in single-flow mode
  useEffect(() => {
    if (mode === 'single-flow' && selectedSceneType !== prevSelectedSceneType.current) {
      const prev = prevSelectedSceneType.current || '';
      const next = selectedSceneType || '';

      // If we're moving from empty to a real scene type, migrate the bubbles
      if (prev === '' && next !== '') {
        migrateBubbles(prev, next);
      }

      prevSelectedSceneType.current = selectedSceneType;
    }
  }, [mode, selectedSceneType, migrateBubbles]);

  // Notify parent of state changes (use ref to avoid infinite re-render loop
  // from inline callback creating new references each render)
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  useEffect(() => {
    onStateChangeRef.current?.(state);
  }, [state]);

  // Determine which scene types to show based on mode
  const displaySceneTypes = useMemo(() => {
    if (mode === 'single-flow' && selectedSceneType) {
      return sceneTypes.filter((st) => st.sceneType === selectedSceneType);
    }
    return sceneTypes;
  }, [mode, sceneTypes, selectedSceneType]);

  // Whether to show product badges
  const showProductBadges = mode !== 'single-flow';

  // Whether to show product section (single-flow mode only)
  const showProductSection = mode === 'single-flow';

  // Whether to show collection settings section (single-flow mode when flow belongs to collection)
  const showCollectionSettings = mode === 'single-flow' && !!collectionSettings && !!collectionName;

  // Whether to show collection prompt (read-only) - DEPRECATED, use showCollectionSettings
  const showCollectionPrompt = mode === 'single-flow' && !!collectionPrompt;

  return (
    <aside
      className={cn('flex h-full w-80 shrink-0 flex-col border-r border-border bg-card/30', className)}
      data-testid={buildTestId('unified-config-panel')}
    >
      {/* Header with Tabs */}
      <div
        className="flex-none border-b border-border"
        data-testid={buildTestId('unified-config-panel', 'header')}
      >
        <div className="flex items-center justify-between p-3">
          <h2 className="text-sm font-semibold">Configuration</h2>
          <button
            onClick={async () => {
              if (isDirty && onSave) {
                try {
                  await onSave();
                  markClean(); // Reset dirty state after successful save
                } catch (error) {
                  // onSave failed, keep dirty state
                  console.error('Save failed:', error);
                }
              }
            }}
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

        {/* Tabs */}
        <div className="flex border-t border-border">
          <button
            onClick={() => setActiveTab('image')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'image'
                ? 'border-b-2 border-primary bg-primary/5 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            data-testid={buildTestId('unified-config-panel', 'tab-image')}
          >
            <ImageIcon className="h-4 w-4" />
            Image
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'video'
                ? 'border-b-2 border-primary bg-primary/5 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            data-testid={buildTestId('unified-config-panel', 'tab-video')}
          >
            <Video className="h-4 w-4" />
            Video
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4"
        data-testid={buildTestId('unified-config-panel', 'content')}
      >
        {/* Collection Settings Section (single-flow mode when flow belongs to collection) */}
        {showCollectionSettings && collectionSessionId && (
          <CollectionSettingsSection
            collectionSessionId={collectionSessionId}
            collectionName={collectionName!}
            collectionPrompt={collectionSettings?.userPrompt}
            generalInspiration={collectionSettings?.generalInspiration}
            sceneTypeInspiration={collectionSettings?.sceneTypeInspiration}
            flowSceneType={flowSceneType}
            applyCollectionSettings={state.applyCollectionPrompt ?? false}
            onToggleApply={setApplyCollectionPrompt}
            className="mb-6"
          />
        )}

        {/* Product Section (single-flow mode only) */}
        {showProductSection && baseImages.length > 0 && (
          <ProductSection
            baseImages={baseImages}
            selectedBaseImageId={selectedBaseImageId}
            onBaseImageSelect={onBaseImageSelect}
            sceneTypes={sceneTypes}
            selectedSceneType={selectedSceneType}
            onSceneTypeChange={onSceneTypeChange}
            className="mb-6"
          />
        )}

        {/* Inspire Section */}
        <InspireSection
          sceneTypes={displaySceneTypes}
          activeSceneType={activeSceneType}
          onSceneTypeClick={onSceneTypeClick}
          onProductBadgeClick={onProductBadgeClick}
          onBubbleClick={onBubbleClick}
          showProductBadges={showProductBadges}
          showBaseImageSelector={false}
          baseImages={[]}
          selectedBaseImageId=""
          onBaseImageSelect={undefined}
          isSingleFlowMode={mode === 'single-flow'}
          selectedSceneType={selectedSceneType}
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
        <OutputSettingsPanel />
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
