'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Loader2,
  Sparkles,
  Upload,
  Plus,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  Pencil,
  Sliders,
  Sun,
  Thermometer,
  Palette,
  Contrast,
  Eye,
} from 'lucide-react';
import { Portal, Z_INDEX } from '../common/Portal';
import { ModelSelector } from '../common/ModelSelector';
import { AI_MODELS } from 'visualizer-ai/client';
import { PostAdjustmentsPanel, generateFilterString, hasAdjustments } from './PostAdjustmentsPanel';
import type { PostAdjustments } from '@/lib/types/app-types';
import type { AdjustmentHint } from 'visualizer-ai/client';
import { DEFAULT_POST_ADJUSTMENTS } from '@/lib/types/app-types';
import { ImageModal } from '../modals/ImageModal';
import {
  WebGLPreviewService,
  getWebGLPreviewService,
} from '@/lib/services/image-processing/webgl-preview';
import styles from './SceneStudioView.module.scss';

interface ImageComponent {
  id: string;
  name: string;
  description: string;
  editPrompt?: string;
  referenceImageUrl?: string;
}

interface Revision {
  id: string;
  imageDataUrl: string; // Local data URL - not saved to S3 until submit
  timestamp: number;
  prompt?: string; // The prompt used to generate this revision
}

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  aspectRatio?: string;
  onSave: (mode: 'overwrite' | 'new', editedImageDataUrl: string) => void;
  clientId: string;
  sessionId: string;
  modelOverrides?: {
    imageModel?: string;
    fallbackImageModel?: string;
  };
  initialAdjustments?: PostAdjustments;
}

