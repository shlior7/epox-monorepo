'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Plus,
  Trash2,
  Image as ImageIcon,
  Loader2,
  X,
  Paintbrush,
  Sun,
  Layout,
  Star,
  Bug,
  Copy,
  Pencil,
  MoreVertical,
  Layers,
  ImagePlus,
  ChevronDown,
  ChevronUp,
  Settings,
  Palette,
  MapPin,
  Home,
} from 'lucide-react';
import clsx from 'clsx';
import type { Flow, Product, FlowGenerationSettings, FlowGeneratedImage } from '@/lib/types/app-types';
import * as S3Service from '@/lib/services/s3/browser';
import { generateFilterString, hasAdjustments } from './PostAdjustmentsPanel';
import { BaseImageGalleryPopup } from './BaseImageGalleryPopup';
import styles from './SceneStudioView.module.scss';

// Config tag types that can be dragged
export type ConfigTagType = 'scene' | 'style' | 'lighting' | 'cameraAngle' | 'all';

export interface DraggedConfig {
  type: ConfigTagType;
  value?: string;
  settings: Partial<FlowGenerationSettings>;
  sourceFlowId: string;
}

// Product drag data
export interface DraggedProduct {
  productId: string;
  imageId: string; // The selected base image for this product
  sourceFlowId?: string; // If dragged from an existing flow
}

interface FlowCardProps {
  flow: Flow;
  clientId: string;
  sessionId: string;
  products: Product[];
  hiddenProductIds?: Set<string>; // Products being moved out (optimistic UI)
  isSelected?: boolean;
  onSelect?: (event?: React.MouseEvent) => void;
  onRemoveProduct: (productId: string) => void;
  onExecute: () => void;
  onDelete: () => void;
  onDebug: () => void;
  onSettingsClick?: () => void;
  onHistorySelect?: (index: number) => void;
  onImageClick?: (imageUrl: string) => void;
  onToggleFavorite?: (imageId: string, productId: string) => void;
  isFavorite?: (imageId: string, productId: string) => boolean;
  onToggleScene?: (imageId: string, productId: string) => void;
  isScene?: (imageId: string, productId: string) => boolean;
  onConfigDrop?: (config: DraggedConfig) => void;
  onProductDrop?: (product: DraggedProduct) => void;
  onEditImage?: (imageUrl: string, flowId: string) => void;
  onDeleteImage?: (imageId: string, flowId: string) => void;
  onChangeBaseImage?: (flowId: string, productId: string, newImageId: string) => void;
}

