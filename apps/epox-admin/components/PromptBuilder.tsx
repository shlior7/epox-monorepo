'use client';

/**
 * PromptBuilder - Right sidebar for configuring prompt settings
 * Now with responsive design, collapse/expand functionality, and SCSS modules
 */

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import type { PromptSettings, Product } from '@/lib/types/app-types';
import { colors } from '@/lib/styles/common-styles';
import * as S3Service from '@/lib/services/s3/browser';
import { buildTestId } from '@/lib/utils/test-ids';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './PromptBuilder.module.scss';

const SCENE_OPTIONS = [
  'Studio Set',
  'Office',
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Outdoor Patio',
  'Rooftop Terrace',
  'Garden',
  'Poolside Deck',
  'Beach',
  'Custom',
];

const STYLE_OPTIONS = [
  'Modern Minimalist',
  'Luxury / Premium',
  'Rustic / Natural',
  'Scandinavian',
  'Industrial Loft',
  'Futuristic / Tech',
  'Bohemian Chic',
  'Coastal / Mediterranean',
  'Vintage / Retro',
  'Artistic Conceptual',
  'Custom',
];

const LIGHTING_OPTIONS = [
  'Natural Daylight',
  'Golden Hour / Sunset Glow',
  'Studio Soft Light',
  'Bright Noon Sunlight',
  'Overcast Ambient',
  'Neon / LED Accent',
  'Candlelight / Warm Interior',
  'HDRI Environmental Light',
  'Custom',
];

const SURROUNDINGS_OPTIONS = [
  'Minimal (No Props)',
  'Office Decor',
  'Outdoor Patio Props',
  'Bedroom Setup',
  'Poolside Accessories',
  'Café Ambiance',
  'With Many Props',
  'Custom',
];

const ASPECT_RATIO_OPTIONS = ['1:1 (Square)', '3:2 (Classic)', '16:9 (Widescreen)', '9:16 (Portrait)', '4:5 (Instagram)'];

interface PromptBuilderProps {
  settings: PromptSettings;
  onChange: (settings: PromptSettings) => void;
  // Single product mode
  product?: Product;
  selectedImageId?: string | null;
  onSelectedImageIdChange?: (id: string) => void;
  // Multi-product mode (client sessions)
  products?: Product[];
  selectedBaseImages?: { [productId: string]: string };
  onSelectedBaseImagesChange?: (selectedImages: { [productId: string]: string }) => void;
  // Common
  showHeader?: boolean;
  onImageClick?: (imageUrl: string, imageId: string) => void;
  isClientSession?: boolean; // Flag to indicate client session mode (disables variants)
  isCollapsible?: boolean; // Enable collapse on mobile/tablet
  // Controlled collapsed state (optional)
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function PromptBuilder({
  settings,
  onChange,
  product,
  selectedImageId,
  onSelectedImageIdChange,
  products,
  selectedBaseImages,
  onSelectedBaseImagesChange,
  showHeader = true,
  onImageClick,
  isClientSession = false,
  isCollapsible = true,
  isCollapsed: controlledIsCollapsed,
  onCollapsedChange,
}: PromptBuilderProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(true); // Start collapsed on mobile
  const [isMobile, setIsMobile] = useState(false);

  // Use controlled collapsed state if provided, otherwise use internal state
  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(isCollapsed) : value;
    if (onCollapsedChange) {
      onCollapsedChange(newValue);
    } else {
      setInternalIsCollapsed(newValue);
    }
  };

  // Check if mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isMultiProductMode = products && products.length > 0;