export function ImageEditorModal({
  isOpen,
  onClose,
  imageUrl,
  aspectRatio,
  onSave,
  modelOverrides,
  initialAdjustments,
}: ImageEditorModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingAdjustments, setIsProcessingAdjustments] = useState(false);
  const [isApplyingHint, setIsApplyingHint] = useState<string | null>(null);
  const [components, setComponents] = useState<ImageComponent[]>([]);
  const [overallDescription, setOverallDescription] = useState('');
  const [adjustmentHints, setAdjustmentHints] = useState<AdjustmentHint[]>([]);
  const [generalPrompt, setGeneralPrompt] = useState('');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(
    modelOverrides?.imageModel || AI_MODELS.IMAGE_EDIT
  );

  // Editor tabs: 'edit' for AI editing, 'adjustments' for post-processing
  const [activeTab, setActiveTab] = useState<'edit' | 'adjustments'>('edit');

  // Post adjustments state (non-destructive, applied via CSS filters)
  // Initialize with the flow's post adjustments if provided
  const [adjustments, setAdjustments] = useState<PostAdjustments>(
    initialAdjustments ? { ...initialAdjustments } : { ...DEFAULT_POST_ADJUSTMENTS }
  );

  // Full-screen preview modal
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);

  // WebGL preview
  const [webglReady, setWebglReady] = useState(false);
  const [webglSourceVersion, setWebglSourceVersion] = useState(0);
  const [webglRenderOk, setWebglRenderOk] = useState(false);
  const webglServiceRef = useRef<WebGLPreviewService | null>(null);
  const webglCanvasContainerRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);

  // Revision history - all images kept locally as data URLs
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState(0);

  // Compute derived values (need to be available for hooks below)
  const currentRevision = revisions[currentRevisionIndex];
  const currentImageUrl = currentRevision?.imageDataUrl || imageUrl;
  const isOriginal = currentRevisionIndex === 0;

  // Initialize with the original image as the first revision
  useEffect(() => {
    if (isOpen && imageUrl && revisions.length === 0) {
      // Convert the original image URL to a data URL
      const loadOriginalImage = async () => {
        try {
          // Use the download-image API proxy to avoid CORS issues with S3
          const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;
          const response = await fetch(proxyUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            setRevisions([
              {
                id: 'original',
                imageDataUrl: dataUrl,
                timestamp: Date.now(),
                prompt: 'Original image',
              },
            ]);
            setCurrentRevisionIndex(0);
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error('Failed to load original image:', err);
          // Fallback: use the URL directly
          setRevisions([
            {
              id: 'original',
              imageDataUrl: imageUrl,
              timestamp: Date.now(),
              prompt: 'Original image',
            },
          ]);
        }
      };
      loadOriginalImage();
    }
  }, [isOpen, imageUrl, revisions.length]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRevisions([]);
      setCurrentRevisionIndex(0);
      setComponents([]);
      setOverallDescription('');
      setAdjustmentHints([]);
      setGeneralPrompt('');
      setSelectedComponentId(null);
      setShowSaveDialog(false);
      setError(null);
      setActiveTab('edit');
      setAdjustments(initialAdjustments ? { ...initialAdjustments } : { ...DEFAULT_POST_ADJUSTMENTS });
      setShowFullscreenPreview(false);
      setWebglRenderOk(false);
      // Cleanup WebGL
      if (webglServiceRef.current) {
        webglServiceRef.current.cleanup();
        webglServiceRef.current = null;
      }
      setWebglReady(false);
    }
  }, [isOpen, initialAdjustments]);

  // Initialize WebGL preview when image is available
  useEffect(() => {
    if (!isOpen || !currentImageUrl || activeTab !== 'adjustments') {
      return;
    }

    let isCancelled = false;
    setWebglReady(false);
    setWebglRenderOk(false);

    const initWebGL = async () => {
      // Load image first
      const img = new Image();
      img.crossOrigin = 'anonymous';

      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = currentImageUrl;
        });

        if (isCancelled) return;

        previewImageRef.current = img;

        // Initialize or update WebGL service
        if (!webglServiceRef.current) {
          webglServiceRef.current = getWebGLPreviewService();
        }

        const service = webglServiceRef.current;
        let success = false;

        if (service.isReady()) {
          success = service.updateImage(img);
          if (!success) {
            success = await service.init(img);
          }
        } else {
          success = await service.init(img);
        }

        if (isCancelled) return;

        setWebglReady(success);

        if (success) {
          setWebglSourceVersion((prev) => prev + 1);
          console.log('🎮 WebGL preview ready');
        }
      } catch (err) {
        console.warn('WebGL init failed:', err);
        setWebglReady(false);
      }
    };

    initWebGL();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, currentImageUrl, activeTab]);

  // Update WebGL preview when adjustments change
  useEffect(() => {
    if (!webglReady || !webglServiceRef.current || activeTab !== 'adjustments') {
      if (activeTab !== 'adjustments' || !webglReady) {
        setWebglRenderOk(false);
      }
      return;
    }

    const canvas = webglServiceRef.current.render(adjustments);
    if (canvas && webglCanvasContainerRef.current) {
      // Clear previous canvas
      webglCanvasContainerRef.current.innerHTML = '';
      // Add the WebGL canvas
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.objectFit = 'contain';
      webglCanvasContainerRef.current.appendChild(canvas);
      setWebglRenderOk(true);
    } else {
      setWebglRenderOk(false);
    }
  }, [webglReady, adjustments, activeTab, webglSourceVersion]);

  // Apply adjustments to image and create a new revision using Sharp API
  const handleApplyAdjustments = useCallback(async () => {
    if (!hasAdjustments(adjustments) || !currentImageUrl) return;

    setIsProcessingAdjustments(true);
    setError(null);

    try {
      console.log('🎨 Sending adjustments to Sharp processor...');

      // Call the Sharp-based processing API
      const response = await fetch('/api/process-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: currentImageUrl,
          adjustments,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process adjustments');
      }

      console.log(`✅ Processing completed in ${data.processingTimeMs}ms`);

      // Add as a new revision
      const newRevision: Revision = {
        id: `adjustment-${Date.now()}`,
        imageDataUrl: data.processedImageDataUrl,
        timestamp: Date.now(),
        prompt: 'Applied post adjustments (Sharp processed)',
      };

      setRevisions((prev) => {
        const next = [...prev, newRevision];
        setCurrentRevisionIndex(next.length - 1);
        return next;
      });

      // Reset adjustments after applying
      setAdjustments({ ...DEFAULT_POST_ADJUSTMENTS });
    } catch (err) {
      console.error('Failed to apply adjustments:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply adjustments');
    } finally {
      setIsProcessingAdjustments(false);
    }
  }, [adjustments, currentImageUrl]);

  // Apply an AI-suggested adjustment hint
  const handleApplyHint = useCallback(async (hint: AdjustmentHint) => {
    setIsApplyingHint(hint.id);
    setError(null);

    try {
      console.log('🎯 Applying adjustment hint:', hint.label);

      // Call the edit API with the hint's prompt
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseImageDataUrl: currentImageUrl,
          prompt: hint.prompt,
          aspectRatio,
          modelOverrides: {
            ...modelOverrides,
            imageModel: selectedModelId,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.editedImageDataUrl) {
        // Add as new revision
        const newRevision: Revision = {
          id: `hint-${Date.now()}`,
          imageDataUrl: data.editedImageDataUrl,
          timestamp: Date.now(),
          prompt: `Applied: ${hint.label}`,
        };

        setRevisions((prev) => {
          const next = [...prev, newRevision];
          setCurrentRevisionIndex(next.length - 1);
          return next;
        });

        // Remove the applied hint from the list
        setAdjustmentHints((prev) => prev.filter((h) => h.id !== hint.id));

        console.log('✅ Hint applied successfully');
      } else {
        throw new Error(data.error || 'Failed to apply adjustment');
      }
    } catch (err) {
      console.error('Failed to apply hint:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply adjustment');
    } finally {
      setIsApplyingHint(null);
    }
  }, [currentImageUrl, aspectRatio, modelOverrides, selectedModelId]);

  // Get icon component for adjustment hint
  const getHintIcon = (iconName: AdjustmentHint['icon']) => {
    const iconStyle = { width: 16, height: 16 };
    switch (iconName) {
      case 'sun': return <Sun style={iconStyle} />;
      case 'thermometer': return <Thermometer style={iconStyle} />;
      case 'palette': return <Palette style={iconStyle} />;
      case 'contrast': return <Contrast style={iconStyle} />;
      case 'sparkles': return <Sparkles style={iconStyle} />;
      case 'eye': return <Eye style={iconStyle} />;
      default: return <Sparkles style={iconStyle} />;
    }
  };

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Analyze the currently selected revision image
      const imageToAnalyze = currentImageUrl;

      const response = await fetch('/api/analyze-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageToAnalyze }),
      });

      const data = await response.json();

      if (data.success && data.analysis) {
        setComponents(
          data.analysis.components.map((c: ImageComponent) => ({
            ...c,
            editPrompt: '',
            referenceImageUrl: undefined,
          }))
        );
        setOverallDescription(data.analysis.overallDescription);
        // Store adjustment hints if returned
        if (data.analysis.suggestedAdjustments) {
          setAdjustmentHints(data.analysis.suggestedAdjustments);
          console.log('📝 Received adjustment hints:', data.analysis.suggestedAdjustments.length);
        }
      } else {
        setError(data.error || 'Failed to analyze image');
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Failed to analyze image components');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleComponentPromptChange = (componentId: string, prompt: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === componentId ? { ...c, editPrompt: prompt } : c))
    );
  };

  const handleComponentImageUpload = async (componentId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setComponents((prev) =>
        prev.map((c) => (c.id === componentId ? { ...c, referenceImageUrl: dataUrl } : c))
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveComponentImage = (componentId: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === componentId ? { ...c, referenceImageUrl: undefined } : c))
    );
  };

  const handleGenerateEdit = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Build the edit prompt from components and general prompt
      const componentEdits = components
        .filter((c) => c.editPrompt || c.referenceImageUrl)
        .map((c) => {
          let edit = `- ${c.name}: `;
          if (c.editPrompt) edit += c.editPrompt;
          if (c.referenceImageUrl) edit += ' (with reference image)';
          return edit;
        })
        .join('\n');

      const editPrompt = `${generalPrompt ? `General instructions: ${generalPrompt}\n` : ''}
${componentEdits ? `Component-specific edits:\n${componentEdits}` : ''}

IMPORTANT: Other than the specified edits, keep the rest of the image unchanged.`;

      console.log('🎨 Generating edited image with prompt:', editPrompt);

      // Get reference images from components that have them
      const referenceImages = components
        .filter((c) => c.referenceImageUrl)
        .map((c) => ({
          componentName: c.name,
          imageDataUrl: c.referenceImageUrl,
        }));

      // Call the edit generation API with the current revision as base
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseImageDataUrl: currentImageUrl,
          prompt: editPrompt,
          aspectRatio,
          referenceImages,
          modelOverrides: {
            ...modelOverrides,
            imageModel: selectedModelId,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.editedImageDataUrl) {
        // Add the new revision locally (not saved to S3 yet)
        const newRevision: Revision = {
          id: `revision-${Date.now()}`,
          imageDataUrl: data.editedImageDataUrl,
          timestamp: Date.now(),
          prompt: editPrompt,
        };

        setRevisions((prev) => {
          const next = [...prev, newRevision];
          setCurrentRevisionIndex(next.length - 1);
          return next;
        });

        // Clear the prompts for next edit
        setGeneralPrompt('');
        setComponents((prev) =>
          prev.map((c) => ({ ...c, editPrompt: '', referenceImageUrl: undefined }))
        );
      } else {
        throw new Error(data.error || 'Failed to generate edited image');
      }
    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate edited image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = (mode: 'overwrite' | 'new') => {
    if (currentRevision && !isOriginal) {
      // Pass the data URL to the parent - it will handle S3 upload
      onSave(mode, currentRevision.imageDataUrl);
      setShowSaveDialog(false);
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handlePrevRevision = () => {
    if (currentRevisionIndex > 0) {
      setCurrentRevisionIndex(currentRevisionIndex - 1);
    }
  };

  const handleNextRevision = () => {
    if (currentRevisionIndex < revisions.length - 1) {
      setCurrentRevisionIndex(currentRevisionIndex + 1);
    }
  };

  const handleSelectRevision = (index: number) => {
    setCurrentRevisionIndex(index);
  };

  const handleDeleteRevision = (index: number) => {
    if (index === 0) return; // Can't delete original

    setRevisions((prev) => {
      const next = prev.filter((_, i) => i !== index);

      setCurrentRevisionIndex((current) => {
        if (current < index) return current;
        const nextIndex = Math.max(0, current - 1);
        return Math.min(nextIndex, Math.max(0, next.length - 1));
      });

      return next;
    });
  };

  const hasEdits = !isOriginal;

  const showWebglPreview = activeTab === 'adjustments' && webglReady && webglRenderOk;

  return (
    <Portal>
      <div
        className={styles.editorModalOverlay}
        onClick={handleOverlayClick}
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        <div className={styles.editorModal}>
          {/* Header */}
          <div className={styles.editorModalHeader}>
            <h2 className={styles.editorModalTitle}>Image Editor</h2>
            <button onClick={onClose} className={styles.iconButton} type="button">
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.editorModalContent}>
            {/* Left: Image Preview & Revision Gallery */}
            <div className={styles.editorImageSection}>
              {/* Main Image Preview */}
              <div
                className={styles.editorImagePreview}
                onClick={() => setShowFullscreenPreview(true)}
              >
                {/* WebGL Preview (when available and adjustments tab active) */}
                {activeTab === 'adjustments' && (
                  <div
                    ref={webglCanvasContainerRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: showWebglPreview ? 'flex' : 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                )}
                <img
                  src={currentImageUrl}
                  alt="Image to edit"
                  style={{
                    display: showWebglPreview ? 'none' : 'block',
                    filter: activeTab === 'adjustments' ? generateFilterString(adjustments) : 'none',
                  }}
                />
                {!isOriginal && (
                  <div className={styles.revisionBadge}>
                    Revision {currentRevisionIndex}
                  </div>
                )}
                {activeTab === 'adjustments' && hasAdjustments(adjustments) && (
                  <div className={styles.adjustmentsBadge}>
                    {showWebglPreview ? 'WebGL Preview' : 'CSS Preview'}
                  </div>
                )}
              </div>

              {/* Revision Navigation */}
              {revisions.length > 1 && (
                <div className={styles.revisionNav}>
                  <button
                    className={styles.revisionNavButton}
                    onClick={handlePrevRevision}
                    disabled={currentRevisionIndex === 0}
                    type="button"
                  >
                    <ChevronLeft style={{ width: 16, height: 16 }} />
                  </button>
                  <span className={styles.revisionNavText}>
                    {currentRevisionIndex === 0 ? 'Original' : `Revision ${currentRevisionIndex}`} of {revisions.length - 1}
                  </span>
                  <button
                    className={styles.revisionNavButton}
                    onClick={handleNextRevision}
                    disabled={currentRevisionIndex === revisions.length - 1}
                    type="button"
                  >
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              )}

              {/* Revision Gallery */}
              {revisions.length > 1 && (
                <div className={styles.revisionGallery}>
                  {revisions.map((revision, index) => (
                    <div
                      key={revision.id}
                      className={`${styles.revisionThumbnail} ${index === currentRevisionIndex ? styles.selected : ''}`}
                      onClick={() => handleSelectRevision(index)}
                    >
                      <img src={revision.imageDataUrl} alt={index === 0 ? 'Original' : `Revision ${index}`} />
                      {index === currentRevisionIndex && (
                        <div className={styles.revisionSelected}>
                          <Check style={{ width: 12, height: 12 }} />
                        </div>
                      )}
                      {index > 0 && (
                        <button
                          className={styles.revisionDelete}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRevision(index);
                          }}
                          type="button"
                        >
                          <Trash2 style={{ width: 10, height: 10 }} />
                        </button>
                      )}
                      <span className={styles.revisionLabel}>
                        {index === 0 ? 'Original' : `#${index}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className={styles.editorError}>{error}</p>}
            </div>

            {/* Right: Editor Panel */}
            <div className={styles.editorPanel}>
              {/* Tab Navigation */}
              <div className={styles.editorTabs}>
                <button
                  type="button"
                  className={`${styles.editorTab} ${activeTab === 'edit' ? styles.active : ''}`}
                  onClick={() => setActiveTab('edit')}
                >
                  <Pencil style={{ width: 16, height: 16 }} />
                  <span>AI Edit</span>
                </button>
                <button
                  type="button"
                  className={`${styles.editorTab} ${activeTab === 'adjustments' ? styles.active : ''}`}
                  onClick={() => setActiveTab('adjustments')}
                >
                  <Sliders style={{ width: 16, height: 16 }} />
                  <span>Adjustments</span>
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className={styles.editorPanelContent}>
                {activeTab === 'edit' ? (
                  <>
                    {/* General Edit Instructions - Always visible */}
                    <div className={styles.editorSection}>
                      <label className={styles.editorLabel}>Edit Instructions</label>
                      <textarea
                        className={styles.editorTextarea}
                        value={generalPrompt}
                        onChange={(e) => setGeneralPrompt(e.target.value)}
                        placeholder="Describe the changes you want to make to this image..."
                        rows={4}
                      />
                    </div>

                    {/* Model Selector - Always visible */}
                    <div className={styles.editorSection}>
                      <ModelSelector
                        selectedModelId={selectedModelId}
                        onModelChange={setSelectedModelId}
                        label="Edit Model"
                        context={{ isEditing: true, task: 'editing' }}
                        showUpgradeHint={false}
                      />
                    </div>

                    {/* Divider */}
                    <div className={styles.editorDivider} />

                    {/* Optional Component Analysis Section */}
                    <div className={styles.editorSection}>
                      <div className={styles.editorSectionHeader}>
                        <label className={styles.editorLabel}>
                          Fine-Grained Edits
                          <span className={styles.editorLabelHint}>(optional)</span>
                        </label>
                        {components.length === 0 ? (
                          <button
                            className={styles.analyzeButtonSmall}
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            type="button"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className={styles.spinIcon} style={{ width: 14, height: 14 }} />
                                <span>Analyzing...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles style={{ width: 14, height: 14 }} />
                                <span>Analyze Components</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            className={styles.reanalyzeButton}
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            type="button"
                          >
                            {isAnalyzing ? (
                              <Loader2 className={styles.spinIcon} style={{ width: 14, height: 14 }} />
                            ) : (
                              <RefreshCw style={{ width: 14, height: 14 }} />
                            )}
                            <span>Re-analyze</span>
                          </button>
                        )}
                      </div>

                      {components.length === 0 ? (
                        <p className={styles.editorHint}>
                          Analyze the image to identify individual components (floor, wall, furniture, etc.) for targeted edits.
                        </p>
                      ) : (
                        <>
                          {/* Scene Overview */}
                          {overallDescription && (
                            <p className={styles.editorDescription}>{overallDescription}</p>
                          )}

                          {/* Adjustment Hints */}
                          {adjustmentHints.length > 0 && (
                            <div className={styles.adjustmentHints}>
                              <label className={styles.hintsLabel}>
                                <Sparkles style={{ width: 14, height: 14 }} />
                                Suggested Improvements
                              </label>
                              <div className={styles.hintsList}>
                                {adjustmentHints.map((hint) => (
                                  <button
                                    key={hint.id}
                                    type="button"
                                    className={styles.hintButton}
                                    onClick={() => handleApplyHint(hint)}
                                    disabled={isApplyingHint !== null}
                                    title={hint.description}
                                  >
                                    {isApplyingHint === hint.id ? (
                                      <Loader2 className={styles.spinIcon} style={{ width: 16, height: 16 }} />
                                    ) : (
                                      getHintIcon(hint.icon)
                                    )}
                                    <span className={styles.hintLabel}>{hint.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Components List */}
                          <div className={styles.componentsList}>
                            {components.map((component) => (
                              <div
                                key={component.id}
                                className={`${styles.componentItem} ${selectedComponentId === component.id ? styles.selected : ''}`}
                                onClick={() =>
                                  setSelectedComponentId(
                                    selectedComponentId === component.id ? null : component.id
                                  )
                                }
                              >
                                <div className={styles.componentHeader}>
                                  <span className={styles.componentName}>{component.name}</span>
                                  {(component.editPrompt || component.referenceImageUrl) && (
                                    <span className={styles.componentEdited}>edited</span>
                                  )}
                                </div>
                                <span className={styles.componentDescription}>
                                  {component.description}
                                </span>

                                {/* Expanded Edit Area */}
                                {selectedComponentId === component.id && (
                                  <div className={styles.componentEditArea} onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      className={styles.componentPromptInput}
                                      value={component.editPrompt || ''}
                                      onChange={(e) =>
                                        handleComponentPromptChange(component.id, e.target.value)
                                      }
                                      placeholder={`Edit the ${component.name}...`}
                                    />

                                    <div className={styles.componentImageUpload}>
                                      {component.referenceImageUrl ? (
                                        <div className={styles.componentRefImage}>
                                          <img src={component.referenceImageUrl} alt="Reference" />
                                          <button
                                            type="button"
                                            className={styles.removeRefImage}
                                            onClick={() => handleRemoveComponentImage(component.id)}
                                          >
                                            <Trash2 style={{ width: 12, height: 12 }} />
                                          </button>
                                        </div>
                                      ) : (
                                        <label className={styles.uploadRefLabel}>
                                          <Upload style={{ width: 14, height: 14 }} />
                                          <span>Add reference</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                handleComponentImageUpload(component.id, file);
                                              }
                                            }}
                                            style={{ display: 'none' }}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  /* Adjustments Tab Content */
                  <div className={styles.adjustmentsTabContent}>
                    <p className={styles.adjustmentsDescription}>
                      Adjust light, color, and effects without losing image quality.
                      Changes are previewed live and can be applied as a new revision.
                    </p>
                    <PostAdjustmentsPanel
                      adjustments={adjustments}
                      onChange={setAdjustments}
                    />
                  </div>
                )}
              </div>

              {/* Fixed Footer with Action Buttons */}
              <div className={styles.editorPanelFooter}>
                {activeTab === 'edit' ? (
                  <>
                    {/* Generate Button */}
                    <button
                      className={styles.generateEditButton}
                      onClick={handleGenerateEdit}
                      disabled={isGenerating || (!generalPrompt && !components.some((c) => c.editPrompt || c.referenceImageUrl))}
                      type="button"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className={styles.spinIcon} style={{ width: 18, height: 18 }} />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles style={{ width: 18, height: 18 }} />
                          <span>Generate Edit</span>
                        </>
                      )}
                    </button>

                    {/* Save Button - only enabled when there are revisions */}
                    <button
                      className={styles.saveEditButton}
                      onClick={() => setShowSaveDialog(true)}
                      disabled={!hasEdits}
                      type="button"
                    >
                      <Check style={{ width: 18, height: 18 }} />
                      <span>Save Changes</span>
                    </button>
                  </>
                ) : (
                  /* Adjustments Tab Footer */
                  <>
                    <button
                      className={styles.generateEditButton}
                      onClick={handleApplyAdjustments}
                      disabled={!hasAdjustments(adjustments) || isProcessingAdjustments}
                      type="button"
                    >
                      {isProcessingAdjustments ? (
                        <>
                          <Loader2 className={styles.spinIcon} style={{ width: 18, height: 18 }} />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles style={{ width: 18, height: 18 }} />
                          <span>Apply Adjustments</span>
                        </>
                      )}
                    </button>
                    <button
                      className={styles.saveEditButton}
                      onClick={() => setShowSaveDialog(true)}
                      disabled={!hasEdits}
                      type="button"
                    >
                      <Check style={{ width: 18, height: 18 }} />
                      <span>Save Changes</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Save Dialog */}
          {showSaveDialog && currentRevision && !isOriginal && (
            <div className={styles.saveDialogOverlay}>
              <div className={styles.saveDialog}>
                <h3>Save Edited Image</h3>
                <div className={styles.saveDialogPreview}>
                  <div className={styles.savePreviewImage}>
                    <img src={revisions[0]?.imageDataUrl} alt="Original" />
                    <span>Original</span>
                  </div>
                  <div className={styles.savePreviewArrow}>→</div>
                  <div className={styles.savePreviewImage}>
                    <img src={currentRevision.imageDataUrl} alt="Edited" />
                    <span>Revision {currentRevisionIndex}</span>
                  </div>
                </div>
                <p className={styles.saveDialogHint}>
                  This will upload the edited image to the flow.
                </p>
                <div className={styles.saveDialogActions}>
                  <button
                    className={styles.saveDialogButton}
                    onClick={() => handleSave('overwrite')}
                    type="button"
                  >
                    <RefreshCw style={{ width: 16, height: 16 }} />
                    <span>Overwrite Current</span>
                  </button>
                  <button
                    className={`${styles.saveDialogButton} ${styles.primary}`}
                    onClick={() => handleSave('new')}
                    type="button"
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                    <span>Save as New</span>
                  </button>
                </div>
                <button
                  className={styles.saveDialogCancel}
                  onClick={() => setShowSaveDialog(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen image preview modal */}
      <ImageModal
        isOpen={showFullscreenPreview}
        imageUrl={currentImageUrl}
        onClose={() => setShowFullscreenPreview(false)}
        cssFilter={activeTab === 'adjustments' && hasAdjustments(adjustments) ? generateFilterString(adjustments) : undefined}
      />
    </Portal>
  );
}
