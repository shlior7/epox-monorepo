'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Sun, Palette, Sparkles, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import type {
  PostAdjustments,
  LightAdjustments,
  ColorAdjustments,
  EffectsAdjustments,
} from '@/lib/types/app-types';
import { DEFAULT_POST_ADJUSTMENTS } from '@/lib/types/app-types';
import {
  calculateLuminosityAdjustment,
  contrastToFactor,
  exposureToMultiplier,
} from '@/lib/services/image-processing/adjustment-math';
import styles from './PostAdjustmentsPanel.module.scss';

interface PostAdjustmentsPanelProps {
  adjustments: PostAdjustments;
  onChange: (adjustments: PostAdjustments) => void;
  onApply?: (adjustments: PostAdjustments) => void;
  imageUrl?: string; // For live preview
  showPreview?: boolean;
  compact?: boolean; // Compact mode for settings panel
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
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, step: 1 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1 },
];

const EFFECTS_SLIDERS: SliderConfig[] = [
  { key: 'texture', label: 'Texture', min: -100, max: 100, step: 1 },
  { key: 'clarity', label: 'Clarity', min: -100, max: 100, step: 1 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100, step: 1 },
];

// Generate CSS filter string from adjustments
export function generateFilterString(adjustments: PostAdjustments): string {
  const filters: string[] = [];

  // Light adjustments
  const { exposure, contrast, highlights, shadows, whites, blacks } = adjustments.light;

  // Brightness from exposure (-100 to 100 -> 0.25 to 4.0 for aggressive effect)
  const exposureBrightness = exposure !== 0 ? exposureToMultiplier(exposure) : 1;
  let toneBrightness = 1;
  if (highlights !== 0 || shadows !== 0 || whites !== 0 || blacks !== 0) {
    const toneAdjustment = calculateLuminosityAdjustment(128, { highlights, shadows, whites, blacks });
    toneBrightness = 1 + toneAdjustment / 128;
  }
  const combinedBrightness = exposureBrightness * toneBrightness;
  if (combinedBrightness !== 1) {
    filters.push(`brightness(${combinedBrightness})`);
  }

  // Contrast (-100 to 100 -> 0 to 3 for aggressive effect)
  if (contrast !== 0) {
    const contrastVal = Math.max(0, contrastToFactor(contrast));
    filters.push(`contrast(${contrastVal})`);
  }

  // Color adjustments
  const { temperature, saturation } = adjustments.color;

  // Temperature (sepia for warm, hue-rotate for cool)
  if (temperature > 0) {
    const sepia = temperature / 300;
    filters.push(`sepia(${sepia})`);
  } else if (temperature < 0) {
    const hueShift = temperature / 6; // -16.6 to 0 degrees
    filters.push(`hue-rotate(${hueShift}deg)`);
  }

  // Saturation (-100 to 100 -> 0 to 2)
  if (saturation !== 0) {
    const satVal = 1 + saturation / 100;
    filters.push(`saturate(${satVal})`);
  }

  // Effects adjustments
  const { sharpness } = adjustments.effects;

  // Note: CSS filters don't have direct equivalents for texture, clarity, highlights, shadows, whites, blacks
  // These would need canvas manipulation for full accuracy
  // For now, we approximate some effects

  // Sharpness approximation using contrast
  if (sharpness > 0) {
    const sharpContrast = 1 + sharpness / 450;
    filters.push(`contrast(${sharpContrast})`);
  }

  // Clarity approximation (local contrast) - using contrast
  const { clarity } = adjustments.effects;
  if (clarity !== 0) {
    const clarityContrast = 1 + clarity / 350;
    filters.push(`contrast(${clarityContrast})`);
  }

  // Vibrance approximation (saturate colors without affecting skin tones)
  const { vibrance } = adjustments.color;
  if (vibrance !== 0) {
    const vibranceVal = 1 + vibrance / 150;
    filters.push(`saturate(${vibranceVal})`);
  }

  // Texture approximation - no good CSS equivalent, skip for now

  return filters.join(' ') || 'none';
}

