'use client';

/**
 * Scene Studio Page
 * Route: /[clientId]/scene-studio
 *
 * A workspace for generating AI-powered product scenes with full configuration control.
 * Implements the SceneGen Studio design pattern with:
 * - Product catalog (left drawer)
 * - Workspace with output slots (center)
 * - Properties panel (right drawer)
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useData } from '@/lib/contexts/DataContext';
import {
  Plus,
  Play,
  Image as ImageIcon,
  Zap,
  Upload,
  X,
  Layers,
  Loader2,
  Maximize2,
  Menu,
  Settings2,
  ImagePlus,
  ToggleLeft,
  ToggleRight,
  Download,
} from 'lucide-react';
import {
  SCENE_TYPES,
  STYLE_OPTIONS,
  LIGHTING_OPTIONS,
  CAMERA_ANGLES,
  PROP_TAGS,
  ASPECT_RATIOS,
  SURROUNDING_OPTIONS,
  COLOR_SCHEMES,
  STOCK_SCENES,
  cloneDefaultSceneSettings,
} from '@/lib/constants/scene-studio';
import { Product, Scene, SlotStatus, SceneGenerationSettings, OutputSlotConfig, GeneratedSceneImage } from '@/lib/types/app-types';
import styles from './page.module.scss';

export default function SceneStudioPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const studioId = params.studioId as string;
  const { clients, isLoading } = useData();

  const client = clients.find((c) => c.id === clientId);
  const studio = client?.sceneStudios?.find((s) => s.id === studioId);
  const products = client?.products || [];

  // State
  const [rows, setRows] = useState<OutputSlotConfig[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Drawer States
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(true);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(true);

  // Modals
  const [showSceneLibrary, setShowSceneLibrary] = useState(false);
  const [bigPreviewUrl, setBigPreviewUrl] = useState<string | null>(null);

  // Drag state
  const [isDraggingOverWorkspace, setIsDraggingOverWorkspace] = useState(false);

  const allScenes = useMemo(() => {
    const userScenes = studio?.userScenes || [];
    return [...STOCK_SCENES, ...userScenes];
  }, [studio?.userScenes]);

  // Load studio state on mount
  useEffect(() => {
    if (studio?.outputSlots) {
      setRows(studio.outputSlots);
    }
  }, [studio?.id]); // Only reload when studio ID changes

  // Auto-select first row
  useEffect(() => {
    if (rows.length > 0 && selectedRowIds.size === 0) {
      setSelectedRowIds(new Set([rows[0].id]));
    }
  }, [rows.length, selectedRowIds.size]);

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBigPreviewUrl(null);
        setShowSceneLibrary(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Check if loading or not found
  useEffect(() => {
    if (!isLoading && !client) {
      notFound();
    }
  }, [isLoading, client]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading Scene Studio...</div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  // Add new output slot
  const addRow = (productIds: string[] = []) => {
    const settings = cloneDefaultSceneSettings();

    const newRow: OutputSlotConfig = {
      id: Math.random().toString(36).substr(2, 9),
      productIds,
      status: SlotStatus.EMPTY,
      history: [],
      settings,
    };

    setRows((prev) => [...prev, newRow]);
    setSelectedRowIds(new Set([newRow.id]));
  };

  // Toggle row selection
  const toggleRowSelection = (id: string, e: React.MouseEvent) => {
    const isMultiKey = e.shiftKey || e.metaKey || e.ctrlKey;
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (isMultiKey) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  // Update selected rows
  const updateSelectedRows = (updates: Partial<SceneGenerationSettings>) => {
    setRows((prev) => prev.map((row) => (selectedRowIds.has(row.id) ? { ...row, settings: { ...row.settings, ...updates } } : row)));
  };

  // Get mixed value for multi-selection
  const getMixedValue = <K extends keyof SceneGenerationSettings>(field: K): SceneGenerationSettings[K] | 'Mixed' | '' => {
    const selected = rows.filter((r) => selectedRowIds.has(r.id));
    if (selected.length === 0) return '' as any;
    const firstValue = selected[0].settings[field];
    const isMixed = selected.some((r) => JSON.stringify(r.settings[field]) !== JSON.stringify(firstValue));
    return (isMixed ? 'Mixed' : (firstValue ?? '')) as any;
  };

  // Handle generation (placeholder - will connect to API)
  const handleGenerateRow = async (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row || row.productIds.length === 0) return;

    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, status: SlotStatus.GENERATING } : r)));

    try {
      // TODO: Implement actual generation API call
      // For now, simulate generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const dummyImageUrl = 'https://via.placeholder.com/512?text=Generated+Scene';
      const rowProducts = products.filter((p) => row.productIds.includes(p.id));

      const newHistoryItem: GeneratedSceneImage = {
        id: Math.random().toString(36).substr(2, 9),
        url: dummyImageUrl,
        timestamp: Date.now(),
        productIds: row.productIds,
        productNames: rowProducts.map((p) => p.name),
        settings: { ...row.settings },
        debugPrompt: 'Debug prompt will go here',
      };

      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                status: SlotStatus.COMPLETED,
                outputImage: dummyImageUrl,
                history: [newHistoryItem, ...r.history],
              }
            : r
        )
      );
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, status: SlotStatus.ERROR } : r)));
    }
  };

  // Handle download
  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.sceneStudio}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            onClick={() => setIsProductDrawerOpen(!isProductDrawerOpen)}
            className={`${styles.headerButton} ${isProductDrawerOpen ? styles.headerButtonActive : ''}`}
          >
            <Menu className={styles.headerIcon} />
          </button>
          <div className={styles.branding}>
            <div className={styles.logo}>
              <Zap className={styles.logoIcon} />
            </div>
            <h1 className={styles.title}>
              Scene<span className={styles.titleAccent}>Studio</span>
            </h1>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button
            onClick={() => setIsConfigDrawerOpen(!isConfigDrawerOpen)}
            className={`${styles.headerButton} ${isConfigDrawerOpen ? styles.headerButtonActive : ''}`}
          >
            <Settings2 className={styles.headerIcon} />
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {/* LEFT: Scenes List */}
        <aside className={`${styles.productDrawer} ${isProductDrawerOpen ? styles.productDrawerOpen : styles.productDrawerClosed}`}>
          <div className={styles.drawerInner}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Scenes</span>
            </div>
            <div className={styles.productList}>
              {client?.sceneStudios && client.sceneStudios.length > 0 ? (
                client.sceneStudios.map((scene) => (
                  <div
                    key={scene.id}
                    onClick={() => {
                      if (scene.id !== studioId) {
                        window.location.href = `/${clientId}/scene-studio/${scene.id}`;
                      }
                    }}
                    className={`${styles.productCard} ${scene.id === studioId ? styles.productCardActive : ''}`}
                  >
                    <div className={styles.productThumbnail}>
                      <Layers className={styles.sceneIconLarge} />
                    </div>
                    <div className={styles.productInfo}>
                      <p className={styles.productName}>{scene.name}</p>
                      <p className={styles.productMeta}>{scene.outputSlots?.length || 0} slots</p>
                    </div>
                    {scene.id === studioId && (
                      <div className={styles.activeIndicator}>
                        <div className={styles.activeDot} />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <p>No Scenes</p>
                  <p className={styles.emptyStateHint}>Create a scene in client settings</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* CENTER: Workspace */}
        <main
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOverWorkspace(true);
          }}
          onDragLeave={() => setIsDraggingOverWorkspace(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOverWorkspace(false);
            const pid = e.dataTransfer.getData('catalog-product-id');
            if (pid) addRow([pid]);
          }}
          className={styles.workspace}
        >
          {isDraggingOverWorkspace && (
            <div className={styles.dropOverlay}>
              <div className={styles.dropMessage}>
                <Plus />
                <span>New Flow Slot</span>
              </div>
            </div>
          )}

          <div className={styles.workspaceHeader}>
            <button onClick={() => addRow()} className={styles.newSlotButton}>
              <Plus /> New Sequence
            </button>
            <div className={styles.slotCount}>{rows.length} Active Slots</div>
          </div>

          <div className={styles.slotList}>
            {rows.map((row) => (
              <div
                key={row.id}
                onClick={(e) => toggleRowSelection(row.id, e)}
                className={`${styles.slot} ${selectedRowIds.has(row.id) ? styles.slotSelected : ''}`}
              >
                <div className={styles.slotContent}>
                  {/* Product Area */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const pid = e.dataTransfer.getData('catalog-product-id');
                      if (pid) {
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  productIds: Array.from(new Set([...r.productIds, pid])),
                                }
                              : r
                          )
                        );
                      }
                    }}
                    className={styles.productArea}
                  >
                    {row.productIds.length > 0 ? (
                      row.productIds.map((pid) => {
                        const product = products.find((p) => p.id === pid);
                        return (
                          <div key={pid} className={styles.productThumb}>
                            {product && product.productImageIds[0] && (
                              <img
                                src={`/api/clients/${clientId}/products/${pid}/images/${product.productImageIds[0]}`}
                                alt={product.name}
                              />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          productIds: r.productIds.filter((id) => id !== pid),
                                        }
                                      : r
                                  )
                                );
                              }}
                              className={styles.removeProduct}
                            >
                              <X />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className={styles.dropPlaceholder}>Drop Product</div>
                    )}
                  </div>

                  {/* Render Preview */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (row.outputImage) setBigPreviewUrl(row.outputImage);
                    }}
                    className={styles.renderPreview}
                  >
                    {row.status === SlotStatus.GENERATING ? (
                      <div className={styles.generating}>
                        <Loader2 className={styles.spinner} />
                      </div>
                    ) : row.outputImage ? (
                      <img src={row.outputImage} alt="Generated" />
                    ) : (
                      <div className={styles.emptyPreview}>
                        <ImageIcon />
                      </div>
                    )}
                    {row.outputImage && row.status !== SlotStatus.GENERATING && (
                      <div className={styles.zoomOverlay}>
                        <Maximize2 />
                      </div>
                    )}
                  </div>

                  {/* Config & Execute */}
                  <div className={styles.slotRight}>
                    <div className={styles.configTags}>
                      <span className={styles.tagsceneType}>{row.settings.sceneType}</span>
                      <span className={styles.tagStyle}>{row.settings.style}</span>
                      <span className={styles.tagLighting}>{row.settings.lighting}</span>
                      <span className={styles.tagCamera}>{row.settings.cameraAngle}</span>
                    </div>
                    <div className={styles.executeArea}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateRow(row.id);
                        }}
                        disabled={row.productIds.length === 0 || row.status === SlotStatus.GENERATING}
                        className={styles.executeButton}
                      >
                        {row.status === SlotStatus.GENERATING ? <Loader2 className={styles.spinner} /> : <Play />}
                        Execute
                      </button>
                      {row.history.length > 0 && <span className={styles.revisionCount}>{row.history.length} Revisions</span>}
                    </div>
                  </div>
                </div>

                {/* Revision History */}
                {row.history.length > 0 && (
                  <div className={styles.revisionBar}>
                    {row.history.map((h) => (
                      <div
                        key={h.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, outputImage: h.url } : r)));
                        }}
                        className={`${styles.revisionThumb} ${row.outputImage === h.url ? styles.revisionActive : ''}`}
                      >
                        <img src={h.url} alt="Revision" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>

        {/* RIGHT: Properties Panel */}
        <aside className={`${styles.propertiesDrawer} ${isConfigDrawerOpen ? styles.propertiesDrawerOpen : styles.propertiesDrawerClosed}`}>
          <div className={styles.drawerInner}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Properties</span>
              <button onClick={() => setIsConfigDrawerOpen(false)} className={styles.closeButton}>
                <X />
              </button>
            </div>

            <div className={styles.propertiesContent}>
              {selectedRowIds.size > 0 ? (
                <>
                  {/* Scene Backdrop */}
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>
                      <ImagePlus /> Backdrop
                    </label>
                    <div onClick={() => setShowSceneLibrary(true)} className={styles.scenePreview}>
                      {(getMixedValue('scene') as Scene)?.imageUrl && <img src={(getMixedValue('scene') as Scene).imageUrl} alt="Scene" />}
                      <div className={styles.sceneOverlay}>Change Scene</div>
                    </div>
                  </div>

                  {/* Variety Level */}
                  <div className={styles.propertyGroup}>
                    <div className={styles.propertyHeader}>
                      <label className={styles.propertyLabel}>Interpretation Variety</label>
                      <span className={styles.propertyValue}>{getMixedValue('varietyLevel')}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={getMixedValue('varietyLevel') === 'Mixed' ? 5 : Number(getMixedValue('varietyLevel'))}
                      onChange={(e) => updateSelectedRows({ varietyLevel: Number(e.target.value) })}
                      className={styles.slider}
                    />
                  </div>

                  {/* Toggles */}
                  <div className={styles.toggleGrid}>
                    <div className={styles.toggleItem}>
                      <span>Color Match</span>
                      <button onClick={() => updateSelectedRows({ colorTheme: !getMixedValue('colorTheme') })} className={styles.toggle}>
                        {getMixedValue('colorTheme') ? (
                          <ToggleRight className={styles.toggleOn} />
                        ) : (
                          <ToggleLeft className={styles.toggleOff} />
                        )}
                      </button>
                    </div>
                    <div className={styles.toggleItem}>
                      <span>Add Accents</span>
                      <button onClick={() => updateSelectedRows({ accessories: !getMixedValue('accessories') })} className={styles.toggle}>
                        {getMixedValue('accessories') ? (
                          <ToggleRight className={styles.toggleOn} />
                        ) : (
                          <ToggleLeft className={styles.toggleOff} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Dropdowns */}
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Room Template</label>
                    <select
                      value={getMixedValue('sceneType') === 'Mixed' ? '' : String(getMixedValue('sceneType'))}
                      onChange={(e) => updateSelectedRows({ sceneType: e.target.value })}
                      className={styles.select}
                    >
                      {SCENE_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Atmospheric Lighting</label>
                    <select
                      value={getMixedValue('lighting') === 'Mixed' ? '' : String(getMixedValue('lighting'))}
                      onChange={(e) => updateSelectedRows({ lighting: e.target.value })}
                      className={styles.select}
                    >
                      {LIGHTING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Camera Orientation</label>
                    <select
                      value={getMixedValue('cameraAngle') === 'Mixed' ? '' : String(getMixedValue('cameraAngle'))}
                      onChange={(e) => updateSelectedRows({ cameraAngle: e.target.value })}
                      className={styles.select}
                    >
                      {CAMERA_ANGLES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Aesthetic Style</label>
                    <select
                      value={getMixedValue('style') === 'Mixed' ? '' : String(getMixedValue('style'))}
                      onChange={(e) => updateSelectedRows({ style: e.target.value })}
                      className={styles.select}
                    >
                      {STYLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Surrounding Objects</label>
                    <select
                      value={getMixedValue('surroundings') === 'Mixed' ? '' : String(getMixedValue('surroundings'))}
                      onChange={(e) => updateSelectedRows({ surroundings: e.target.value })}
                      className={styles.select}
                    >
                      {SURROUNDING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Color Palette</label>
                    <select
                      value={getMixedValue('colorScheme') === 'Mixed' ? '' : String(getMixedValue('colorScheme'))}
                      onChange={(e) => updateSelectedRows({ colorScheme: e.target.value })}
                      className={styles.select}
                    >
                      {COLOR_SCHEMES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Props */}
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Staging Elements</label>
                    <div className={styles.propTags}>
                      {PROP_TAGS.map((tag) => {
                        const current = getMixedValue('props');
                        const active = Array.isArray(current) && current.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              let next: string[] = [];
                              if (Array.isArray(current)) next = active ? current.filter((t) => t !== tag) : [...current, tag];
                              else next = [tag];
                              updateSelectedRows({ props: next });
                            }}
                            className={`${styles.propTag} ${active ? styles.propTagActive : ''}`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Framing Ratio</label>
                    <div className={styles.aspectGrid}>
                      {ASPECT_RATIOS.map((r) => (
                        <button
                          key={r}
                          onClick={() => updateSelectedRows({ aspectRatio: r })}
                          className={`${styles.aspectButton} ${getMixedValue('aspectRatio') === r ? styles.aspectButtonActive : ''}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Prompt */}
                  <div className={styles.propertyGroup}>
                    <label className={styles.propertyLabel}>Stylist Directives</label>
                    <textarea
                      value={getMixedValue('promptText') === 'Mixed' ? '' : String(getMixedValue('promptText'))}
                      onChange={(e) => updateSelectedRows({ promptText: e.target.value })}
                      className={styles.textarea}
                      placeholder="e.g. emphasize the oak grain texture..."
                    />
                  </div>
                </>
              ) : (
                <div className={styles.noSelection}>
                  <p>Awaiting Selection</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Scene Library Modal */}
      {showSceneLibrary && (
        <div className={styles.modal} onClick={() => setShowSceneLibrary(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Environment Repository</span>
              <button onClick={() => setShowSceneLibrary(false)} className={styles.modalClose}>
                <X />
              </button>
            </div>
            <div className={styles.sceneGrid}>
              {allScenes.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    updateSelectedRows({ scene: s });
                    setShowSceneLibrary(false);
                  }}
                  className={styles.sceneCard}
                >
                  <img src={s.imageUrl} alt={s.name} />
                  <div className={styles.sceneCardOverlay}>
                    <span>{s.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {bigPreviewUrl && (
        <div className={styles.previewModal} onClick={() => setBigPreviewUrl(null)}>
          <div className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
            <img src={bigPreviewUrl} alt="Preview" />
            <div className={styles.previewActions}>
              <button onClick={() => handleDownload(bigPreviewUrl, 'SceneStudio-Render.jpg')} className={styles.downloadButton}>
                Download Master
              </button>
              <button onClick={() => setBigPreviewUrl(null)} className={styles.previewClose}>
                <X />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
