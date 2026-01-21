'use client';

import React, { useMemo, useState, useCallback, useRef } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
  Layers,
  Sparkles,
  Loader2,
  ChevronDown,
  Info,
  Play,
  X,
  Settings,
  Sliders,
  Wand2,
} from 'lucide-react';
import clsx from 'clsx';
import type { Flow, FlowGenerationSettings, PostAdjustments } from '@/lib/types/app-types';
import { DEFAULT_POST_ADJUSTMENTS } from '@/lib/types/app-types';
import { PostAdjustmentsPanel } from './PostAdjustmentsPanel';
import { ModelSelector } from '../common/ModelSelector';
import { AI_MODELS } from 'visualizer-ai/client';
import {
  STYLE_OPTIONS,
  SCENE_TYPES,
  LIGHTING_OPTIONS,
  SURROUNDING_OPTIONS,
  COLOR_SCHEMES,
  PROP_TAGS,
  CAMERA_ANGLES,
  ASPECT_RATIOS,
  IMAGE_QUALITY_OPTIONS,
} from './constants';
import styles from './SceneStudioView.module.scss';

interface FlowSettingsPanelProps {
  selectedFlows: Flow[];
  onUpdateSettings: (settings: Partial<FlowGenerationSettings>) => void;
  onUpdateSharedPrompt: (sharedPrompt: string) => void;
  onOpenSceneLibrary: () => void;
  onExecuteFlows?: () => void;
  isExecuting?: boolean;
  className?: string;
}

type MixedValue = string | 'mixed';
type MixedBoolean = boolean | 'mixed';

// Helper to get the value for a field across multiple flows
function getMixedValue<T>(flows: Flow[], getter: (settings: FlowGenerationSettings) => T): T | 'mixed' {
  if (flows.length === 0) return 'mixed';
  if (flows.length === 1) return getter(flows[0].settings);

  const firstValue = getter(flows[0].settings);
  const allSame = flows.every((f) => getter(f.settings) === firstValue);
  return allSame ? firstValue : 'mixed';
}

// Helper to check if arrays are equal
function arraysEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

function getMixedArrayValue(flows: Flow[], getter: (settings: FlowGenerationSettings) => string[] | undefined): string[] | 'mixed' {
  if (flows.length === 0) return 'mixed';
  if (flows.length === 1) return getter(flows[0].settings) || [];

  const firstValue = getter(flows[0].settings);
  const allSame = flows.every((f) => arraysEqual(getter(f.settings), firstValue));
  return allSame ? firstValue || [] : 'mixed';
}

// Tooltip component
function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className={styles.tooltipTrigger}>
          <Info className={styles.tooltipIcon} />
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className={styles.tooltipContent} side="top" align="center" sideOffset={8}>
          {text}
          <Tooltip.Arrow className={styles.tooltipArrow} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// Tag Input with Autocomplete
