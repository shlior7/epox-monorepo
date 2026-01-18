'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  X,
  Search,
  Image as ImageIcon,
  Upload,
  Heart,
  Trash2,
  Pencil,
  Loader2,
  ExternalLink,
  ChevronDown,
  Layers,
  Star,
} from 'lucide-react';
import clsx from 'clsx';
import type { Product } from '@/lib/types/app-types';
import * as S3Service from '@/lib/services/s3/browser';
import styles from './SceneStudioView.module.scss';

type TabType = 'generated' | 'uploaded' | 'stock';

interface UnsplashImage {
  id: string;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  alt_description: string;
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
}

interface UploadedScene {
  id: string;
  name: string;
  imageUrl: string;
  uploadedAt: string;
}

interface GeneratedScene {
  id: string;
  imageId: string;
  sessionId: string;
  productId: string;
  productName: string;
  isFavorite: boolean;
  isScene: boolean;
  imageUrl: string;
}

interface SceneLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScene: (sceneImageUrl: string, sceneName?: string) => void;
  currentSceneUrl?: string;
  clientId: string;
  products: Product[];
  uploadedScenes?: UploadedScene[];
  onUploadScene?: (file: File) => Promise<void>;
  onDeleteUploadedScene?: (sceneId: string) => void;
  onToggleFavorite?: (productId: string, imageId: string, sessionId: string) => void;
  onToggleScene?: (productId: string, imageId: string, sessionId: string) => void;
}

// Unsplash search categories for interior design
const UNSPLASH_CATEGORIES = ['All', 'Living Room', 'Bedroom', 'Kitchen', 'Office', 'Outdoor', 'Minimal', 'Luxury', 'Modern', 'Industrial'];

