'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, X, Loader2, Sparkles, Video, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  MinimalAccordion,
  MinimalAccordionItem,
  MinimalAccordionTrigger,
  MinimalAccordionContent,
} from '@/components/ui/minimal-accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import type {
  InspirationImage,
  StylePreset,
  LightingPreset,
  VideoPromptSettings,
  ImageAspectRatio,
} from 'visualizer-types';
import {
  CAMERA_MOTION_OPTIONS,
  STYLE_PRESETS,
  LIGHTING_PRESETS,
  VIDEO_TYPE_OPTIONS,
} from 'visualizer-types';

// Output quality options
const QUALITY_OPTIONS = [
  { value: '1k', label: '1K', description: 'Fast' },
  { value: '2k', label: '2K', description: 'Balanced' },
  { value: '4k', label: '4K', description: 'High Quality' },
] as const;

// Aspect ratio options
const ASPECT_OPTIONS = [
  { value: '1:1', label: '1:1', icon: '◻' },
  { value: '16:9', label: '16:9', icon: '▭' },
  { value: '9:16', label: '9:16', icon: '▯' },
  { value: '4:3', label: '4:3', icon: '▱' },
] as const;

type StudioTab = 'images' | 'video';

export interface OutputSettings {
  aspectRatio: ImageAspectRatio;
  quality: '1k' | '2k' | '4k';
  variantsCount: number;
}

export interface StudioConfigPanelProps {
  // Image settings
  inspirationImages: InspirationImage[];
  onInspirationImagesChange?: (images: InspirationImage[]) => void;
  onAddInspirationClick?: () => void;
  isAnalyzingInspiration?: boolean;
  sceneTypeGroups?: Record<string, number>;
  stylePreset: StylePreset;
  onStylePresetChange: (preset: StylePreset) => void;
  lightingPreset: LightingPreset;
  onLightingPresetChange: (preset: LightingPreset) => void;
  userPrompt: string;
  onUserPromptChange: (prompt: string) => void;
  outputSettings: OutputSettings;
  onOutputSettingsChange: (settings: OutputSettings) => void;

  // Video settings
  videoPrompt: string;
  onVideoPromptChange: (prompt: string) => void;
  videoSettings: VideoPromptSettings;
  onVideoSettingsChange: (settings: VideoPromptSettings) => void;
  onEnhanceVideoPrompt?: () => void;
  isEnhancingVideoPrompt?: boolean;
  canEnhanceVideoPrompt?: boolean;

  // Tab state
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;

  // Generate actions
  onGenerate?: () => void;
  onGenerateVideos?: () => void;
  isGenerating?: boolean;
  readyCount?: number;

  // Optional: Extra content for specific pages (like scene type management)
  sceneTypeManagementContent?: React.ReactNode;

  // Optional: Custom footer content
  footerContent?: React.ReactNode;

  // Optional: Show footer
  showFooter?: boolean;
}

