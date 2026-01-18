'use client';

import { useState, useCallback } from 'react';
import { Sun, Palette, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type {
  PostAdjustments,
  LightAdjustments,
  ColorAdjustments,
  EffectsAdjustments,
} from '@/lib/types';
import { DEFAULT_POST_ADJUSTMENTS } from '@/lib/types';

interface PostAdjustmentsPanelProps {
  adjustments: PostAdjustments;
  onChange: (adjustments: PostAdjustments) => void;
  onApply?: (adjustments: PostAdjustments) => void;
  compact?: boolean;
}

type AdjustmentCategory = 'light' | 'color' | 'effects';

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

const LIGHT_SLIDERS: SliderConfig[] = [
  { key: 'exposure', label: 'Exposure', min: -100, max: 100, step: 1 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1 },
  { key: 'whites', label: 'Whites', min: -100, max: 100, step: 1 },
  { key: 'blacks', label: 'Blacks', min: -100, max: 100, step: 1 },
];

const COLOR_SLIDERS: SliderConfig[] = [
  { key: 'temperature', label: 'Temperature', min: -100, max: 100, step: 1 },
  { key: 'tint', label: 'Tint', min: -100, max: 100, step: 1 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1 },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, step: 1 },
];

const EFFECTS_SLIDERS: SliderConfig[] = [
  { key: 'clarity', label: 'Clarity', min: -100, max: 100, step: 1 },
  { key: 'texture', label: 'Texture', min: -100, max: 100, step: 1 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100, step: 1 },
];

// Generate CSS filter string from adjustments
export function generateFilterString(adjustments: PostAdjustments): string {
  const filters: string[] = [];

  // Light adjustments
  const { exposure, contrast } = adjustments.light;

  // Brightness from exposure
  if (exposure !== 0) {
    const brightness = 1 + exposure / 100;
    filters.push(`brightness(${brightness})`);
  }

  // Contrast
  if (contrast !== 0) {
    const contrastVal = 1 + contrast / 100;
    filters.push(`contrast(${contrastVal})`);
  }

  // Color adjustments
  const { temperature, saturation } = adjustments.color;

  // Temperature (sepia for warm, hue-rotate for cool)
  if (temperature > 0) {
    const sepia = temperature / 300;
    filters.push(`sepia(${sepia})`);
  } else if (temperature < 0) {
    const hueShift = temperature / 6;
    filters.push(`hue-rotate(${hueShift}deg)`);
  }

  // Saturation
  if (saturation !== 0) {
    const satVal = 1 + saturation / 100;
    filters.push(`saturate(${satVal})`);
  }

  return filters.length > 0 ? filters.join(' ') : 'none';
}

export function hasAdjustments(adjustments: PostAdjustments): boolean {
  const { light, color, effects } = adjustments;
  return (
    Object.values(light).some((v) => v !== 0) ||
    Object.values(color).some((v) => v !== 0) ||
    Object.values(effects).some((v) => v !== 0)
  );
}

export function PostAdjustmentsPanel({
  adjustments,
  onChange,
  onApply,
  compact = false,
}: PostAdjustmentsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<AdjustmentCategory>('light');

  const handleLightChange = useCallback(
    (key: keyof LightAdjustments, value: number) => {
      onChange({
        ...adjustments,
        light: { ...adjustments.light, [key]: value },
      });
    },
    [adjustments, onChange]
  );

  const handleColorChange = useCallback(
    (key: keyof ColorAdjustments, value: number) => {
      onChange({
        ...adjustments,
        color: { ...adjustments.color, [key]: value },
      });
    },
    [adjustments, onChange]
  );

  const handleEffectsChange = useCallback(
    (key: keyof EffectsAdjustments, value: number) => {
      onChange({
        ...adjustments,
        effects: { ...adjustments.effects, [key]: value },
      });
    },
    [adjustments, onChange]
  );

  const handleReset = useCallback(() => {
    onChange({ ...DEFAULT_POST_ADJUSTMENTS });
  }, [onChange]);

  const handleResetCategory = useCallback(
    (category: AdjustmentCategory) => {
      switch (category) {
        case 'light':
          onChange({ ...adjustments, light: { ...DEFAULT_POST_ADJUSTMENTS.light } });
          break;
        case 'color':
          onChange({ ...adjustments, color: { ...DEFAULT_POST_ADJUSTMENTS.color } });
          break;
        case 'effects':
          onChange({ ...adjustments, effects: { ...DEFAULT_POST_ADJUSTMENTS.effects } });
          break;
      }
    },
    [adjustments, onChange]
  );

  const categoryHasChanges = (category: AdjustmentCategory) => {
    switch (category) {
      case 'light':
        return Object.values(adjustments.light).some((v) => v !== 0);
      case 'color':
        return Object.values(adjustments.color).some((v) => v !== 0);
      case 'effects':
        return Object.values(adjustments.effects).some((v) => v !== 0);
    }
  };

  const renderSlider = (
    config: SliderConfig,
    value: number,
    onSliderChange: (value: number) => void
  ) => (
    <div key={config.key} className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{config.label}</label>
        <span className="font-mono text-xs text-foreground">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={config.min}
        max={config.max}
        step={config.step}
        onValueChange={(v: number[]) => onSliderChange(v[0])}
        className="w-full"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setActiveCategory('light')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
            activeCategory === 'light'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Sun className="h-4 w-4" />
          <span className={compact ? 'hidden' : ''}>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('color')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
            activeCategory === 'color'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Palette className="h-4 w-4" />
          <span className={compact ? 'hidden' : ''}>Color</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('effects')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
            activeCategory === 'effects'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Sparkles className="h-4 w-4" />
          <span className={compact ? 'hidden' : ''}>Effects</span>
        </button>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        {activeCategory === 'light' &&
          LIGHT_SLIDERS.map((config) =>
            renderSlider(config, adjustments.light[config.key as keyof LightAdjustments], (value) =>
              handleLightChange(config.key as keyof LightAdjustments, value)
            )
          )}

        {activeCategory === 'color' &&
          COLOR_SLIDERS.map((config) =>
            renderSlider(config, adjustments.color[config.key as keyof ColorAdjustments], (value) =>
              handleColorChange(config.key as keyof ColorAdjustments, value)
            )
          )}

        {activeCategory === 'effects' &&
          EFFECTS_SLIDERS.map((config) =>
            renderSlider(
              config,
              adjustments.effects[config.key as keyof EffectsAdjustments],
              (value) => handleEffectsChange(config.key as keyof EffectsAdjustments, value)
            )
          )}
      </div>

      {/* Reset Button */}
      {categoryHasChanges(activeCategory) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleResetCategory(activeCategory)}
          className="w-full"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset {activeCategory}
        </Button>
      )}

      {/* Apply Button */}
      {onApply && hasAdjustments(adjustments) && (
        <Button variant="glow" className="w-full" onClick={() => onApply(adjustments)}>
          Apply Adjustments
        </Button>
      )}

      {/* Reset All */}
      {hasAdjustments(adjustments) && (
        <Button variant="outline" size="sm" onClick={handleReset} className="w-full">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset All
        </Button>
      )}
    </div>
  );
}