export function FlowCard({
  flow,
  clientId,
  sessionId,
  products,
  hiddenProductIds,
  isSelected,
  onSelect,
  onRemoveProduct,
  onExecute,
  onDelete,
  onDebug,
  onSettingsClick,
  onHistorySelect,
  onImageClick,
  onToggleFavorite,
  isFavorite,
  onToggleScene,
  isScene,
  onConfigDrop,
  onProductDrop,
  onEditImage,
  onDeleteImage,
  onChangeBaseImage,
}: FlowCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [activeProductMenu, setActiveProductMenu] = useState<string | null>(null);
  const [baseImagePopupProduct, setBaseImagePopupProduct] = useState<Product | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const productMenuRef = useRef<HTMLDivElement>(null);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const [tagsOverflow, setTagsOverflow] = useState(false);

  // Check if tags are overflowing
  useEffect(() => {
    const checkOverflow = () => {
      if (tagsContainerRef.current) {
        const { scrollHeight, clientHeight } = tagsContainerRef.current;
        setTagsOverflow(scrollHeight > clientHeight + 4); // small buffer
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [flow.settings]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (imageMenuRef.current && !imageMenuRef.current.contains(event.target as Node)) {
        setShowImageMenu(false);
      }
      if (productMenuRef.current && !productMenuRef.current.contains(event.target as Node)) {
        setActiveProductMenu(null);
      }
    };
    if (showImageMenu || activeProductMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showImageMenu, activeProductMenu]);

  // Filter out products that are being moved (optimistic UI)
  const flowProducts = products.filter((p) => flow.productIds.includes(p.id) && !hiddenProductIds?.has(p.id));
  const hasProducts = flowProducts.length > 0;
  const currentImage = flow.generatedImages[flow.currentImageIndex];
  const canExecute = hasProducts && flow.status !== 'generating';
  const hasHistory = flow.generatedImages.length > 1;
  const isCustomPrompt = Boolean(flow.settings.customPrompt?.trim());

  // Determine product display mode based on count
  const productDisplayMode = useMemo(() => {
    const count = flowProducts.length;
    if (count === 1) return 'single';
    if (count === 2) return 'side-by-side';
    return 'gallery'; // 3+
  }, [flowProducts.length]);

  const getProductImageUrl = (product: Product): string | null => {
    const selectedImageId = flow.selectedBaseImages[product.id];
    const imageId = selectedImageId || product.productImageIds[0];
    if (!imageId) return null;
    return S3Service.getImageUrl(S3Service.S3Paths.getProductImageBasePath(clientId, product.id, imageId));
  };

  const getGeneratedImageUrl = (image: FlowGeneratedImage): string => {
    // Generated images are stored in the client session media folder
    const filename = image.imageFilename ?? image.imageId;
    return S3Service.getImageUrl(S3Service.S3Paths.getClientSessionMediaFilePath(clientId, sessionId, filename));
  };

  // Config drag handlers
  const handleConfigDragStart = (e: React.DragEvent, type: ConfigTagType, settings: Partial<FlowGenerationSettings>, label?: string) => {
    const config: DraggedConfig = {
      type,
      value: label,
      settings,
      sourceFlowId: flow.id,
    };
    e.dataTransfer.setData('application/x-config', JSON.stringify(config));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Product drag handlers
  const handleProductDragStart = (e: React.DragEvent, productId: string, imageId: string) => {
    const productData: DraggedProduct = {
      productId,
      imageId,
      sourceFlowId: flow.id,
    };
    e.dataTransfer.setData('application/x-product', JSON.stringify(productData));
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); // Prevent card click
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Determine what kind of data is being dragged
    if (e.dataTransfer.types.includes('application/x-product')) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set drag over to false if we're leaving the card entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent drop zones
    setIsDragOver(false);

    // Try to handle product drop first
    try {
      const productData = e.dataTransfer.getData('application/x-product');
      if (productData) {
        const product: DraggedProduct = JSON.parse(productData);
        // Don't add if already in this flow, or if dropped on source flow
        if (product.sourceFlowId !== flow.id && !flow.productIds.includes(product.productId) && onProductDrop) {
          onProductDrop(product);
        }
        return;
      }
    } catch (err) {
      console.error('Failed to parse product drag data:', err);
    }

    // Try to handle config drop
    try {
      const configData = e.dataTransfer.getData('application/x-config');
      if (configData) {
        const config: DraggedConfig = JSON.parse(configData);
        // Don't apply to the source flow
        if (config.sourceFlowId !== flow.id && onConfigDrop) {
          onConfigDrop(config);
        }
      }
    } catch (err) {
      console.error('Failed to parse config drag data:', err);
    }
  };

  const renderSettingsTags = () => {
    const tags: { label: string; icon: React.ReactNode; type: ConfigTagType; settings: Partial<FlowGenerationSettings> }[] = [];
    const { settings } = flow;

    // Room Type
    if (settings.sceneType && settings.sceneType !== 'Custom') {
      tags.push({
        label: settings.sceneType,
        icon: <Home />,
        type: 'scene',
        settings: { sceneType: settings.sceneType },
      });
    }

    // Scene/Backdrop
    if (settings.scene && settings.scene !== 'Custom') {
      tags.push({
        label: settings.scene,
        icon: <Layout />,
        type: 'scene',
        settings: { scene: settings.scene, sceneImageUrl: settings.sceneImageUrl, customScene: settings.customScene },
      });
    } else if (settings.customScene) {
      tags.push({
        label: settings.customScene.length > 20 ? settings.customScene.slice(0, 20) + '...' : settings.customScene,
        icon: <Layout />,
        type: 'scene',
        settings: { scene: 'Custom', customScene: settings.customScene, sceneImageUrl: settings.sceneImageUrl },
      });
    }

    // Style
    if (settings.style && settings.style !== 'Custom') {
      tags.push({
        label: settings.style,
        icon: <Paintbrush />,
        type: 'style',
        settings: { style: settings.style, customStyle: settings.customStyle },
      });
    }

    // Lighting
    if (settings.lighting && settings.lighting !== 'Custom') {
      tags.push({
        label: settings.lighting,
        icon: <Sun />,
        type: 'lighting',
        settings: { lighting: settings.lighting, customLighting: settings.customLighting },
      });
    }

    // Surroundings
    if (settings.surroundings && settings.surroundings !== 'Custom') {
      tags.push({
        label: settings.surroundings,
        icon: <MapPin />,
        type: 'scene',
        settings: { surroundings: settings.surroundings },
      });
    }

    // Color Scheme
    if (settings.colorScheme && settings.colorScheme !== 'Custom') {
      tags.push({
        label: settings.colorScheme,
        icon: <Palette />,
        type: 'style',
        settings: { colorScheme: settings.colorScheme },
      });
    }

    // Note: Camera Angle is intentionally excluded from tags

    const hasAnyTags = tags.length > 0;

    return (
      <div className={styles.tagsWrapper}>
        {/* All Config Tag - always first */}
        <button
          className={clsx(styles.settingTag, styles.allConfigTag)}
          type="button"
          draggable
          onDragStart={(e) => handleConfigDragStart(e, 'all', { ...settings })}
          title="Drag to copy all settings"
        >
          <Copy />
          <span>All</span>
        </button>
        {/* Individual setting tags */}
        <div ref={tagsContainerRef} className={clsx(styles.tagsInnerContainer, { [styles.tagsCollapsed]: !tagsExpanded && tagsOverflow })}>
          {tags.map((tag, index) => (
            <button
              key={index}
              className={styles.settingTag}
              onClick={onSettingsClick}
              type="button"
              draggable
              onDragStart={(e) => handleConfigDragStart(e, tag.type, tag.settings, tag.label)}
              title={`Drag to copy ${tag.type} setting`}
            >
              {tag.icon}
              <span>{tag.label}</span>
            </button>
          ))}
        </div>
        {/* Expand/collapse chevron when overflowing */}
        {tagsOverflow && (
          <button
            className={styles.tagsExpandButton}
            onClick={(e) => {
              e.stopPropagation();
              setTagsExpanded(!tagsExpanded);
            }}
            type="button"
            title={tagsExpanded ? 'Show less' : 'Show all tags'}
          >
            {tagsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
        {!hasAnyTags && <span className={styles.noTagsLabel}>No settings configured</span>}
      </div>
    );
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentImage && onImageClick) {
      onImageClick(getGeneratedImageUrl(currentImage));
    }
  };

  // Calculate flow name - use first product name or "Untitled Flow"
  const flowName = flowProducts.length > 0 ? flowProducts.map((p) => p.name).join(', ') : 'Empty Flow';
  const revisionCount = flow.generatedImages.length;

  // Collapsed mode - thin view with just name, revisions, and execute
  if (isCollapsed) {
    return (
      <div
        className={clsx(styles.flowCard, styles.flowCardCollapsed, { [styles.selected]: isSelected, [styles.dragOver]: isDragOver })}
        onClick={(e) => onSelect?.(e)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className={styles.collapsedFlowName}>{flowName}</span>
        {revisionCount > 0 ? (
          <div className={styles.collapsedRevisions}>
            <div className={styles.collapsedRevisionsImages}>
              {flow.generatedImages.map((img) => (
                <img
                  key={img.id}
                  src={getGeneratedImageUrl(img)}
                  alt=""
                  className={styles.collapsedRevisionThumb}
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageClick?.(getGeneratedImageUrl(img));
                  }}
                />
              ))}
            </div>
            <span className={styles.collapsedRevisionsMore}>+{revisionCount}</span>
          </div>
        ) : (
          <div className={styles.collapsedSpacer} />
        )}
        <div className={styles.collapsedActions}>
          <button
            className={styles.executeButton}
            onClick={(e) => {
              e.stopPropagation();
              onExecute();
            }}
            disabled={!canExecute}
            type="button"
            title="Generate"
          >
            {flow.status === 'generating' ? <Loader2 className={styles.spinner} /> : <Play />}
          </button>
        </div>
        {/* Expand toggle button - bottom center */}
        <button
          className={clsx(styles.collapseToggle, styles.collapseToggleVisible)}
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(false);
          }}
          type="button"
          title="Expand flow"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={clsx(styles.flowCard, { [styles.selected]: isSelected, [styles.dragOver]: isDragOver })}
      onClick={(e) => onSelect?.(e)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Product Input Container */}
      <div
        className={clsx(styles.productInputContainer, {
          [styles.hasProducts]: hasProducts,
          [styles.singleProduct]: productDisplayMode === 'single',
          [styles.sideBySide]: productDisplayMode === 'side-by-side',
        })}
      >
        {hasProducts ? (
          <div
            className={clsx(styles.productThumbnails, {
              [styles.singleLayout]: productDisplayMode === 'single',
              [styles.sideBySideLayout]: productDisplayMode === 'side-by-side',
            })}
          >
            {flowProducts.map((product) => {
              const imageUrl = getProductImageUrl(product);
              const selectedImageId = flow.selectedBaseImages[product.id] || product.productImageIds[0];
              const hasMultipleImages = product.productImageIds.length > 1;
              const isMenuOpen = activeProductMenu === product.id;
              return (
                <div
                  key={product.id}
                  className={clsx(styles.productContainer, {
                    [styles.productThumbnailLarge]: productDisplayMode === 'single',
                    [styles.productThumbnailMedium]: productDisplayMode === 'side-by-side',
                  })}
                  draggable
                  onDragStart={(e) => handleProductDragStart(e, product.id, selectedImageId)}
                  title={`Click to preview, drag to move to another flow`}
                >
                  <div className={styles.productName}>{product.name}</div>
                  <div
                    className={styles.productThumbnail}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (imageUrl && onImageClick) {
                        onImageClick(imageUrl);
                      }
                    }}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt={product.name} draggable={false} />
                    ) : (
                      <div className={styles.outputPlaceholder}>
                        <ImageIcon />
                      </div>
                    )}
                    {/* Product actions menu */}
                    <div className={styles.productActionsContainer} ref={isMenuOpen ? productMenuRef : null}>
                      <button
                        className={styles.productMenuButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveProductMenu(isMenuOpen ? null : product.id);
                        }}
                        type="button"
                        aria-label="Product actions"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {isMenuOpen && (
                        <div className={styles.productMenu}>
                          {hasMultipleImages && onChangeBaseImage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveProductMenu(null);
                                setBaseImagePopupProduct(product);
                              }}
                              className={styles.productMenuItem}
                              type="button"
                            >
                              <ImagePlus size={14} />
                              <span>Change base image</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveProductMenu(null);
                              onRemoveProduct(product.id);
                            }}
                            className={clsx(styles.productMenuItem, styles.productMenuItemDanger)}
                            type="button"
                          >
                            <X size={14} />
                            <span>Remove from flow</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {productDisplayMode === 'gallery' && (
              <div
                className={styles.addMoreButton}
                title="Drag products from the side panel"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  border: '1px dashed var(--color-slate-600)',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default',
                }}
              >
                <Plus style={{ width: 20, height: 20, color: 'var(--color-slate-500)' }} />
              </div>
            )}
          </div>
        ) : (
          <div className={styles.addProductsLabel} title="Drag products from the side panel">
            <ImagePlus style={{ width: 24, height: 24 }} />
            <span>Drag products here</span>
          </div>
        )}
      </div>

      {/* Output Preview */}
      <div className={styles.outputPreview} onClick={handleImageClick} style={{ cursor: currentImage ? 'pointer' : 'default' }}>
        {currentImage ? (
          <>
            <img
              src={getGeneratedImageUrl(currentImage)}
              alt="Generated output"
              style={{
                filter: currentImage.settings?.postAdjustments
                  ? generateFilterString(currentImage.settings.postAdjustments)
                  : flow.settings.postAdjustments
                    ? generateFilterString(flow.settings.postAdjustments)
                    : 'none',
              }}
            />
            {/* Hamburger menu for image actions */}
            {flowProducts.length > 0 && (
              <div className={styles.imageMenuContainer} ref={imageMenuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageMenu(!showImageMenu);
                  }}
                  className={styles.imageMenuButton}
                  aria-label="Image actions"
                  type="button"
                >
                  <MoreVertical />
                </button>
                {showImageMenu && (
                  <div className={styles.imageMenu}>
                    {onEditImage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowImageMenu(false);
                          onEditImage(getGeneratedImageUrl(currentImage), flow.id);
                        }}
                        className={styles.imageMenuItem}
                        type="button"
                      >
                        <Pencil style={{ width: 16, height: 16 }} />
                        <span>Edit</span>
                      </button>
                    )}
                    {onToggleFavorite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowImageMenu(false);
                          const targetProductId = flowProducts[0].id;
                          onToggleFavorite(currentImage.imageId, targetProductId);
                        }}
                        className={clsx(styles.imageMenuItem, {
                          [styles.imageMenuItemActive]: isFavorite?.(currentImage.imageId, flowProducts[0].id),
                        })}
                        type="button"
                      >
                        <Star
                          style={{ width: 16, height: 16 }}
                          fill={isFavorite?.(currentImage.imageId, flowProducts[0].id) ? 'currentColor' : 'none'}
                        />
                        <span>{isFavorite?.(currentImage.imageId, flowProducts[0].id) ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                      </button>
                    )}
                    {onToggleScene && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowImageMenu(false);
                          const targetProductId = flowProducts[0].id;
                          onToggleScene(currentImage.imageId, targetProductId);
                        }}
                        className={clsx(styles.imageMenuItem, {
                          [styles.imageMenuItemActive]: isScene?.(currentImage.imageId, flowProducts[0].id),
                        })}
                        type="button"
                      >
                        <Layers style={{ width: 16, height: 16 }} />
                        <span>{isScene?.(currentImage.imageId, flowProducts[0].id) ? 'Remove from Scenes' : 'Add to Scenes'}</span>
                      </button>
                    )}
                    {onDeleteImage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowImageMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className={clsx(styles.imageMenuItem, styles.imageMenuItemDanger)}
                        type="button"
                      >
                        <Trash2 style={{ width: 16, height: 16 }} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {flow.status === 'generating' && (
              <div className={clsx(styles.outputStatus, styles.statusGenerating)}>
                <Loader2 className={styles.spinner} style={{ width: 14, height: 14 }} />
                <span>Generating...</span>
              </div>
            )}
          </>
        ) : flow.status === 'generating' ? (
          <div className={styles.outputPlaceholder}>
            <Loader2 className={styles.spinner} />
            <span>Generating...</span>
          </div>
        ) : flow.status === 'error' ? (
          <div className={clsx(styles.outputPlaceholder, styles.statusError)}>
            <ImageIcon />
            <span>Error</span>
          </div>
        ) : (
          <div className={styles.outputPlaceholder}>
            <ImageIcon />
            <span>No output yet</span>
          </div>
        )}
      </div>

      {/* Flow Configuration */}
      <div className={styles.flowConfig}>
        <div className={styles.settingsTags}>{renderSettingsTags()}</div>
        {flow.settings.promptText && <p className={styles.promptPreview}>{flow.settings.promptText}</p>}

        {/* History Bar */}
        {hasHistory && (
          <div className={styles.historyBar}>
            {flow.generatedImages.map((img, index) => (
              <div
                key={img.id}
                className={clsx(styles.historyThumbnail, { [styles.active]: flow.currentImageIndex === index })}
                onClick={(e) => {
                  e.stopPropagation();
                  onHistorySelect?.(index);
                }}
              >
                <img
                  src={getGeneratedImageUrl(img)}
                  alt={`Revision ${index + 1}`}
                  style={{
                    filter: img.settings?.postAdjustments
                      ? generateFilterString(img.settings.postAdjustments)
                      : flow.settings.postAdjustments
                        ? generateFilterString(flow.settings.postAdjustments)
                        : 'none',
                  }}
                />
              </div>
            ))}
            <span className={styles.historyCount}>{flow.generatedImages.length} revisions</span>
          </div>
        )}
      </div>

      {/* Flow Actions */}
      <div className={styles.flowActions}>
        <button
          className={styles.executeButton}
          onClick={(e) => {
            e.stopPropagation();
            onExecute();
          }}
          disabled={!canExecute}
          type="button"
          title="Generate"
        >
          {flow.status === 'generating' ? <Loader2 className={styles.spinner} /> : <Play />}
        </button>
        <button
          className={styles.deleteFlowButton}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          type="button"
          title="Delete flow"
        >
          <Trash2 />
        </button>
        <button
          className={clsx(styles.debugButton, isCustomPrompt && styles.debugButtonModified)}
          onClick={(e) => {
            e.stopPropagation();
            onDebug();
          }}
          type="button"
          title={isCustomPrompt ? 'Prompt modified using custom prompt' : 'Debug: View prompt & images'}
        >
          <Bug />
        </button>
      </div>

      {/* Collapse toggle button - bottom center */}
      <button
        className={styles.collapseToggle}
        onClick={(e) => {
          e.stopPropagation();
          setIsCollapsed(true);
        }}
        type="button"
        title="Collapse flow"
      >
        <ChevronUp size={14} />
      </button>

      {/* Delete Image Confirmation Modal */}
      {showDeleteConfirm && currentImage && (
        <div
          className={styles.deleteConfirmOverlay}
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(false);
          }}
        >
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <h3>Delete Image</h3>
            <p>Are you sure you want to delete this generated image?</p>
            <div className={styles.deleteConfirmActions}>
              <button
                className={styles.cancelButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.confirmDeleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteImage?.(currentImage.imageId, flow.id);
                  setShowDeleteConfirm(false);
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Base Image Gallery Popup */}
      {baseImagePopupProduct && onChangeBaseImage && (
        <BaseImageGalleryPopup
          isOpen={true}
          onClose={() => setBaseImagePopupProduct(null)}
          product={baseImagePopupProduct}
          clientId={clientId}
          currentImageId={flow.selectedBaseImages[baseImagePopupProduct.id] || baseImagePopupProduct.productImageIds[0]}
          onSelectImage={(imageId) => {
            onChangeBaseImage(flow.id, baseImagePopupProduct.id, imageId);
          }}
        />
      )}
    </div>
  );
}