  // Debug logging for multi-product mode
  React.useEffect(() => {
    if (isMultiProductMode && products) {
      console.log('🖼️ PromptBuilder Multi-Product Mode:', {
        productsCount: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          imageCount: p.productImageIds?.length || 0,
          imageIds: p.productImageIds,
        })),
        selectedBaseImages,
      });
    }
  }, [isMultiProductMode, products, selectedBaseImages]);

  // Debug logging for single-product mode
  React.useEffect(() => {
    if (!isMultiProductMode && product) {
      console.log('🖼️ PromptBuilder Single-Product Mode:', {
        productId: product.id,
        name: product.name,
        imageCount: product.productImageIds?.length || 0,
        imageIds: product.productImageIds,
        selectedImageId,
      });
    }
  }, [isMultiProductMode, product, selectedImageId]);

  const updateSetting = <K extends keyof PromptSettings>(key: K, value: PromptSettings[K]) => {
    // Force numberOfVariants to 1 in client session mode
    if (key === 'numberOfVariants' && isClientSession) {
      onChange({ ...settings, [key]: 1 });
      return;
    }
    onChange({ ...settings, [key]: value });
  };

  const toggleProductExpanded = (productId: string) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleMultiProductImageSelect = (productId: string, imageId: string) => {
    if (onSelectedBaseImagesChange && selectedBaseImages) {
      onSelectedBaseImagesChange({
        ...selectedBaseImages,
        [productId]: imageId,
      });
    }
  };

  // Compute sidebar classes based on state
  const sidebarClassName = showHeader
    ? clsx(styles.sidebar, {
        [styles.mobile]: isMobile,
        [styles.collapsed]: isCollapsed && isCollapsible,
      })
    : styles.drawerMode;

  // When showHeader=false (drawer mode), no padding (drawer provides padding)
  const contentClassName = showHeader ? styles.content : clsx(styles.content, styles.noPadding);

  return (
    <>
      {/* Backdrop for mobile when expanded */}
      {isMobile && !isCollapsed && isCollapsible && (
        <div
          className={styles.backdrop}
          onClick={() => setIsCollapsed(true)}
          aria-label="Close sidebar"
          data-testid={buildTestId('prompt-builder', 'backdrop')}
        />
      )}

      <aside className={sidebarClassName}>
        {showHeader && (
          <div className={styles.header}>
            <h2 className={styles.title}>Prompt Builder</h2>
            {isMobile && !isCollapsed && (
              <button
                className={styles.closeButton}
                onClick={() => setIsCollapsed(true)}
                aria-label="Close prompt builder"
                data-testid={buildTestId('prompt-builder', 'close-button')}
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div className={contentClassName}>
          {/* Base Image Selection - Single Product Mode */}
          {!isMultiProductMode && product && product.productImageIds && product.productImageIds.length > 0 && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Base Image</label>
              <div className={styles.imageGrid}>
                {product.productImageIds.map((imageId) => {
                  // Use JPEG preview for UI display (smaller file size)
                  const imageUrl = S3Service.getPreviewImageUrl(product.clientId, product.id, imageId);
                  const isSelected = selectedImageId === imageId;
                  return (
                    <div
                      key={imageId}
                      className={clsx(styles.imageContainer, {
                        [styles.selected]: isSelected,
                      })}
                      data-testid={buildTestId('prompt-builder', 'base-image', product.id, imageId)}
                      onClick={() => {
                        // Select image
                        console.log('🖼️ Base image selected in PromptBuilder:', {
                          imageId,
                          productId: product.id,
                          previousSelection: selectedImageId,
                        });
                        onSelectedImageIdChange?.(imageId);
                      }}
                      onDoubleClick={() => {
                        // Double click - open modal for full view
                        onImageClick?.(imageUrl, imageId);
                      }}
                    >
                      <img src={imageUrl} alt={product.name} className={styles.image} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Base Image Selection - Multi-Product Mode (Accordion) */}
          {isMultiProductMode && products && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Base Images by Product</label>
              <div style={{ marginTop: '12px' }}>
                {products.map((prod) => {
                  const isExpanded = expandedProducts.has(prod.id);
                  const selectedImage = selectedBaseImages?.[prod.id];
                  const hasMultipleImages = prod.productImageIds && prod.productImageIds.length > 1;

                  return (
                    <div key={prod.id} className={styles.accordionItem}>
                      <div
                        className={styles.accordionHeader}
                        onClick={() => toggleProductExpanded(prod.id)}
                        data-testid={buildTestId('prompt-builder', 'toggle-product', prod.id)}
                      >
                        <div className={styles.accordionTitle}>
                          {prod.name}
                          {selectedImage && (
                            <span style={{ marginLeft: '8px', color: colors.green[500], fontSize: '12px' }}>✓ Selected</span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronDown style={{ width: '16px', height: '16px', color: colors.slate[400] }} />
                        ) : (
                          <ChevronRight style={{ width: '16px', height: '16px', color: colors.slate[400] }} />
                        )}
                      </div>
                      {isExpanded && (
                        <div className={styles.accordionContent}>
                          {!hasMultipleImages ? (
                            <div style={{ padding: '8px', fontSize: '13px', color: colors.slate[400] }}>Only one image available</div>
                          ) : (
                            <div className={styles.imageGrid}>
                              {prod.productImageIds!.map((imageId) => {
                                const imageUrl = S3Service.getPreviewImageUrl(prod.clientId, prod.id, imageId);
                                const isSelected = selectedImage === imageId;
                                return (
                                  <div
                                    key={imageId}
                                    className={clsx(styles.imageContainer, {
                                      [styles.selected]: isSelected,
                                    })}
                                    data-testid={buildTestId('prompt-builder', 'base-image', prod.id, imageId)}
                                    onClick={() => {
                                      handleMultiProductImageSelect(prod.id, imageId);
                                    }}
                                    onDoubleClick={() => {
                                      onImageClick?.(imageUrl, imageId);
                                    }}
                                  >
                                    <img src={imageUrl} alt={prod.name} className={styles.image} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scene */}
          <div className={styles.formGroup}>
            <label htmlFor="scene" className={styles.label}>
              Scene
            </label>
            <select
              id="scene"
              value={settings.scene}
              onChange={(e) => updateSetting('scene', e.target.value)}
              className={styles.select}
              data-testid={buildTestId('prompt-builder', 'scene-select')}
            >
              {SCENE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {settings.scene === 'Custom' && (
              <input
                type="text"
                value={settings.customScene || ''}
                onChange={(e) => updateSetting('customScene', e.target.value)}
                placeholder="Describe your custom scene..."
                className={clsx(styles.input, styles.customInput)}
                data-testid={buildTestId('prompt-builder', 'scene-custom-input')}
              />
            )}
          </div>

          {/* Style */}
          <div className={styles.formGroup}>
            <label htmlFor="style" className={styles.label}>
              Style
            </label>
            <select
              id="style"
              value={settings.style}
              onChange={(e) => updateSetting('style', e.target.value)}
              className={styles.select}
              data-testid={buildTestId('prompt-builder', 'style-select')}
            >
              {STYLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {settings.style === 'Custom' && (
              <input
                type="text"
                value={settings.customStyle || ''}
                onChange={(e) => updateSetting('customStyle', e.target.value)}
                placeholder="Describe your custom style..."
                className={clsx(styles.input, styles.customInput)}
                data-testid={buildTestId('prompt-builder', 'style-custom-input')}
              />
            )}
          </div>

          {/* Lighting */}
          <div className={styles.formGroup}>
            <label htmlFor="lighting" className={styles.label}>
              Lighting
            </label>
            <select
              id="lighting"
              value={settings.lighting}
              onChange={(e) => updateSetting('lighting', e.target.value)}
              className={styles.select}
              data-testid={buildTestId('prompt-builder', 'lighting-select')}
            >
              {LIGHTING_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {settings.lighting === 'Custom' && (
              <input
                type="text"
                value={settings.customLighting || ''}
                onChange={(e) => updateSetting('customLighting', e.target.value)}
                placeholder="Describe your custom lighting..."
                className={clsx(styles.input, styles.customInput)}
                data-testid={buildTestId('prompt-builder', 'lighting-custom-input')}
              />
            )}
          </div>

          {/* Surroundings */}
          <div className={styles.formGroup}>
            <label htmlFor="surroundings" className={styles.label}>
              Surroundings
            </label>
            <select
              id="surroundings"
              value={settings.surroundings}
              onChange={(e) => updateSetting('surroundings', e.target.value)}
              className={styles.select}
              data-testid={buildTestId('prompt-builder', 'surroundings-select')}
            >
              {SURROUNDINGS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {settings.surroundings === 'Custom' && (
              <input
                type="text"
                value={settings.customSurroundings || ''}
                onChange={(e) => updateSetting('customSurroundings', e.target.value)}
                placeholder="Describe your custom surroundings..."
                className={clsx(styles.input, styles.customInput)}
                data-testid={buildTestId('prompt-builder', 'surroundings-custom-input')}
              />
            )}
          </div>

          {/* Output Settings Section */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Output Settings</div>

            {/* Aspect Ratio */}
            <div className={styles.formGroup}>
              <label htmlFor="aspectRatio" className={styles.label}>
                Aspect Ratio
              </label>
              <select
                id="aspectRatio"
                value={settings.aspectRatio}
                onChange={(e) => updateSetting('aspectRatio', e.target.value)}
                className={styles.select}
                data-testid={buildTestId('prompt-builder', 'aspect-ratio-select')}
              >
                {ASPECT_RATIO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Number of Variants - Hidden in client session mode */}
            {!isClientSession && (
              <div className={styles.formGroup}>
                <label htmlFor="variants" className={styles.label}>
                  Number of Variants
                </label>
                <input
                  type="number"
                  id="variants"
                  min={1}
                  max={4}
                  value={settings.numberOfVariants}
                  onChange={(e) => updateSetting('numberOfVariants', parseInt(e.target.value, 10) || 1)}
                  className={styles.input}
                  data-testid={buildTestId('prompt-builder', 'variants-input')}
                />
                <div className={styles.helpText}>Generate 1-4 variations per request</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
