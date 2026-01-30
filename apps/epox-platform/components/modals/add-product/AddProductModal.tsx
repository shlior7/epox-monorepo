'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  Check,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Package,
  Sparkles,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import { apiClient } from '@/lib/api-client';
import type { Product } from '@/lib/api-client';
import type { BubbleValue, FlowGenerationSettings, ImageAspectRatio } from 'visualizer-types';
import { InspirationBubblesGrid } from '@/components/studio/config-panel/InspirationBubblesGrid';

// ===== TYPES =====

type ModalPhase = 'entry' | 'creating' | 'analyzing' | 'review' | 'done';

interface ProductEntry {
  id: string; // local temp ID
  name: string;
  description: string;
  files: File[];
  previews: string[]; // data URLs for display
}

interface CreatedProduct {
  id: string;
  name: string;
  entry: ProductEntry;
}

interface AnalysisResult {
  productId: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  analysis?: any;
  error?: string;
}

interface ReviewProduct {
  product: CreatedProduct;
  analysis: AnalysisResult;
  // Editable fields
  category: string;
  sceneTypes: string[];
  materials: string[];
  colors: string[];
  style: string[];
  // Generation settings
  bubbles: BubbleValue[];
  userPrompt: string;
  settingsScope: 'product' | 'category';
}

// ===== HELPERS =====

function createEmptyEntry(): ProductEntry {
  return {
    id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    description: '',
    files: [],
    previews: [],
  };
}

// ===== MAIN COMPONENT =====

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductsCreated?: (productIds: string[]) => void;
}