export function SceneLibraryModal({
  isOpen,
  onClose,
  onSelectScene,
  currentSceneUrl,
  clientId,
  products,
  uploadedScenes = [],
  onUploadScene,
  onDeleteUploadedScene,
  onToggleFavorite,
  onToggleScene,
}: SceneLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [unsplashImages, setUnsplashImages] = useState<UnsplashImage[]>([]);
  const [isLoadingUnsplash, setIsLoadingUnsplash] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [scenesExpanded, setScenesExpanded] = useState(true);
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Helper to determine image URL based on whether it's from a product session or client session
  const getGeneratedImageUrl = useCallback(
    (productId: string, sessionId: string, imageId: string, product: Product) => {
      // Check if the sessionId belongs to a product session
      const isProductSession = product.sessions.some((s) => s.id === sessionId);

      if (isProductSession) {
        // Product session path: clients/{clientId}/products/{productId}/sessions/{sessionId}/media/{filename}
        return S3Service.getImageUrl(S3Service.S3Paths.getMediaFilePath(clientId, productId, sessionId, imageId));
      } else {
        // Client session path: clients/{clientId}/sessions/{sessionId}/media/{filename}
        return S3Service.getImageUrl(S3Service.S3Paths.getClientSessionMediaFilePath(clientId, sessionId, imageId));
      }
    },
    [clientId]
  );

  // Gather all generated images from all products' sessions
  // TODO: Implement favorites/scenes using pinned field on generated_asset
  const generatedScenes = useMemo((): GeneratedScene[] => {
    const scenes: GeneratedScene[] = [];
    const seenIds = new Set<string>();

    products.forEach((product) => {
      // Add recent generated images from sessions (last 10 per product)
      product.sessions.forEach((session) => {
        // Get image parts from messages
        const allImageIds: string[] = [];
        session.messages
          .filter((m) => m.role === 'assistant') // Only assistant messages have generated images
          .slice(-5) // Last 5 messages
          .forEach((message) => {
            message.parts.forEach((part) => {
              if (part.type === 'image' && part.imageIds) {
                allImageIds.push(...part.imageIds);
              }
            });
          });

        // Add unique image IDs
        allImageIds.forEach((imageId) => {
          const uniqueKey = `${product.id}-${imageId}`;
          if (!seenIds.has(uniqueKey)) {
            seenIds.add(uniqueKey);
            scenes.push({
              id: uniqueKey,
              imageId,
              sessionId: session.id,
              productId: product.id,
              productName: product.name,
              isFavorite: false, // TODO: Check pinned on generated_asset
              isScene: false, // TODO: Check pinned on generated_asset
              imageUrl: S3Service.getImageUrl(S3Service.S3Paths.getMediaFilePath(clientId, product.id, session.id, imageId)),
            });
          }
        });
      });
    });

    return scenes;
  }, [products, clientId, getGeneratedImageUrl]);

  // Separate scene images (marked as scenes)
  const sceneImages = useMemo(() => {
    return generatedScenes.filter((scene) => scene.isScene);
  }, [generatedScenes]);

  // Group favorites by product
  const favoritesByProduct = useMemo(() => {
    const favorites = generatedScenes.filter((scene) => scene.isFavorite);
    const grouped: Record<string, { productName: string; scenes: GeneratedScene[] }> = {};

    favorites.forEach((scene) => {
      if (!grouped[scene.productId]) {
        grouped[scene.productId] = { productName: scene.productName, scenes: [] };
      }
      grouped[scene.productId].scenes.push(scene);
    });

    return grouped;
  }, [generatedScenes]);

  // Toggle product accordion in favorites
  const toggleProductExpanded = useCallback((productId: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  }, []);

  // Fetch Unsplash images
  const fetchUnsplashImages = useCallback(async (query: string) => {
    setIsLoadingUnsplash(true);
    try {
      const searchTerm = query || 'interior design room';
      const response = await fetch(`/api/unsplash/search?query=${encodeURIComponent(searchTerm)}&per_page=30`);
      if (response.ok) {
        const data = await response.json();
        setUnsplashImages(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch Unsplash images:', error);
    } finally {
      setIsLoadingUnsplash(false);
    }
  }, []);

  // Load initial Unsplash images when stock tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'stock' && unsplashImages.length === 0) {
      const category = selectedCategory === 'All' ? 'interior design room' : `${selectedCategory} interior design`;
      fetchUnsplashImages(category);
    }
  }, [isOpen, activeTab, selectedCategory, unsplashImages.length, fetchUnsplashImages]);

  // Handle category change for Unsplash
  const handleCategoryChange = useCallback(
    (category: string) => {
      setSelectedCategory(category);
      setSearchQuery(''); // Clear search when changing category
      const searchTerm = category === 'All' ? 'interior design room' : `${category} interior design`;
      // Clear images to show loading state
      setUnsplashImages([]);
      fetchUnsplashImages(searchTerm);
    },
    [fetchUnsplashImages]
  );

  // Handle search
  const handleSearch = useCallback(() => {
    if (activeTab === 'stock' && searchQuery) {
      fetchUnsplashImages(searchQuery);
    }
  }, [activeTab, searchQuery, fetchUnsplashImages]);

  // Handle file upload (shared logic)
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file || !onUploadScene) return;
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type:', file.type);
        return;
      }

      setIsUploading(true);
      try {
        await onUploadScene(file);
      } catch (error) {
        console.error('Failed to upload scene:', error);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onUploadScene]
  );

  // Handle file input change
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the dropzone (not entering a child)
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  // Handle paste from clipboard
  useEffect(() => {
    if (!isOpen || activeTab !== 'uploaded') return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileUpload(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, activeTab, handleFileUpload]);

  // Handle selecting a scene
  const handleSelectScene = useCallback(
    (imageUrl: string, name?: string) => {
      onSelectScene(imageUrl, name);
      onClose();
    },
    [onSelectScene, onClose]
  );

  // Handle clearing scene (empty backdrop)
  const handleClearScene = useCallback(() => {
    onSelectScene('', undefined);
    onClose();
  }, [onSelectScene, onClose]);

  // Filter scene images
  const filteredSceneImages = useMemo(() => {
    if (!searchQuery) return sceneImages;
    return sceneImages.filter((scene) => scene.productName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [sceneImages, searchQuery]);

  // Filter favorites by product
  const filteredFavoritesByProduct = useMemo(() => {
    if (!searchQuery) return favoritesByProduct;
    const filtered: Record<string, { productName: string; scenes: GeneratedScene[] }> = {};
    Object.entries(favoritesByProduct).forEach(([productId, data]) => {
      const filteredScenes = data.scenes.filter((scene) => scene.productName.toLowerCase().includes(searchQuery.toLowerCase()));
      if (filteredScenes.length > 0) {
        filtered[productId] = { productName: data.productName, scenes: filteredScenes };
      }
    });
    return filtered;
  }, [favoritesByProduct, searchQuery]);

  // Filter uploaded scenes
  const filteredUploadedScenes = useMemo(() => {
    if (!searchQuery) return uploadedScenes;
    return uploadedScenes.filter((scene) => scene.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [uploadedScenes, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.sceneLibraryModalLarge} onClick={(e) => e.stopPropagation()}>
        {/* Vertical Tabs */}
        <div className={styles.sceneLibraryTabs}>
          <button
            type="button"
            className={clsx(styles.sceneLibraryTab, { [styles.active]: activeTab === 'stock' })}
            onClick={() => setActiveTab('stock')}
          >
            <ImageIcon style={{ width: 18, height: 18 }} />
            <span>Stock</span>
          </button>
          <button
            type="button"
            className={clsx(styles.sceneLibraryTab, { [styles.active]: activeTab === 'generated' })}
            onClick={() => setActiveTab('generated')}
          >
            <Heart style={{ width: 18, height: 18 }} />
            <span>Generated</span>
          </button>
          <button
            type="button"
            className={clsx(styles.sceneLibraryTab, { [styles.active]: activeTab === 'uploaded' })}
            onClick={() => setActiveTab('uploaded')}
          >
            <Upload style={{ width: 18, height: 18 }} />
            <span>Uploaded</span>
          </button>
        </div>

        {/* Main Content */}
        <div className={styles.sceneLibraryContent}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>
              {activeTab === 'stock' && 'Stock Scenes'}
              {activeTab === 'generated' && 'Generated Scenes'}
              {activeTab === 'uploaded' && 'Uploaded Scenes'}
            </h2>
            <button className={styles.iconButton} onClick={onClose} type="button">
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>

          {/* Search and Filters */}
          <div className={styles.sceneLibraryFilters}>
            <div className={styles.searchInputWrapper}>
              <Search style={{ width: 16, height: 16 }} />
              <input
                type="text"
                placeholder={activeTab === 'stock' ? 'Search Unsplash...' : 'Search scenes...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={styles.searchInput}
              />
            </div>

            {/* Category tabs for Stock */}
            {activeTab === 'stock' && (
              <div className={styles.categoryTabs}>
                {UNSPLASH_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={clsx(styles.categoryTab, { [styles.active]: selectedCategory === cat })}
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload dropzone for Uploaded tab - always visible */}
          {activeTab === 'uploaded' && (
            <div
              ref={dropzoneRef}
              className={clsx(styles.uploadDropzone, {
                [styles.dragging]: isDragging,
                [styles.disabled]: !onUploadScene,
              })}
              onClick={() => onUploadScene && fileInputRef.current?.click()}
              onDragEnter={onUploadScene ? handleDragEnter : undefined}
              onDragLeave={onUploadScene ? handleDragLeave : undefined}
              onDragOver={onUploadScene ? handleDragOver : undefined}
              onDrop={onUploadScene ? handleDrop : undefined}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={!onUploadScene}
              />
              {isUploading ? (
                <>
                  <Loader2 className={styles.spinner} style={{ width: 32, height: 32 }} />
                  <span className={styles.dropzoneText}>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload style={{ width: 32, height: 32 }} />
                  <span className={styles.dropzoneText}>{isDragging ? 'Drop image here' : 'Click, drag, or paste an image'}</span>
                  <span className={styles.dropzoneHint}>{onUploadScene ? 'Supports JPG, PNG, WebP' : 'Upload coming soon'}</span>
                </>
              )}
            </div>
          )}

          {/* Empty Backdrop Option */}
          <div className={styles.emptyBackdropOption}>
            <button
              type="button"
              className={clsx(styles.emptyBackdropButton, { [styles.selected]: !currentSceneUrl })}
              onClick={handleClearScene}
            >
              <div className={styles.emptyBackdropIcon}>
                <X style={{ width: 24, height: 24 }} />
              </div>
              <span>No Backdrop (Empty)</span>
            </button>
          </div>

          {/* Scene Grid */}
          <div className={styles.sceneGrid}>
            {/* Stock Tab - Unsplash Images */}
            {activeTab === 'stock' && (
              <>
                {isLoadingUnsplash ? (
                  <div className={styles.loadingState}>
                    <Loader2 className={styles.spinner} style={{ width: 32, height: 32 }} />
                    <p>Loading images from Unsplash...</p>
                  </div>
                ) : unsplashImages.length > 0 ? (
                  unsplashImages.map((image) => (
                    <div
                      key={image.id}
                      className={clsx(styles.sceneCard, { [styles.selected]: currentSceneUrl === image.urls.regular })}
                      onClick={() => handleSelectScene(image.urls.regular, image.alt_description || 'Unsplash Scene')}
                    >
                      <div className={styles.sceneCardImage}>
                        <img src={image.urls.small} alt={image.alt_description || 'Scene'} loading="lazy" />
                      </div>
                      <div className={styles.sceneCardInfo}>
                        <span className={styles.sceneCardName}>{image.alt_description?.slice(0, 30) || 'Scene'}</span>
                        <a
                          href={image.user.links.html}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sceneCardCredit}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Photo by {image.user.name}
                          <ExternalLink style={{ width: 10, height: 10, marginLeft: 4 }} />
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noScenesFound}>
                    <ImageIcon style={{ width: 48, height: 48 }} />
                    <p>No images found. Try a different search.</p>
                  </div>
                )}
              </>
            )}

            {/* Generated Tab */}
            {activeTab === 'generated' && (
              <div className={styles.generatedTabContent}>
                {filteredSceneImages.length === 0 && Object.keys(filteredFavoritesByProduct).length === 0 ? (
                  <div className={styles.noScenesFound}>
                    <Layers style={{ width: 48, height: 48 }} />
                    <p>No generated scenes yet.</p>
                    <p className={styles.noScenesHint}>Generate images in your sessions and add them to scenes or favorites.</p>
                  </div>
                ) : (
                  <>
                    {/* Scenes Accordion */}
                    <div className={styles.accordionSection}>
                      <button type="button" className={styles.accordionHeader} onClick={() => setScenesExpanded(!scenesExpanded)}>
                        <ChevronDown
                          style={{
                            width: 16,
                            height: 16,
                            transform: scenesExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.2s',
                          }}
                        />
                        <Layers style={{ width: 16, height: 16 }} />
                        <span>Scenes</span>
                        <span className={styles.accordionCount}>{filteredSceneImages.length}</span>
                      </button>
                      {scenesExpanded && (
                        <div className={styles.accordionContent}>
                          {filteredSceneImages.length > 0 ? (
                            <div className={styles.sceneGridInner}>
                              {filteredSceneImages.map((scene) => (
                                <div
                                  key={scene.id}
                                  className={clsx(styles.sceneCard, { [styles.selected]: currentSceneUrl === scene.imageUrl })}
                                  onClick={() => handleSelectScene(scene.imageUrl, `Scene - ${scene.productName}`)}
                                >
                                  <div className={styles.sceneCardImage}>
                                    <img src={scene.imageUrl} alt={`Scene from ${scene.productName}`} loading="lazy" />
                                    <div className={styles.sceneCardActions}>
                                      <button
                                        type="button"
                                        className={clsx(styles.sceneCardAction, styles.active)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onToggleScene?.(scene.productId, scene.imageId, scene.sessionId);
                                        }}
                                        title="Remove from scenes"
                                      >
                                        <Layers style={{ width: 14, height: 14 }} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className={styles.sceneCardInfo}>
                                    <span className={styles.sceneCardName}>{scene.productName}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className={styles.emptyAccordion}>No scenes added yet</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Favorites Accordion */}
                    <div className={styles.accordionSection}>
                      <button type="button" className={styles.accordionHeader} onClick={() => setFavoritesExpanded(!favoritesExpanded)}>
                        <ChevronDown
                          style={{
                            width: 16,
                            height: 16,
                            transform: favoritesExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.2s',
                          }}
                        />
                        <Star style={{ width: 16, height: 16 }} />
                        <span>Favorites</span>
                        <span className={styles.accordionCount}>
                          {Object.values(filteredFavoritesByProduct).reduce((sum, data) => sum + data.scenes.length, 0)}
                        </span>
                      </button>
                      {favoritesExpanded && (
                        <div className={styles.accordionContent}>
                          {Object.keys(filteredFavoritesByProduct).length > 0 ? (
                            Object.entries(filteredFavoritesByProduct).map(([productId, data]) => (
                              <div key={productId} className={styles.productAccordion}>
                                <button
                                  type="button"
                                  className={styles.productAccordionHeader}
                                  onClick={() => toggleProductExpanded(productId)}
                                >
                                  <ChevronDown
                                    style={{
                                      width: 14,
                                      height: 14,
                                      transform: expandedProducts[productId] !== false ? 'rotate(0deg)' : 'rotate(-90deg)',
                                      transition: 'transform 0.2s',
                                    }}
                                  />
                                  <span>{data.productName}</span>
                                  <span className={styles.accordionCount}>{data.scenes.length}</span>
                                </button>
                                {expandedProducts[productId] !== false && (
                                  <div className={styles.sceneGridInner}>
                                    {data.scenes.map((scene) => (
                                      <div
                                        key={scene.id}
                                        className={clsx(styles.sceneCard, { [styles.selected]: currentSceneUrl === scene.imageUrl })}
                                        onClick={() => handleSelectScene(scene.imageUrl, `Favorite - ${scene.productName}`)}
                                      >
                                        <div className={styles.sceneCardImage}>
                                          <img src={scene.imageUrl} alt={`Favorite from ${scene.productName}`} loading="lazy" />
                                          <div className={styles.sceneCardActions}>
                                            <button
                                              type="button"
                                              className={clsx(styles.sceneCardAction, styles.active)}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleFavorite?.(scene.productId, scene.imageId, scene.sessionId);
                                              }}
                                              title="Remove from favorites"
                                            >
                                              <Heart style={{ width: 14, height: 14 }} fill="currentColor" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className={styles.sceneCardInfo}>
                                          <span className={styles.sceneCardName}>{scene.productName}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className={styles.emptyAccordion}>No favorites added yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Uploaded Tab */}
            {activeTab === 'uploaded' && (
              <>
                {filteredUploadedScenes.length > 0 ? (
                  filteredUploadedScenes.map((scene) => (
                    <div
                      key={scene.id}
                      className={clsx(styles.sceneCard, { [styles.selected]: currentSceneUrl === scene.imageUrl })}
                      onClick={() => handleSelectScene(scene.imageUrl, scene.name)}
                    >
                      <div className={styles.sceneCardImage}>
                        <img src={scene.imageUrl} alt={scene.name} loading="lazy" />
                        {/* Action buttons */}
                        <div className={styles.sceneCardActions}>
                          <button
                            type="button"
                            className={styles.sceneCardAction}
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement edit functionality
                            }}
                            title="Edit"
                          >
                            <Pencil style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            type="button"
                            className={clsx(styles.sceneCardAction, styles.danger)}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteUploadedScene?.(scene.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </div>
                      <div className={styles.sceneCardInfo}>
                        <span className={styles.sceneCardName}>{scene.name}</span>
                        <span className={styles.sceneCardType}>Uploaded</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noScenesFound}>
                    <Upload style={{ width: 48, height: 48 }} />
                    <p>No uploaded scenes yet.</p>
                    <p className={styles.noScenesHint}>Upload your own backdrop images to use as scenes.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
