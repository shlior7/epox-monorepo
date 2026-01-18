'use client';

import React from 'react';
import { X, Image as ImageIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import clsx from 'clsx';
import type { Flow, FlowGenerationSettings } from '@/lib/types/app-types';
import {
  STYLE_OPTIONS,
  SCENE_TYPES,
  LIGHTING_OPTIONS,
  SURROUNDING_OPTIONS,
  COLOR_SCHEMES,
  PROP_TAGS,
  CAMERA_ANGLES,
  ASPECT_RATIOS,
} from './constants';
import styles from './SceneStudioView.module.scss';

interface FlowSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flow: Flow | null;
  onUpdateSettings: (settings: Partial<FlowGenerationSettings>) => void;
  onOpenSceneLibrary: () => void;
}

export function FlowSettingsDrawer({ isOpen, onClose, flow, onUpdateSettings, onOpenSceneLibrary }: FlowSettingsDrawerProps) {
  if (!flow) return null;

  const { settings } = flow;

  const handleChange = (field: keyof FlowGenerationSettings, value: unknown) => {
    onUpdateSettings({ [field]: value });
  };

  const handlePropToggle = (prop: string) => {
    const currentProps = settings.props || [];
    const newProps = currentProps.includes(prop) ? currentProps.filter((p) => p !== prop) : [...currentProps, prop];
    onUpdateSettings({ props: newProps });
  };

  return (
    <>
      {/* Overlay */}
      <div className={clsx(styles.settingsOverlay, { [styles.open]: isOpen })} onClick={onClose} />

      {/* Drawer */}
      <div className={clsx(styles.settingsDrawer, { [styles.open]: isOpen })}>
        <div className={styles.settingsDrawerHeader}>
          <h3 className={styles.settingsDrawerTitle}>Flow Settings</h3>
          <button className={styles.iconButton} onClick={onClose} type="button">
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div className={styles.settingsDrawerContent}>
          {/* Scene/Backdrop Selector */}
          <div className={styles.settingsSection}>
            <label className={styles.settingsLabel}>
              <ImageIcon style={{ width: 14, height: 14 }} />
              Backdrop Scene
            </label>
            <div className={styles.scenePreviewWithImage} onClick={onOpenSceneLibrary}>
              {settings.sceneImageUrl ? (
                <>
                  <div className={styles.scenePreviewThumbnail}>
                    <img src={settings.sceneImageUrl} alt={settings.scene || 'Scene'} />
                  </div>
                  <div className={styles.scenePreviewInfo}>
                    <span className={styles.scenePreviewText}>{settings.scene || 'Custom Scene'}</span>
                    <span className={styles.scenePreviewAction}>Change</span>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.scenePreviewEmpty}>
                    <X style={{ width: 20, height: 20 }} />
                  </div>
                  <div className={styles.scenePreviewInfo}>
                    <span className={styles.scenePreviewPlaceholder}>No backdrop (empty)</span>
                    <span className={styles.scenePreviewAction}>Select scene</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Variety Level Slider */}
          <div className={styles.settingsSection}>
            <div className={styles.settingsLabelRow}>
              <label className={styles.settingsLabel}>Interpretation Variety</label>
              <span className={styles.settingsValue}>{settings.varietyLevel}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={settings.varietyLevel}
              onChange={(e) => handleChange('varietyLevel', Number(e.target.value))}
              className={styles.rangeSlider}
            />
          </div>

          {/* Toggle Options */}
          <div className={styles.toggleGrid}>
            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Match Colors</span>
              <button
                type="button"
                onClick={() => handleChange('matchProductColors', !settings.matchProductColors)}
                className={styles.toggleButton}
              >
                {settings.matchProductColors ? (
                  <ToggleRight style={{ width: 24, height: 24, color: 'var(--color-indigo-500)' }} />
                ) : (
                  <ToggleLeft style={{ width: 24, height: 24, color: 'var(--color-slate-500)' }} />
                )}
              </button>
            </div>
            <div className={styles.toggleItem}>
              <span className={styles.toggleLabel}>Accessories</span>
              <button
                type="button"
                onClick={() => handleChange('includeAccessories', !settings.includeAccessories)}
                className={styles.toggleButton}
              >
                {settings.includeAccessories ? (
                  <ToggleRight style={{ width: 24, height: 24, color: 'var(--color-indigo-500)' }} />
                ) : (
                  <ToggleLeft style={{ width: 24, height: 24, color: 'var(--color-slate-500)' }} />
                )}
              </button>
            </div>
          </div>

          {/* Room Type */}
          <div className={styles.settingsSection}>
            <label className={styles.settingsLabel}>Room Type</label>
            <select
              value={settings.sceneType}
              onChange={(e) => handleChange('sceneType', e.target.value)}
              className={styles.settingsSelect}
            >
              {SCENE_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Style */}
          <div className={styles.settingsSection}>
            <label className={styles.settingsLabel}>Aesthetic Style</label>
            <select value={settings.style} onChange={(e) => handleChange('style', e.target.value)} className={styles.settingsSelect}>
              {STYLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Lighting */}
          <div className={styles.settingsSection}>
            <label className={styles.settingsLabel}>Lighting</label>
            <select
              value={settings.lighting}
              onChange={(e) => handleChange('lighting', e.target.value)}
              className={styles.settingsSelect}
            >
              {LIGHTING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Camera Angle */}
          <div className={styles.settingsSection}>
            <label className={styles.settingsLabel}>Camera Angle</label>
            <select
              value={settings.cameraAngle}
              onChange={(e) => handleChange('cameraAngle', e.target.value)}
              className={styles.settingsSelect}
            >
              {CAMERA_ANGLES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Surroundings */}
          <div className={styles.settingsSection}>
            <label className={styles.settingsLabel}>Surroundings</label>
            <select
              value={settings.surroundings}
              onChange={(e) => handleChange('surroundings', e.target.value)}
              className={styles.settingsSelect}
            >
              {SURROUNDING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Color Scheme */}
          <div className={styles.settingsSection}>
            <label className={styles.settingsLabel}>Color Palette</label>
            <select
              value={settings.colorScheme}
              onChange={(e) => handleChange('colorScheme', e.target.value)}
              className={styles.settingsSelect}
            >
              {COLOR_SCHEMES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Props/Tags */}
          <div className={styles.settingsSection}>
            <label className={styles.settingsLabel}>Staging Elements</label>
            <div className={styles.propTags}>
              {PROP_TAGS.map((tag) => {
                const isActive = settings.props?.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handlePropToggle(tag)}
                    className={clsx(styles.propTag, { [styles.active]: isActive })}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className={styles.settingsSection}>
            <label className={styles.settingsLabel}>Aspect Ratio</label>
            <div className={styles.aspectRatioGrid}>
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => handleChange('aspectRatio', ratio)}
                  className={clsx(styles.aspectRatioButton, { [styles.active]: settings.aspectRatio === ratio })}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className={styles.settingsSection}>
            <label className={styles.settingsLabel}>Custom Instructions</label>
            <textarea
              value={settings.promptText || ''}
              onChange={(e) => handleChange('promptText', e.target.value)}
              placeholder="e.g., emphasize the oak grain texture, add warm afternoon lighting..."
              className={styles.settingsTextarea}
            />
          </div>
        </div>
      </div>
    </>
  );
}