export function AddProductModal({ open, onOpenChange, onProductsCreated }: AddProductModalProps) {
  const [phase, setPhase] = useState<ModalPhase>('entry');
  const [entries, setEntries] = useState<ProductEntry[]>([createEmptyEntry()]);
  const [createdProducts, setCreatedProducts] = useState<CreatedProduct[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Map<string, AnalysisResult>>(new Map());
  const [reviewProducts, setReviewProducts] = useState<ReviewProduct[]>([]);
  const [creationProgress, setCreationProgress] = useState({ current: 0, total: 0, status: '' });

  const reset = useCallback(() => {
    setPhase('entry');
    setEntries([createEmptyEntry()]);
    setCreatedProducts([]);
    setAnalysisResults(new Map());
    setReviewProducts([]);
    setCreationProgress({ current: 0, total: 0, status: '' });
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Delay reset to let the dialog close animation play
    setTimeout(reset, 300);
  }, [onOpenChange, reset]);

  // ===== PHASE 1 HANDLERS =====

  const updateEntry = useCallback((id: string, updates: Partial<ProductEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      // Clean up previews
      const entry = prev.find((e) => e.id === id);
      entry?.previews.forEach((url) => URL.revokeObjectURL(url));
      const filtered = prev.filter((e) => e.id !== id);
      return filtered.length === 0 ? [createEmptyEntry()] : filtered;
    });
  }, []);

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEmptyEntry()]);
  }, []);

  const handleFilesAdded = useCallback((entryId: string, newFiles: File[]) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const combinedFiles = [...e.files, ...newFiles];
        const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
        return {
          ...e,
          files: combinedFiles,
          previews: [...e.previews, ...newPreviews],
        };
      })
    );
  }, []);

  const removeImage = useCallback((entryId: string, imageIndex: number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const newFiles = [...e.files];
        const newPreviews = [...e.previews];
        URL.revokeObjectURL(newPreviews[imageIndex]);
        newFiles.splice(imageIndex, 1);
        newPreviews.splice(imageIndex, 1);
        return { ...e, files: newFiles, previews: newPreviews };
      })
    );
  }, []);

  const canProceedToCreate = entries.some(
    (e) => e.name.trim().length > 0 && e.files.length > 0
  );

  // ===== PHASE 2: CREATION =====

  const handleStartCreation = useCallback(async () => {
    const validEntries = entries.filter(
      (e) => e.name.trim().length > 0 && e.files.length > 0
    );
    if (validEntries.length === 0) return;

    setPhase('creating');
    setCreationProgress({ current: 0, total: validEntries.length, status: 'Starting...' });

    const created: CreatedProduct[] = [];

    for (let i = 0; i < validEntries.length; i++) {
      const entry = validEntries[i];
      setCreationProgress({
        current: i + 1,
        total: validEntries.length,
        status: `Creating ${entry.name}...`,
      });

      try {
        // Create product
        const product = await apiClient.createProduct({
          name: entry.name.trim(),
          description: entry.description.trim() || undefined,
        });

        // Upload images sequentially
        for (let j = 0; j < entry.files.length; j++) {
          setCreationProgress({
            current: i + 1,
            total: validEntries.length,
            status: `Uploading image ${j + 1}/${entry.files.length} for ${entry.name}...`,
          });
          await apiClient.uploadFile(entry.files[j], 'product', { productId: product.id });
        }

        created.push({ id: product.id, name: product.name, entry });
      } catch (error) {
        console.error(`Failed to create product ${entry.name}:`, error);
        // Continue with other products
      }
    }

    setCreatedProducts(created);

    if (created.length === 0) {
      // All failed — go back
      setPhase('entry');
      return;
    }

    // Move to analysis phase
    setPhase('analyzing');
    await runAnalysis(created);
  }, [entries]);

  // ===== PHASE 3: ANALYSIS =====

  const runAnalysis = useCallback(async (products: CreatedProduct[]) => {
    const results = new Map<string, AnalysisResult>();

    // Initialize all as pending
    for (const p of products) {
      results.set(p.id, { productId: p.id, status: 'pending' });
    }
    setAnalysisResults(new Map(results));

    // Analyze with concurrency limit of 3
    const concurrencyLimit = 3;
    const queue = [...products];
    const inFlight: Promise<void>[] = [];

    const analyzeOne = async (product: CreatedProduct) => {
      results.set(product.id, { productId: product.id, status: 'analyzing' });
      setAnalysisResults(new Map(results));

      try {
        const result = await apiClient.analyzeProduct(product.id);
        results.set(product.id, {
          productId: product.id,
          status: 'done',
          analysis: result.analysis,
        });
      } catch (error) {
        results.set(product.id, {
          productId: product.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Analysis failed',
        });
      }
      setAnalysisResults(new Map(results));
    };

    while (queue.length > 0 || inFlight.length > 0) {
      while (inFlight.length < concurrencyLimit && queue.length > 0) {
        const product = queue.shift()!;
        const promise = analyzeOne(product).then(() => {
          const idx = inFlight.indexOf(promise);
          if (idx >= 0) inFlight.splice(idx, 1);
        });
        inFlight.push(promise);
      }
      if (inFlight.length > 0) {
        await Promise.race(inFlight);
      }
    }

    // Build review products
    const reviews: ReviewProduct[] = products.map((p) => {
      const result = results.get(p.id);
      const analysis = result?.analysis;
      return {
        product: p,
        analysis: result ?? { productId: p.id, status: 'error', error: 'No result' },
        category: analysis?.productType || '',
        sceneTypes: analysis?.sceneTypes || [],
        materials: analysis?.materials || [],
        colors: [
          ...(analysis?.colors?.primary ? [analysis.colors.primary] : []),
          ...(analysis?.colors?.accent || []),
        ],
        style: analysis?.style || [],
        bubbles: [],
        userPrompt: '',
        settingsScope: 'product' as const,
      };
    });

    setReviewProducts(reviews);
    setPhase('review');
  }, []);

  // ===== PHASE 4: REVIEW =====

  const updateReviewProduct = useCallback((productId: string, updates: Partial<ReviewProduct>) => {
    setReviewProducts((prev) =>
      prev.map((rp) => (rp.product.id === productId ? { ...rp, ...updates } : rp))
    );
  }, []);

  const handleSaveReview = useCallback(async () => {
    // Save edits for all reviewed products
    for (const rp of reviewProducts) {
      try {
        const updates: Record<string, any> = {};
        if (rp.category) updates.category = rp.category;
        if (rp.sceneTypes.length > 0) updates.sceneTypes = rp.sceneTypes;

        // Save default generation settings if bubbles were configured
        if (rp.bubbles.length > 0 || rp.userPrompt) {
          const settings: FlowGenerationSettings = {
            aspectRatio: '1:1' as ImageAspectRatio,
            generalInspiration: rp.bubbles,
            userPrompt: rp.userPrompt || undefined,
          };
          updates.defaultGenerationSettings = settings;
        }

        if (Object.keys(updates).length > 0) {
          await apiClient.updateProduct(rp.product.id, updates);
        }

        // If scope is "category" and there are bubbles, save to category settings too
        if (rp.settingsScope === 'category' && rp.category && rp.bubbles.length > 0) {
          try {
            // Save category settings via the categories API
            const categoriesRes = await fetch('/api/categories');
            if (categoriesRes.ok) {
              const { categories } = await categoriesRes.json();
              const matchedCategory = categories?.find(
                (c: any) => c.name.toLowerCase() === rp.category.toLowerCase()
              );
              if (matchedCategory) {
                await fetch(`/api/categories/${matchedCategory.id}/settings`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    defaultBubbles: rp.bubbles,
                    userPrompt: rp.userPrompt || undefined,
                  }),
                });
              }
            }
          } catch (catError) {
            console.warn('Failed to save category settings:', catError);
          }
        }
      } catch (error) {
        console.error(`Failed to save review for ${rp.product.name}:`, error);
      }
    }

    setPhase('done');
    onProductsCreated?.(createdProducts.map((p) => p.id));
  }, [reviewProducts, createdProducts, onProductsCreated]);

  const handleSkipReview = useCallback(() => {
    setPhase('done');
    onProductsCreated?.(createdProducts.map((p) => p.id));
  }, [createdProducts, onProductsCreated]);

  // ===== RENDER =====

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        className={cn(
          'max-h-[90vh] overflow-hidden p-0',
          phase === 'entry' || phase === 'review' ? 'max-w-4xl' : 'max-w-lg'
        )}
        testId="add-product-modal"
      >
        {phase === 'entry' && (
          <EntryPhase
            entries={entries}
            onUpdateEntry={updateEntry}
            onRemoveEntry={removeEntry}
            onAddEntry={addEntry}
            onFilesAdded={handleFilesAdded}
            onRemoveImage={removeImage}
            canProceed={canProceedToCreate}
            onProceed={handleStartCreation}
            onCancel={handleClose}
          />
        )}

        {phase === 'creating' && (
          <CreationPhase progress={creationProgress} />
        )}

        {phase === 'analyzing' && (
          <AnalysisPhase
            products={createdProducts}
            results={analysisResults}
          />
        )}

        {phase === 'review' && (
          <ReviewPhase
            reviewProducts={reviewProducts}
            onUpdate={updateReviewProduct}
            onSave={handleSaveReview}
            onSkip={handleSkipReview}
          />
        )}

        {phase === 'done' && (
          <DonePhase
            createdCount={createdProducts.length}
            onClose={handleClose}
            onAddMore={() => reset()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===== PHASE 1: ENTRY =====

interface EntryPhaseProps {
  entries: ProductEntry[];
  onUpdateEntry: (id: string, updates: Partial<ProductEntry>) => void;
  onRemoveEntry: (id: string) => void;
  onAddEntry: () => void;
  onFilesAdded: (entryId: string, files: File[]) => void;
  onRemoveImage: (entryId: string, index: number) => void;
  canProceed: boolean;
  onProceed: () => void;
  onCancel: () => void;
}

function EntryPhase({
  entries,
  onUpdateEntry,
  onRemoveEntry,
  onAddEntry,
  onFilesAdded,
  onRemoveImage,
  canProceed,
  onProceed,
  onCancel,
}: EntryPhaseProps) {
  return (
    <div className="flex flex-col" data-testid="add-product-entry-phase">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold" data-testid="add-product-entry-title">
          Add Products
        </h2>
        <p className="text-sm text-muted-foreground">
          Add one or more products with images. AI will analyze them automatically.
        </p>
      </div>

      {/* Scrollable product list */}
      <div className="max-h-[60vh] overflow-y-auto px-6 py-4" data-testid="add-product-entry-list">
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <ProductEntryCard
              key={entry.id}
              entry={entry}
              index={index}
              showRemove={entries.length > 1}
              onUpdate={(updates) => onUpdateEntry(entry.id, updates)}
              onRemove={() => onRemoveEntry(entry.id)}
              onFilesAdded={(files) => onFilesAdded(entry.id, files)}
              onRemoveImage={(imgIndex) => onRemoveImage(entry.id, imgIndex)}
            />
          ))}
        </div>

        <Button
          variant="outline"
          className="mt-4 w-full border-dashed"
          onClick={onAddEntry}
          data-testid="add-product-entry-add-another"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add another product
        </Button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-6 py-4" data-testid="add-product-entry-footer">
        <Button variant="ghost" onClick={onCancel} data-testid="add-product-entry-cancel">
          Cancel
        </Button>
        <Button
          variant="glow"
          disabled={!canProceed}
          onClick={onProceed}
          data-testid="add-product-entry-create"
        >
          Create Products
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ===== PRODUCT ENTRY CARD =====

interface ProductEntryCardProps {
  entry: ProductEntry;
  index: number;
  showRemove: boolean;
  onUpdate: (updates: Partial<ProductEntry>) => void;
  onRemove: () => void;
  onFilesAdded: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
}

function ProductEntryCard({
  entry,
  index,
  showRemove,
  onUpdate,
  onRemove,
  onFilesAdded,
  onRemoveImage,
}: ProductEntryCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const testId = buildTestId('product-entry', index.toString());

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (files.length > 0) onFilesAdded(files);
    },
    [onFilesAdded]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) onFilesAdded(files);
      e.target.value = '';
    },
    [onFilesAdded]
  );

  return (
    <div
      className="rounded-lg border border-border bg-card/50 p-4"
      data-testid={testId}
    >
      <div className="flex items-start gap-4">
        {/* Image drop zone */}
        <div
          className={cn(
            'relative flex w-32 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
            entry.files.length === 0
              ? 'h-32 cursor-pointer border-muted-foreground/30 hover:border-primary/50'
              : 'min-h-[8rem] border-muted-foreground/20'
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => entry.files.length === 0 && fileInputRef.current?.click()}
          data-testid={buildTestId(testId, 'dropzone')}
        >
          {entry.files.length === 0 ? (
            <div className="flex flex-col items-center gap-1 p-2 text-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Drop images
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 p-1">
              {entry.previews.map((preview, i) => (
                <div
                  key={i}
                  className="group relative h-14 w-14 overflow-hidden rounded"
                  data-testid={buildTestId(testId, 'preview', i.toString())}
                >
                  <Image
                    src={preview}
                    alt={`Preview ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage(i);
                    }}
                    data-testid={buildTestId(testId, 'remove-image', i.toString())}
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              <button
                className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-muted-foreground/30 transition-colors hover:border-primary/50"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                data-testid={buildTestId(testId, 'add-image')}
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
            data-testid={buildTestId(testId, 'file-input')}
          />
        </div>

        {/* Form fields */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Product name *"
              value={entry.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid={buildTestId(testId, 'name')}
            />
            {showRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                data-testid={buildTestId(testId, 'remove')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <textarea
            placeholder="Description (optional)"
            value={entry.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid={buildTestId(testId, 'description')}
          />
        </div>
      </div>
    </div>
  );
}

// ===== PHASE 2: CREATION PROGRESS =====

interface CreationPhaseProps {
  progress: { current: number; total: number; status: string };
}

function CreationPhase({ progress }: CreationPhaseProps) {
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8" data-testid="add-product-creating-phase">
      <Loader2 className="h-10 w-10 animate-spin text-primary" data-testid="add-product-creating-spinner" />
      <div className="text-center">
        <h3 className="font-semibold" data-testid="add-product-creating-title">
          Creating Products
        </h3>
        <p className="mt-1 text-sm text-muted-foreground" data-testid="add-product-creating-status">
          {progress.status}
        </p>
      </div>
      <div className="w-full max-w-xs">
        <div className="h-2 overflow-hidden rounded-full bg-secondary" data-testid="add-product-creating-progress-bar">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
            data-testid="add-product-creating-progress-fill"
          />
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground" data-testid="add-product-creating-count">
          {progress.current} / {progress.total}
        </p>
      </div>
    </div>
  );
}

// ===== PHASE 3: ANALYSIS PROGRESS =====

interface AnalysisPhaseProps {
  products: CreatedProduct[];
  results: Map<string, AnalysisResult>;
}

function AnalysisPhase({ products, results }: AnalysisPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-8" data-testid="add-product-analyzing-phase">
      <Sparkles className="h-10 w-10 text-primary" data-testid="add-product-analyzing-icon" />
      <div className="text-center">
        <h3 className="font-semibold" data-testid="add-product-analyzing-title">
          Analyzing Products
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          AI is analyzing your products to determine categories and scene types.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-2" data-testid="add-product-analyzing-list">
        {products.map((product) => {
          const result = results.get(product.id);
          const status = result?.status ?? 'pending';

          return (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              data-testid={buildTestId('product-analysis', product.id)}
            >
              {status === 'pending' && (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" data-testid={buildTestId('product-analysis', product.id, 'pending')} />
              )}
              {status === 'analyzing' && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" data-testid={buildTestId('product-analysis', product.id, 'analyzing')} />
              )}
              {status === 'done' && (
                <CheckCircle className="h-4 w-4 text-green-500" data-testid={buildTestId('product-analysis', product.id, 'done')} />
              )}
              {status === 'error' && (
                <AlertCircle className="h-4 w-4 text-destructive" data-testid={buildTestId('product-analysis', product.id, 'error')} />
              )}
              <span className="flex-1 truncate text-sm" data-testid={buildTestId('product-analysis', product.id, 'name')}>
                {product.name}
              </span>
              {status === 'done' && (
                <Badge variant="secondary" className="text-xs" data-testid={buildTestId('product-analysis', product.id, 'badge')}>
                  Done
                </Badge>
              )}
              {status === 'error' && (
                <Badge variant="destructive" className="text-xs" data-testid={buildTestId('product-analysis', product.id, 'error-badge')}>
                  Failed
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== PHASE 4: REVIEW =====

interface ReviewPhaseProps {
  reviewProducts: ReviewProduct[];
  onUpdate: (productId: string, updates: Partial<ReviewProduct>) => void;
  onSave: () => void;
  onSkip: () => void;
}

function ReviewPhase({ reviewProducts, onUpdate, onSave, onSkip }: ReviewPhaseProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    reviewProducts[0]?.product.id ?? null
  );

  return (
    <div className="flex flex-col" data-testid="add-product-review-phase">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold" data-testid="add-product-review-title">
          Review & Configure
        </h2>
        <p className="text-sm text-muted-foreground">
          Review AI analysis results and optionally configure generation settings.
        </p>
      </div>

      {/* Scrollable review cards */}
      <div className="max-h-[60vh] overflow-y-auto px-6 py-4" data-testid="add-product-review-list">
        <div className="space-y-3">
          {reviewProducts.map((rp) => (
            <ReviewProductCard
              key={rp.product.id}
              reviewProduct={rp}
              isExpanded={expandedId === rp.product.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === rp.product.id ? null : rp.product.id)
              }
              onUpdate={(updates) => onUpdate(rp.product.id, updates)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-6 py-4" data-testid="add-product-review-footer">
        <Button variant="ghost" onClick={onSkip} data-testid="add-product-review-skip">
          Skip & Finish
        </Button>
        <Button variant="glow" onClick={onSave} data-testid="add-product-review-save">
          Save & Finish
          <Check className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ===== REVIEW PRODUCT CARD =====

interface ReviewProductCardProps {
  reviewProduct: ReviewProduct;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<ReviewProduct>) => void;
}

function ReviewProductCard({
  reviewProduct: rp,
  isExpanded,
  onToggleExpand,
  onUpdate,
}: ReviewProductCardProps) {
  const testId = buildTestId('review-product', rp.product.id);
  const firstPreview = rp.product.entry.previews[0];

  const handleAddBubble = useCallback(
    (type: any) => {
      const newBubble: BubbleValue = { type };
      onUpdate({ bubbles: [...rp.bubbles, newBubble] });
    },
    [rp.bubbles, onUpdate]
  );

  const handleRemoveBubble = useCallback(
    (index: number) => {
      const next = [...rp.bubbles];
      next.splice(index, 1);
      onUpdate({ bubbles: next });
    },
    [rp.bubbles, onUpdate]
  );

  const handleUpdateBubble = useCallback(
    (index: number, bubble: BubbleValue) => {
      const next = [...rp.bubbles];
      next[index] = bubble;
      onUpdate({ bubbles: next });
    },
    [rp.bubbles, onUpdate]
  );

  const handleAddMultipleBubbles = useCallback(
    (newBubbles: BubbleValue[]) => {
      onUpdate({ bubbles: [...rp.bubbles, ...newBubbles] });
    },
    [rp.bubbles, onUpdate]
  );

  return (
    <div
      className="overflow-hidden rounded-lg border border-border"
      data-testid={testId}
    >
      {/* Collapsed header */}
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/30"
        onClick={onToggleExpand}
        data-testid={buildTestId(testId, 'toggle')}
      >
        {/* Thumbnail */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-white">
          {firstPreview ? (
            <Image src={firstPreview} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm" data-testid={buildTestId(testId, 'name')}>
            {rp.product.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {rp.analysis.status === 'done' && (
              <>
                <Badge variant="secondary" className="text-xs" data-testid={buildTestId(testId, 'category-badge')}>
                  {rp.category || 'Unknown'}
                </Badge>
                {rp.sceneTypes.slice(0, 2).map((st) => (
                  <Badge key={st} variant="outline" className="text-xs" data-testid={buildTestId(testId, 'scene-type', st)}>
                    {st}
                  </Badge>
                ))}
              </>
            )}
            {rp.analysis.status === 'error' && (
              <Badge variant="destructive" className="text-xs">Analysis failed</Badge>
            )}
          </div>
        </div>

        {rp.analysis.status === 'done' ? (
          <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
        ) : rp.analysis.status === 'error' ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        ) : null}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-3 space-y-4" data-testid={buildTestId(testId, 'details')}>
          {/* Editable category */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</label>
            <input
              type="text"
              value={rp.category}
              onChange={(e) => onUpdate({ category: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid={buildTestId(testId, 'category-input')}
            />
          </div>

          {/* Scene types as tags */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scene Types</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {rp.sceneTypes.map((st, i) => (
                <Badge key={i} variant="secondary" className="text-xs" data-testid={buildTestId(testId, 'scene-tag', i.toString())}>
                  {st}
                  <button
                    className="ml-1 opacity-50 hover:opacity-100"
                    onClick={() => {
                      const next = [...rp.sceneTypes];
                      next.splice(i, 1);
                      onUpdate({ sceneTypes: next });
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Analysis details: materials, colors, style */}
          {rp.analysis.status === 'done' && (
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="font-medium uppercase tracking-wide text-muted-foreground">Materials</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {rp.materials.map((m, i) => (
                    <Badge key={i} variant="outline" className="text-xs" data-testid={buildTestId(testId, 'material', i.toString())}>
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-medium uppercase tracking-wide text-muted-foreground">Colors</span>
                <div className="mt-1 flex gap-1">
                  {rp.colors.map((c, i) => (
                    <div
                      key={i}
                      className="h-5 w-5 rounded-full border border-border"
                      style={{ backgroundColor: c }}
                      title={c}
                      data-testid={buildTestId(testId, 'color', i.toString())}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="font-medium uppercase tracking-wide text-muted-foreground">Style</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {rp.style.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs" data-testid={buildTestId(testId, 'style', i.toString())}>
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generation Settings */}
          <div className="rounded-lg border border-border bg-secondary/20 p-3" data-testid={buildTestId(testId, 'gen-settings')}>
            <div className="mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Generation Settings (Optional)
              </span>
            </div>

            {/* Bubbles Grid */}
            <InspirationBubblesGrid
              bubbles={rp.bubbles}
              sceneType={rp.sceneTypes[0] || 'General'}
              headerLabel="Inspiration"
              onAddBubble={handleAddBubble}
              onRemoveBubble={handleRemoveBubble}
              onUpdateBubble={handleUpdateBubble}
              onAddMultipleBubbles={handleAddMultipleBubbles}
              maxBubbles={6}
              columns={4}
              compact
            />

            {/* User Prompt */}
            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground">User Prompt</label>
              <textarea
                value={rp.userPrompt}
                onChange={(e) => onUpdate({ userPrompt: e.target.value })}
                placeholder="Optional custom prompt for this product..."
                rows={2}
                className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid={buildTestId(testId, 'user-prompt')}
              />
            </div>

            {/* Scope selector */}
            <div className="mt-3 flex items-center gap-3" data-testid={buildTestId(testId, 'scope')}>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name={`scope-${rp.product.id}`}
                  checked={rp.settingsScope === 'product'}
                  onChange={() => onUpdate({ settingsScope: 'product' })}
                  className="accent-primary"
                  data-testid={buildTestId(testId, 'scope-product')}
                />
                Product only
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name={`scope-${rp.product.id}`}
                  checked={rp.settingsScope === 'category'}
                  onChange={() => onUpdate({ settingsScope: 'category' })}
                  className="accent-primary"
                  data-testid={buildTestId(testId, 'scope-category')}
                />
                Apply to all in {rp.category || 'category'}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== PHASE 5: DONE =====

interface DonePhaseProps {
  createdCount: number;
  onClose: () => void;
  onAddMore: () => void;
}

function DonePhase({ createdCount, onClose, onAddMore }: DonePhaseProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8" data-testid="add-product-done-phase">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10" data-testid="add-product-done-icon">
        <CheckCircle className="h-8 w-8 text-green-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold" data-testid="add-product-done-title">
          {createdCount} {createdCount === 1 ? 'product' : 'products'} created!
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your products are ready. You can now generate images in the Studio.
        </p>
      </div>
      <div className="flex gap-2" data-testid="add-product-done-actions">
        <Button variant="outline" onClick={onAddMore} data-testid="add-product-done-add-more">
          <Plus className="mr-2 h-4 w-4" />
          Add More
        </Button>
        <Button variant="glow" onClick={onClose} data-testid="add-product-done-close">
          Go to Products
        </Button>
      </div>
    </div>
  );
}