// Check if adjustments have any non-default values
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
  imageUrl,
  showPreview = false,
  compact = false,
}: PostAdjustmentsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<AdjustmentCategory>('light');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image for preview
  useEffect(() => {
    if (showPreview && imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        renderPreview();
      };
      img.src = imageUrl;
    }
  }, [imageUrl, showPreview]);

  // Render preview with current adjustments
  const renderPreview = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.filter = generateFilterString(adjustments);
    ctx.drawImage(img, 0, 0);
  }, [adjustments]);

  useEffect(() => {
    if (showPreview) {
      renderPreview();
    }
  }, [adjustments, showPreview, renderPreview]);

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
      onChange({
        ...adjustments,
        [category]: { ...DEFAULT_POST_ADJUSTMENTS[category] },
      });
    },
    [adjustments, onChange]
  );

  const renderSlider = (
    config: SliderConfig,
    value: number,
    onChangeValue: (value: number) => void
  ) => {
    const isZero = value === 0;
    const percentage = ((value - config.min) / (config.max - config.min)) * 100;

    return (
      <div key={config.key} className={styles.sliderRow}>
        <div className={styles.sliderHeader}>
          <label className={styles.sliderLabel}>{config.label}</label>
          <span className={clsx(styles.sliderValue, { [styles.active]: !isZero })}>
            {value > 0 ? `+${value}` : value}
          </span>
        </div>
        <div className={styles.sliderContainer}>
          <input
            type="range"
            min={config.min}
            max={config.max}
            step={config.step}
            value={value}
            onChange={(e) => onChangeValue(Number(e.target.value))}
            className={styles.slider}
            style={
              {
                '--fill-percentage': `${percentage}%`,
              } as React.CSSProperties
            }
          />
          {config.min < 0 && <div className={styles.sliderCenter} />}
        </div>
      </div>
    );
  };

  const categoryHasChanges = (category: AdjustmentCategory): boolean => {
    return Object.values(adjustments[category]).some((v) => v !== 0);
  };

  return (
    <div className={clsx(styles.panel, { [styles.compact]: compact })}>
      {/* Category Tabs */}
      <div className={styles.categoryTabs}>
        <button
          type="button"
          className={clsx(styles.categoryTab, {
            [styles.active]: activeCategory === 'light',
            [styles.hasChanges]: categoryHasChanges('light'),
          })}
          onClick={() => setActiveCategory('light')}
        >
          <Sun style={{ width: 16, height: 16 }} />
          <span>Light</span>
        </button>
        <button
          type="button"
          className={clsx(styles.categoryTab, {
            [styles.active]: activeCategory === 'color',
            [styles.hasChanges]: categoryHasChanges('color'),
          })}
          onClick={() => setActiveCategory('color')}
        >
          <Palette style={{ width: 16, height: 16 }} />
          <span>Color</span>
        </button>
        <button
          type="button"
          className={clsx(styles.categoryTab, {
            [styles.active]: activeCategory === 'effects',
            [styles.hasChanges]: categoryHasChanges('effects'),
          })}
          onClick={() => setActiveCategory('effects')}
        >
          <Sparkles style={{ width: 16, height: 16 }} />
          <span>Effects</span>
        </button>
      </div>

      {/* Sliders for Active Category */}
      <div className={styles.slidersContainer}>
        {activeCategory === 'light' && (
          <>
            {LIGHT_SLIDERS.map((config) =>
              renderSlider(
                config,
                adjustments.light[config.key as keyof LightAdjustments],
                (value) => handleLightChange(config.key as keyof LightAdjustments, value)
              )
            )}
          </>
        )}

        {activeCategory === 'color' && (
          <>
            {COLOR_SLIDERS.map((config) =>
              renderSlider(
                config,
                adjustments.color[config.key as keyof ColorAdjustments],
                (value) => handleColorChange(config.key as keyof ColorAdjustments, value)
              )
            )}
          </>
        )}

        {activeCategory === 'effects' && (
          <>
            {EFFECTS_SLIDERS.map((config) =>
              renderSlider(
                config,
                adjustments.effects[config.key as keyof EffectsAdjustments],
                (value) => handleEffectsChange(config.key as keyof EffectsAdjustments, value)
              )
            )}
          </>
        )}

        {/* Reset Category Button */}
        {categoryHasChanges(activeCategory) && (
          <button
            type="button"
            className={styles.resetCategoryButton}
            onClick={() => handleResetCategory(activeCategory)}
          >
            <RotateCcw style={{ width: 14, height: 14 }} />
            <span>Reset {activeCategory}</span>
          </button>
        )}
      </div>

      {/* Preview Canvas (when showPreview is true) */}
      {showPreview && imageUrl && (
        <div className={styles.previewContainer}>
          <canvas ref={canvasRef} className={styles.previewCanvas} />
        </div>
      )}

      {/* Action Buttons */}
      {(onApply || hasAdjustments(adjustments)) && (
        <div className={styles.actionButtons}>
          {hasAdjustments(adjustments) && (
            <button type="button" className={styles.resetButton} onClick={handleReset}>
              <RotateCcw style={{ width: 16, height: 16 }} />
              <span>Reset All</span>
            </button>
          )}
          {onApply && hasAdjustments(adjustments) && (
            <button
              type="button"
              className={styles.applyButton}
              onClick={() => onApply(adjustments)}
            >
              Apply Adjustments
            </button>
          )}
        </div>
      )}
    </div>
  );
}