export function StudioConfigPanel({
  // Image settings
  inspirationImages,
  onInspirationImagesChange,
  onAddInspirationClick,
  isAnalyzingInspiration = false,
  sceneTypeGroups = {},
  stylePreset,
  onStylePresetChange,
  lightingPreset,
  onLightingPresetChange,
  userPrompt,
  onUserPromptChange,
  outputSettings,
  onOutputSettingsChange,

  // Video settings
  videoPrompt,
  onVideoPromptChange,
  videoSettings,
  onVideoSettingsChange,
  onEnhanceVideoPrompt,
  isEnhancingVideoPrompt = false,
  canEnhanceVideoPrompt = true,

  // Tab state
  activeTab,
  onTabChange,

  // Generate actions
  onGenerate,
  onGenerateVideos,
  isGenerating = false,
  readyCount = 0,

  // Optional content
  sceneTypeManagementContent,
  footerContent,
  showFooter = true,
}: StudioConfigPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'scene-style',
    'output-settings',
  ]);
  const [videoExpandedSections, setVideoExpandedSections] = useState<string[]>([
    'video-inputs',
    'video-prompt',
  ]);

  const handleRemoveInspiration = (index: number) => {
    if (onInspirationImagesChange) {
      onInspirationImagesChange(inspirationImages.filter((_, i) => i !== index));
    }
  };

  const updateOutputSettings = (updates: Partial<OutputSettings>) => {
    onOutputSettingsChange({ ...outputSettings, ...updates });
  };

  const updateVideoSettings = (updates: Partial<VideoPromptSettings>) => {
    onVideoSettingsChange({ ...videoSettings, ...updates });
  };

  return (
    <aside
      className="flex w-80 shrink-0 flex-col border-r border-border bg-card/30"
      data-testid="config-panel"
    >
      {/* Tab Switcher */}
      <div className="border-b border-border p-3" data-testid={buildTestId('config-panel', 'heading')}>
        <div
          className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1 text-xs font-semibold"
          data-testid={buildTestId('config-panel', 'tabs')}
        >
          <button
            onClick={() => onTabChange('images')}
            className={cn(
              'rounded-md px-2 py-2 transition-colors',
              activeTab === 'images'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            data-testid={buildTestId('config-panel', 'tab', 'images')}
          >
            Images
          </button>
          <button
            onClick={() => onTabChange('video')}
            className={cn(
              'rounded-md px-2 py-2 transition-colors',
              activeTab === 'video'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            data-testid={buildTestId('config-panel', 'tab', 'video')}
          >
            Video
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {activeTab === 'images' ? (
          <MinimalAccordion
            value={expandedSections}
            onValueChange={setExpandedSections}
            defaultValue={['scene-style', 'output-settings']}
          >
            {/* Section 1: Scene Style */}
            <MinimalAccordionItem value="scene-style">
              <MinimalAccordionTrigger
                suffix={
                  inspirationImages.length > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {inspirationImages.length}
                    </Badge>
                  ) : null
                }
              >
                Scene Style
              </MinimalAccordionTrigger>
              <MinimalAccordionContent>
                <div className="space-y-4">
                  {/* Inspiration Images Grid */}
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Inspiration Images</p>
                    <div className="flex flex-wrap gap-2">
                      {inspirationImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-square h-16 w-16 overflow-hidden rounded-lg border"
                        >
                          <Image
                            src={img.url}
                            alt={`Inspiration ${idx + 1}`}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                          <button
                            onClick={() => handleRemoveInspiration(idx)}
                            className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                      {inspirationImages.length < 5 && (
                        <button
                          onClick={onAddInspirationClick}
                          disabled={isAnalyzingInspiration}
                          className="flex aspect-square h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                        >
                          {isAnalyzingInspiration ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detected Scene Types */}
                  {Object.keys(sceneTypeGroups).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">Detected Scene Types</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(sceneTypeGroups).map(([sceneType, count]) => (
                          <Badge key={sceneType} variant="outline" className="text-xs">
                            {sceneType} ({count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Style Preset */}
                  <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Style</p>
                    <Select
                      value={stylePreset}
                      onValueChange={(v) => onStylePresetChange(v as StylePreset)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STYLE_PRESETS.map((preset) => (
                          <SelectItem key={preset} value={preset}>
                            {preset}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lighting Preset */}
                  <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Lighting</p>
                    <Select
                      value={lightingPreset}
                      onValueChange={(v) => onLightingPresetChange(v as LightingPreset)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIGHTING_PRESETS.map((preset) => (
                          <SelectItem key={preset} value={preset}>
                            {preset}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Optional: Scene Types Management (collection-specific) */}
                  {sceneTypeManagementContent}
                </div>
              </MinimalAccordionContent>
            </MinimalAccordionItem>

            {/* Section 2: User Prompt */}
            <MinimalAccordionItem value="user-prompt">
              <MinimalAccordionTrigger
                suffix={
                  userPrompt ? (
                    <Badge variant="secondary" className="text-xs">
                      Custom
                    </Badge>
                  ) : null
                }
              >
                Collection Prompt
              </MinimalAccordionTrigger>
              <MinimalAccordionContent>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a prompt that applies to all products..."
                    value={userPrompt}
                    onChange={(e) => onUserPromptChange(e.target.value)}
                    className="min-h-[80px] resize-none text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    This prompt will be applied to all products in the collection.
                  </p>
                </div>
              </MinimalAccordionContent>
            </MinimalAccordionItem>

            {/* Section 3: Output Settings */}
            <MinimalAccordionItem value="output-settings">
              <MinimalAccordionTrigger>Output Settings</MinimalAccordionTrigger>
              <MinimalAccordionContent>
                <div className="space-y-4">
                  {/* Quality */}
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Quality</p>
                    <div className="flex gap-2">
                      {QUALITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateOutputSettings({ quality: opt.value })}
                          className={cn(
                            'flex flex-1 flex-col items-center rounded-lg border p-2 transition-colors',
                            outputSettings.quality === opt.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <span className="text-sm font-semibold">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {opt.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Aspect Ratio</p>
                    <div className="flex gap-1.5">
                      {ASPECT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateOutputSettings({ aspectRatio: opt.value })}
                          className={cn(
                            'flex flex-1 flex-col items-center rounded-lg border py-2 text-xs transition-colors',
                            outputSettings.aspectRatio === opt.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <span className="mb-0.5 text-base">{opt.icon}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Variants per product */}
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Variants per product: {outputSettings.variantsCount}
                    </p>
                    <div className="flex gap-1">
                      {[1, 2, 4].map((n) => (
                        <button
                          key={n}
                          onClick={() => updateOutputSettings({ variantsCount: n })}
                          className={cn(
                            'flex-1 rounded-md border py-1 text-sm transition-colors',
                            outputSettings.variantsCount === n
                              ? 'border-primary bg-primary/10 font-medium text-primary'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </MinimalAccordionContent>
            </MinimalAccordionItem>
          </MinimalAccordion>
        ) : (
          <MinimalAccordion
            value={videoExpandedSections}
            onValueChange={setVideoExpandedSections}
            defaultValue={['video-inputs', 'video-prompt']}
          >
            {/* Video Section: Prompt */}
            <MinimalAccordionItem value="video-prompt">
              <MinimalAccordionTrigger>Video Prompt</MinimalAccordionTrigger>
              <MinimalAccordionContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Describe the video you want to generate..."
                    value={videoPrompt}
                    onChange={(e) => onVideoPromptChange(e.target.value)}
                    className="min-h-[80px] resize-none text-sm"
                  />
                  {onEnhanceVideoPrompt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEnhanceVideoPrompt}
                      disabled={isEnhancingVideoPrompt || !canEnhanceVideoPrompt}
                      className="w-full"
                    >
                      {isEnhancingVideoPrompt ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Enhancing...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-3.5 w-3.5" />
                          Enhance Prompt
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </MinimalAccordionContent>
            </MinimalAccordionItem>

            {/* Video Section: Settings */}
            <MinimalAccordionItem value="video-settings">
              <MinimalAccordionTrigger>Video Settings</MinimalAccordionTrigger>
              <MinimalAccordionContent>
                <div className="space-y-3">
                  <Select
                    value={videoSettings.videoType ?? ''}
                    onValueChange={(v) => updateVideoSettings({ videoType: v || undefined })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Video type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={videoSettings.cameraMotion ?? ''}
                    onValueChange={(v) => updateVideoSettings({ cameraMotion: v || undefined })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Camera motion" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_MOTION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={videoSettings.sound ?? 'automatic'}
                    onValueChange={(v) =>
                      updateVideoSettings({ sound: v as VideoPromptSettings['sound'] })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sound" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic sound</SelectItem>
                      <SelectItem value="with_music">With music</SelectItem>
                      <SelectItem value="no_sound">No sound</SelectItem>
                      <SelectItem value="custom">Custom sound prompt</SelectItem>
                    </SelectContent>
                  </Select>
                  {videoSettings.sound === 'custom' && (
                    <Input
                      placeholder="Sound prompt..."
                      value={videoSettings.soundPrompt || ''}
                      onChange={(e) => updateVideoSettings({ soundPrompt: e.target.value })}
                    />
                  )}
                </div>
              </MinimalAccordionContent>
            </MinimalAccordionItem>
          </MinimalAccordion>
        )}
      </div>

      {/* Footer - Generate Button */}
      {showFooter && (
        <div className="shrink-0 border-t border-border bg-card p-3">
          {footerContent ? (
            footerContent
          ) : activeTab === 'images' ? (
            <Button
              variant="glow"
              size="lg"
              className="w-full"
              onClick={onGenerate}
              disabled={readyCount === 0 || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate All ({readyCount})
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="glow"
              size="lg"
              className="w-full"
              onClick={onGenerateVideos}
              disabled={readyCount === 0 || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Videos...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Generate Videos ({readyCount})
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