function TagInput({
  tags,
  suggestions,
  onAddTag,
  onRemoveTag,
  placeholder,
}: {
  tags: string[];
  suggestions: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return suggestions.filter((s) => !tags.includes(s));
    return suggestions.filter((s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s));
  }, [inputValue, suggestions, tags]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        onAddTag(filteredSuggestions[highlightedIndex]);
        setInputValue('');
        setHighlightedIndex(-1);
      } else if (inputValue.trim()) {
        onAddTag(inputValue.trim());
        setInputValue('');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onRemoveTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className={styles.tagAutocomplete}>
      <div className={styles.tagInputWrapper} onClick={() => inputRef.current?.focus()}>
        {tags.map((tag) => (
          <span key={tag} className={styles.tagItem}>
            {tag}
            <button type="button" onClick={() => onRemoveTag(tag)}>
              <X />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className={styles.tagInput}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className={styles.tagSuggestions}>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className={clsx(styles.tagSuggestion, {
                [styles.highlighted]: index === highlightedIndex,
              })}
              onClick={() => {
                onAddTag(suggestion);
                setInputValue('');
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FlowSettingsPanel({
  selectedFlows,
  onUpdateSettings,
  onUpdateSharedPrompt,
  onOpenSceneLibrary,
  onExecuteFlows,
  isExecuting = false,
  className,
}: FlowSettingsPanelProps) {
  const isMultiSelect = selectedFlows.length > 1;
  const hasSelection = selectedFlows.length > 0;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Analyze scene using AI to extract settings
  const handleAnalyzeScene = useCallback(async () => {
    const sceneUrl = selectedFlows[0]?.settings?.sceneImageUrl;
    if (!sceneUrl || sceneUrl === 'mixed') {
      setAnalyzeError('Please select a backdrop scene first');
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const response = await fetch('/api/analyze-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneImageUrl: sceneUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze scene');
      }

      const data = await response.json();

      if (data.success && data.analysis) {
        const analysis = data.analysis;

        // Apply all extracted settings
        onUpdateSettings({
          sceneType: analysis.sceneType || undefined,
          style: analysis.style || undefined,
          lighting: analysis.lighting || undefined,
          cameraAngle: analysis.cameraAngle || undefined,
          surroundings: analysis.surroundings || undefined,
          colorScheme: analysis.colorScheme || undefined,
          props: analysis.props || undefined,
          promptText: analysis.promptText || undefined,
        });

        console.log('✅ Scene analysis applied:', analysis);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('❌ Scene analysis failed:', error);
      setAnalyzeError(error instanceof Error ? error.message : 'Failed to analyze scene');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFlows, onUpdateSettings]);

  // Compute mixed values for all settings
  const mixedSettings = useMemo(() => {
    if (!hasSelection) return null;

    return {
      scene: getMixedValue(selectedFlows, (s) => s.scene),
      sceneImageUrl: getMixedValue(selectedFlows, (s) => s.sceneImageUrl),
      sceneType: getMixedValue(selectedFlows, (s) => s.sceneType),
      style: getMixedValue(selectedFlows, (s) => s.style),
      lighting: getMixedValue(selectedFlows, (s) => s.lighting),
      cameraAngle: getMixedValue(selectedFlows, (s) => s.cameraAngle),
      surroundings: getMixedValue(selectedFlows, (s) => s.surroundings),
      colorScheme: getMixedValue(selectedFlows, (s) => s.colorScheme),
      varietyLevel: getMixedValue(selectedFlows, (s) => s.varietyLevel),
      matchProductColors: getMixedValue(selectedFlows, (s) => s.matchProductColors),
      includeAccessories: getMixedValue(selectedFlows, (s) => s.includeAccessories),
      aspectRatio: getMixedValue(selectedFlows, (s) => s.aspectRatio),
      props: getMixedArrayValue(selectedFlows, (s) => s.props),
      promptText: getMixedValue(selectedFlows, (s) => s.promptText),
      imageModel: getMixedValue(selectedFlows, (s) => s.imageModel),
      imageQuality: getMixedValue(selectedFlows, (s) => s.imageQuality),
      postAdjustments:
        selectedFlows.length === 1 ? selectedFlows[0].settings.postAdjustments || DEFAULT_POST_ADJUSTMENTS : ('mixed' as const),
    };
  }, [selectedFlows, hasSelection]);

  // Handle post adjustments change
  const handlePostAdjustmentsChange = useCallback(
    (adjustments: PostAdjustments) => {
      onUpdateSettings({ postAdjustments: adjustments });
    },
    [onUpdateSettings]
  );

  const handleChange = (field: keyof FlowGenerationSettings, value: unknown) => {
    onUpdateSettings({ [field]: value });
  };

  const handleAddProp = (prop: string) => {
    if (!mixedSettings || mixedSettings.props === 'mixed') {
      onUpdateSettings({ props: [prop] });
      return;
    }
    if (!mixedSettings.props.includes(prop)) {
      onUpdateSettings({ props: [...mixedSettings.props, prop] });
    }
  };

  const handleRemoveProp = (prop: string) => {
    if (!mixedSettings || mixedSettings.props === 'mixed') return;
    onUpdateSettings({ props: mixedSettings.props.filter((p) => p !== prop) });
  };

  // Render helper for select with mixed state
  const renderSelect = (label: string, field: keyof FlowGenerationSettings, options: string[], value: MixedValue) => (
    <div className={styles.settingsSection}>
      <label className={styles.settingsLabel}>{label}</label>
      <select
        value={value === 'mixed' ? '' : value || ''}
        onChange={(e) => handleChange(field, e.target.value === '' ? undefined : e.target.value)}
        className={clsx(styles.settingsSelect, { [styles.mixedValue]: value === 'mixed' })}
      >
        {value === 'mixed' && (
          <option value="" disabled>
            Mixed values
          </option>
        )}
        {value !== 'mixed' && <option value="">----</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  // Render helper for toggle with mixed state
  const renderToggle = (label: string, field: keyof FlowGenerationSettings, value: MixedBoolean) => (
    <div className={styles.toggleItem}>
      <span className={styles.toggleLabel}>{label}</span>
      <button type="button" onClick={() => handleChange(field, value === 'mixed' ? true : !value)} className={styles.toggleButton}>
        {value === 'mixed' ? (
          <div className={styles.mixedToggle}>—</div>
        ) : value ? (
          <ToggleRight style={{ width: 24, height: 24, color: 'var(--color-indigo-500)' }} />
        ) : (
          <ToggleLeft style={{ width: 24, height: 24, color: 'var(--color-slate-500)' }} />
        )}
      </button>
    </div>
  );

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className={clsx(styles.settingsPanel, className)}>
        <div className={styles.settingsPanelHeader}>
          <h3 className={styles.settingsPanelTitle}>
            {!hasSelection ? 'Settings' : isMultiSelect ? `${selectedFlows.length} Flows Selected` : 'Flow Settings'}
          </h3>
        </div>

        <div className={styles.settingsPanelContent}>
          {!hasSelection ? (
            <div className={styles.noSelectionState}>
              <Layers style={{ width: 48, height: 48, color: 'var(--color-slate-500)' }} />
              <p>Select a flow to edit its settings</p>
              <p className={styles.noSelectionHint}>Tip: Use Cmd+click or Shift+click to select multiple flows</p>
            </div>
          ) : (
            <div className={styles.accordionScrollArea}>
              <Accordion.Root type="multiple" defaultValue={['scene']} className={styles.accordionRoot}>
                {/* Section 1: Scene */}
                <Accordion.Item value="scene" className={styles.accordionItem}>
                  <Accordion.Header className={styles.accordionHeader}>
                    <Accordion.Trigger className={styles.accordionTrigger}>
                      <div className={styles.accordionTitle}>
                        <ImageIcon />
                        <span>Scene</span>
                      </div>
                      <ChevronDown className={styles.accordionChevron} aria-hidden />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className={styles.accordionContent}>
                    <div className={styles.accordionContentInner}>
                      {/* Backdrop Scene Selector */}
                      <div className={styles.settingsSection}>
                        <label className={styles.settingsLabel}>Backdrop Scene</label>
                        <div className={styles.scenePreviewWithImage} onClick={onOpenSceneLibrary}>
                          {mixedSettings?.sceneImageUrl === 'mixed' ? (
                            <>
                              <div className={styles.scenePreviewEmpty}>
                                <span style={{ fontSize: 12 }}>Mix</span>
                              </div>
                              <div className={styles.scenePreviewInfo}>
                                <span className={styles.scenePreviewPlaceholder}>Mixed scenes</span>
                                <span className={styles.scenePreviewAction}>Set for all</span>
                              </div>
                            </>
                          ) : mixedSettings?.sceneImageUrl ? (
                            <>
                              <div className={styles.scenePreviewThumbnail}>
                                <img src={mixedSettings.sceneImageUrl as string} alt={(mixedSettings.scene as string) || 'Scene'} />
                              </div>
                              <div className={styles.scenePreviewInfo}>
                                <span className={styles.scenePreviewText}>{(mixedSettings.scene as string) || 'Custom Scene'}</span>
                                <span className={styles.scenePreviewAction}>Change</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className={styles.scenePreviewEmpty}>
                                <ImageIcon style={{ width: 20, height: 20 }} />
                              </div>
                              <div className={styles.scenePreviewInfo}>
                                <span className={styles.scenePreviewPlaceholder}>No backdrop</span>
                                <span className={styles.scenePreviewAction}>Select scene</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Analyze Scene Button */}
                      {mixedSettings?.sceneImageUrl && mixedSettings.sceneImageUrl !== 'mixed' && !isMultiSelect && (
                        <div className={styles.settingsSection}>
                          <label className={styles.settingsLabel}>
                            AI Analysis
                            <InfoTooltip
                              text={
                                'Analyze the backdrop image\nDetect room type, style, lighting, and other settings.\n then apply this to the relevant settings panel options'
                              }
                            />
                          </label>
                          <button type="button" onClick={handleAnalyzeScene} disabled={isAnalyzing} className={styles.analyzeSceneButton}>
                            {isAnalyzing ? (
                              <>
                                <Loader2 className={styles.spinIcon} style={{ width: 14, height: 14 }} />
                                <span>Analyzing...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles style={{ width: 14, height: 14 }} />
                                <span>Analyze Scene</span>
                              </>
                            )}
                          </button>
                          {analyzeError && <p className={styles.analyzeError}>{analyzeError}</p>}
                        </div>
                      )}

                      {/* Interpretation Slider */}
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsLabelRow}>
                          <label className={styles.settingsLabel}>
                            Interpretation
                            <InfoTooltip
                              text={'How closely to follow the backdrop scene.\nLower = more faithful\n Higher = more creative.'}
                            />
                          </label>
                          <span className={styles.settingsValue}>
                            {mixedSettings?.varietyLevel === 'mixed' ? 'Mixed' : mixedSettings?.varietyLevel}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={mixedSettings?.varietyLevel === 'mixed' ? 5 : mixedSettings?.varietyLevel}
                          onChange={(e) => handleChange('varietyLevel', Number(e.target.value))}
                          className={styles.rangeSlider}
                        />
                      </div>

                      {/* Toggle Options */}
                      <div className={styles.toggleGrid}>
                        {renderToggle('Match Colors', 'matchProductColors', mixedSettings?.matchProductColors as MixedBoolean)}
                        {renderToggle('Accessories', 'includeAccessories', mixedSettings?.includeAccessories as MixedBoolean)}
                      </div>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>

                {/* Section 2: Environment Variables */}
                <Accordion.Item value="environment" className={styles.accordionItem}>
                  <Accordion.Header className={styles.accordionHeader}>
                    <Accordion.Trigger className={styles.accordionTrigger}>
                      <div className={styles.accordionTitle}>
                        <Settings />
                        <span>Environment</span>
                      </div>
                      <ChevronDown className={styles.accordionChevron} aria-hidden />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className={styles.accordionContent}>
                    <div className={styles.accordionContentInner}>
                      {renderSelect('Room Type', 'sceneType', SCENE_TYPES, mixedSettings?.sceneType as MixedValue)}
                      {renderSelect('Aesthetic Style', 'style', STYLE_OPTIONS, mixedSettings?.style as MixedValue)}
                      {renderSelect('Lighting', 'lighting', LIGHTING_OPTIONS, mixedSettings?.lighting as MixedValue)}
                      {renderSelect('Camera Angle', 'cameraAngle', CAMERA_ANGLES, mixedSettings?.cameraAngle as MixedValue)}
                      {renderSelect('Surroundings', 'surroundings', SURROUNDING_OPTIONS, mixedSettings?.surroundings as MixedValue)}
                      {renderSelect('Color Palette', 'colorScheme', COLOR_SCHEMES, mixedSettings?.colorScheme as MixedValue)}

                      {/* Staging Elements - Tag Input */}
                      <div className={styles.settingsSection}>
                        <label className={styles.settingsLabel}>
                          Staging Elements
                          {mixedSettings?.props === 'mixed' && <span className={styles.mixedLabel}> (Mixed)</span>}
                        </label>
                        <TagInput
                          tags={mixedSettings?.props === 'mixed' ? [] : mixedSettings?.props || []}
                          suggestions={PROP_TAGS}
                          onAddTag={handleAddProp}
                          onRemoveTag={handleRemoveProp}
                          placeholder="Type or select elements..."
                        />
                      </div>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>

                {/* Section 3: Image Config */}
                <Accordion.Item value="image" className={styles.accordionItem}>
                  <Accordion.Header className={styles.accordionHeader}>
                    <Accordion.Trigger className={styles.accordionTrigger}>
                      <div className={styles.accordionTitle}>
                        <Sliders />
                        <span>Image</span>
                      </div>
                      <ChevronDown className={styles.accordionChevron} aria-hidden />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className={styles.accordionContent}>
                    <div className={styles.accordionContentInner}>
                      {/* Aspect Ratio */}
                      <div className={styles.settingsSection}>
                        <label className={styles.settingsLabel}>
                          Aspect Ratio
                          {mixedSettings?.aspectRatio === 'mixed' && <span className={styles.mixedLabel}> (Mixed)</span>}
                        </label>
                        <div className={styles.aspectRatioGrid}>
                          {ASPECT_RATIOS.map((ratio) => (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => handleChange('aspectRatio', ratio)}
                              className={clsx(styles.aspectRatioButton, {
                                [styles.active]: mixedSettings?.aspectRatio === ratio,
                              })}
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Image Quality */}
                      <div className={styles.settingsSection}>
                        <label className={styles.settingsLabel}>
                          Image Quality
                          {mixedSettings?.imageQuality === 'mixed' && <span className={styles.mixedLabel}> (Mixed)</span>}
                        </label>
                        <div className={styles.qualityGrid}>
                          {IMAGE_QUALITY_OPTIONS.map((quality) => (
                            <button
                              key={quality.id}
                              type="button"
                              onClick={() => handleChange('imageQuality', quality.id)}
                              className={clsx(styles.qualityButton, {
                                [styles.active]: mixedSettings?.imageQuality === quality.id,
                              })}
                            >
                              <span className={styles.qualityLabel}>{quality.label}</span>
                              <span className={styles.qualityResolution}>{quality.resolution}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>

                {/* Section 4: Post Adjustments */}
                <Accordion.Item value="post-adjustments" className={styles.accordionItem}>
                  <Accordion.Header className={styles.accordionHeader}>
                    <Accordion.Trigger className={styles.accordionTrigger}>
                      <div className={styles.accordionTitle}>
                        <Wand2 />
                        <span>Post Adjustments</span>
                      </div>
                      <ChevronDown className={styles.accordionChevron} aria-hidden />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className={styles.accordionContent}>
                    <div className={styles.accordionContentInner}>
                      {mixedSettings?.postAdjustments === 'mixed' ? (
                        <div className={styles.mixedStateMessage}>
                          <p>Post adjustments vary across selected flows.</p>
                          <p className={styles.mixedStateHint}>Select a single flow to edit post adjustments.</p>
                        </div>
                      ) : (
                        <PostAdjustmentsPanel
                          adjustments={mixedSettings?.postAdjustments || DEFAULT_POST_ADJUSTMENTS}
                          onChange={handlePostAdjustmentsChange}
                          compact
                        />
                      )}
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion.Root>

              {/* Always Visible Section */}
              <div className={styles.alwaysVisibleSection}>
                {/* Model Selector */}
                <div className={styles.settingsSection}>
                  <ModelSelector
                    selectedModelId={
                      mixedSettings?.imageModel === 'mixed' ? AI_MODELS.IMAGE : (mixedSettings?.imageModel as string) || AI_MODELS.IMAGE
                    }
                    onModelChange={(modelId) => handleChange('imageModel', modelId)}
                    label="Generation Model"
                    context={{ task: 'generation' }}
                    showDescription={false}
                    showUpgradeHint={false}
                  />
                </div>

                {/* Custom Prompt */}
                <div className={styles.settingsSection}>
                  <label className={styles.settingsLabel}>{isMultiSelect ? 'Shared Prompt Prefix' : 'Custom Instructions'}</label>
                  {isMultiSelect ? (
                    <>
                      <textarea
                        placeholder="Enter text to prepend to all selected flows..."
                        className={styles.settingsTextarea}
                        onBlur={(e) => {
                          if (e.target.value) {
                            onUpdateSharedPrompt(e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                      <p className={styles.settingsHint}>
                        This will be added as a prefix to the prompt of all {selectedFlows.length} selected flows.
                      </p>
                    </>
                  ) : (
                    <textarea
                      value={(mixedSettings?.promptText as string) || ''}
                      onChange={(e) => handleChange('promptText', e.target.value)}
                      placeholder="e.g., emphasize the oak grain texture, add warm afternoon lighting..."
                      className={styles.settingsTextarea}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Execute Button */}
        {hasSelection && onExecuteFlows && (
          <div className={styles.settingsPanelFooter}>
            <button type="button" onClick={onExecuteFlows} disabled={isExecuting} className={styles.executeAllButton}>
              {isExecuting ? (
                <>
                  <Loader2 className={styles.spinIcon} />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Play />
                  <span>Generate {selectedFlows.length > 1 ? `${selectedFlows.length} Flows` : 'Flow'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
}
