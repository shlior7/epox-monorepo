'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { GeneratedAsset } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import { useGenerationPolling } from '@/lib/hooks/use-generation-polling';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  Eye,
  History,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Package,
  Pin,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type {
  FlowGenerationSettings,
  InspirationImage,
  LightingPreset,
  SceneTypeInspirationMap,
  StylePreset,
  SubjectAnalysis
} from 'visualizer-types';
import { LIGHTING_PRESETS, STYLE_PRESETS } from 'visualizer-types';

interface StudioPageProps {
  params: Promise<{ id: string }>;
}

// Output quality options
const QUALITY_OPTIONS = [
  { value: '1K', label: '1K', description: 'Fast' },
  { value: '2K', label: '2K', description: 'Balanced' },
  { value: '4K', label: '4K', description: 'High Quality' },
] as const;

// Aspect ratio options
const ASPECT_OPTIONS = [
  { value: '1:1', label: '1:1', icon: '◻' },
  { value: '16:9', label: '16:9', icon: '▭' },
  { value: '9:16', label: '9:16', icon: '▯' },
  { value: '4:3', label: '4:3', icon: '▱' },
] as const;

export default function StudioPage({ params }: StudioPageProps) {
  const { id: studioId } = use(params);
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get productId from URL params
  const productIdFromUrl = searchParams.get('productId');

  // Fetch the generation flow to get productIds
  const { data: flowData, isLoading: isLoadingFlow } = useQuery({
    queryKey: ['generation-flow', studioId],
    queryFn: async () => {
      const response = await fetch(`/api/studio/${studioId}/settings`);
      if (!response.ok) throw new Error('Failed to fetch flow');
      return response.json();
    },
  });

  // Product IDs from flow or URL
  const productIds = useMemo(() => {
    if (flowData?.productIds?.length > 0) return flowData.productIds;
    if (productIdFromUrl) return [productIdFromUrl];
    return [];
  }, [flowData?.productIds, productIdFromUrl]);

  // Generation state with robust polling
  const {
    isGenerating,
    progress: generationProgress,
    status: generationStatus,
    startGeneration,
    cancelGeneration,
  } = useGenerationPolling({
    sessionId: studioId,
    onComplete: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
      toast.success('Generation complete!');
    },
    onError: (error) => {
      toast.error(error || 'Generation failed');
    },
  });

  // ===== STATE =====

  // Section 1: Scene Style
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);
  const [sceneTypeInspirations, setSceneTypeInspirations] = useState<SceneTypeInspirationMap>({});
  const [stylePreset, setStylePreset] = useState<StylePreset>('Modern Minimalist');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('Studio Soft Light');
  const [isAnalyzingInspiration, setIsAnalyzingInspiration] = useState(false);

  // Section 2: Product Details (read-only from product analysis)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedBaseImageId, setSelectedBaseImageId] = useState<string | null>(null);

  // Section 3: User Prompt
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedPromptPreview, setGeneratedPromptPreview] = useState<string | null>(null);

  // Section 4: Output Settings
  const [settings, setSettings] = useState({
    aspectRatio: '1:1',
    quality: '2K' as '1K' | '2K' | '4K',
    variantsCount: 4,
  });

  // Generated images
  const [newlyGeneratedImages, setNewlyGeneratedImages] = useState<GeneratedAsset[]>([]);
  const [selectedGeneratedImage, setSelectedGeneratedImage] = useState<GeneratedAsset | null>(null);

  // UI state
  const [expandedSection, setExpandedSection] = useState<string | null>('scene-style');

  // ===== DATA FETCHING =====

  // Fetch products data
  const {
    data: products,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery({
    queryKey: ['products', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const results = await Promise.all(
        productIds.map((id: string) => apiClient.getProduct(id, true))
      );
      return results;
    },
    enabled: productIds.length > 0,
    staleTime: 60 * 1000,
  });

  // Fetch generated images for THIS flow only
  const { data: generatedImagesData } = useQuery({
    queryKey: ['generated-images', studioId],
    queryFn: async () => {
      return apiClient.listGeneratedImages({
        flowId: studioId,
        limit: 50,
        sort: 'date',
      });
    },
    refetchInterval: isGenerating ? 3000 : false,
  });

  // ===== COMPUTED VALUES =====

  const currentProduct = useMemo(() => {
    if (!products || products.length === 0) return null;
    if (selectedProductId) {
      return products.find((p: any) => p.id === selectedProductId) || products[0];
    }
    return products[0];
  }, [products, selectedProductId]);

  const subjectAnalysis: SubjectAnalysis | null = useMemo(() => {
    return currentProduct?.analysis?.subject || null;
  }, [currentProduct]);

  const selectedBaseImageUrl = useMemo(() => {
    if (!currentProduct?.baseImages) return null;
    const selected = currentProduct.baseImages.find((img: any) => img.id === selectedBaseImageId);
    return selected?.url || currentProduct.baseImages[0]?.url || null;
  }, [currentProduct, selectedBaseImageId]);

  const allGeneratedAssets = useMemo(() => {
    const existing = generatedImagesData?.images || [];
    const combined = [...newlyGeneratedImages, ...existing];
    return combined.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
  }, [generatedImagesData?.images, newlyGeneratedImages]);

  // Scene type groups from inspiration analysis
  const sceneTypeGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const [sceneType, data] of Object.entries(sceneTypeInspirations)) {
      groups[sceneType] = data.inspirationImages.length;
    }
    return groups;
  }, [sceneTypeInspirations]);

  // Matched scene type for current product
  const matchedSceneType = useMemo(() => {
    if (!subjectAnalysis?.nativeSceneTypes || Object.keys(sceneTypeInspirations).length === 0) {
      return null;
    }
    // Find first matching scene type
    for (const sceneType of subjectAnalysis.nativeSceneTypes) {
      if (sceneTypeInspirations[sceneType]) {
        return sceneType;
      }
    }
    // Return first available if no match
    return Object.keys(sceneTypeInspirations)[0] || null;
  }, [subjectAnalysis, sceneTypeInspirations]);

  // ===== EFFECTS =====

  // Initialize from flow settings
  useEffect(() => {
    if (flowData?.settings) {
      const s = flowData.settings as FlowGenerationSettings;
      if (s.inspirationImages) setInspirationImages(s.inspirationImages);
      if (s.sceneTypeInspirations) setSceneTypeInspirations(s.sceneTypeInspirations);
      if (s.stylePreset) setStylePreset(s.stylePreset);
      if (s.lightingPreset) setLightingPreset(s.lightingPreset);
      if (s.userPrompt) setUserPrompt(s.userPrompt);
      if (s.aspectRatio) setSettings(prev => ({ ...prev, aspectRatio: s.aspectRatio }));
      if (s.imageQuality) setSettings(prev => ({ ...prev, quality: s.imageQuality as '1K' | '2K' | '4K' }));
      if (s.variantsCount) setSettings(prev => ({ ...prev, variantsCount: s.variantsCount! }));
    }
  }, [flowData?.settings]);

  // Auto-select first base image
  useEffect(() => {
    if (products && products.length > 0 && !selectedBaseImageId) {
      const firstProduct = products[0];
      if (firstProduct.baseImages?.length > 0) {
        setSelectedBaseImageId(firstProduct.baseImages[0].id);
      }
    }
  }, [products, selectedBaseImageId]);

  // Auto-select newest generated image
  const prevAssetCount = useRef(0);
  useEffect(() => {
    if (allGeneratedAssets.length > prevAssetCount.current && allGeneratedAssets.length > 0) {
      setSelectedGeneratedImage(allGeneratedAssets[0]);
    }
    prevAssetCount.current = allGeneratedAssets.length;
  }, [allGeneratedAssets]);

  // ===== HANDLERS =====

  const handleInspirationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsAnalyzingInspiration(true);

    for (const file of Array.from(files)) {
      try {
        // Upload file
        const uploadResult = await apiClient.uploadFile(file, 'inspiration');

        // Analyze with Vision Scanner
        const analysisResponse = await fetch('/api/vision-scanner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: uploadResult.url,
            sourceType: 'upload',
          }),
        });

        if (!analysisResponse.ok) {
          throw new Error('Vision Scanner analysis failed');
        }

        const { inspirationImage, analysis } = await analysisResponse.json();

        // Add to inspiration images
        setInspirationImages(prev => [...prev, inspirationImage]);

        // Group by detected scene type
        const detectedSceneType = analysis.json.detectedSceneType;
        setSceneTypeInspirations(prev => {
          const existing = prev[detectedSceneType];
          if (existing) {
            return {
              ...prev,
              [detectedSceneType]: {
                inspirationImages: [...existing.inspirationImages, inspirationImage],
                mergedAnalysis: analysis, // For now, use latest analysis
              },
            };
          }
          return {
            ...prev,
            [detectedSceneType]: {
              inspirationImages: [inspirationImage],
              mergedAnalysis: analysis,
            },
          };
        });

        toast.success(`Analyzed: ${detectedSceneType} scene detected`);
      } catch (err) {
        console.error('Inspiration upload failed:', err);
        toast.error('Failed to analyze inspiration image');
      }
    }

    setIsAnalyzingInspiration(false);

    // Save settings
    saveSettings();
  };

  const removeInspirationImage = (url: string) => {
    setInspirationImages(prev => prev.filter(img => img.url !== url));

    // Also remove from scene type groups
    setSceneTypeInspirations(prev => {
      const updated = { ...prev };
      for (const [sceneType, data] of Object.entries(updated)) {
        updated[sceneType] = {
          ...data,
          inspirationImages: data.inspirationImages.filter(img => img.url !== url),
        };
        // Remove empty groups
        if (updated[sceneType].inspirationImages.length === 0) {
          delete updated[sceneType];
        }
      }
      return updated;
    });

    saveSettings();
  };

  const saveSettings = async () => {
    try {
      await apiClient.updateStudioSettings(studioId, {
        inspirationImages: inspirationImages as any,
        sceneTypeInspirations: sceneTypeInspirations as any,
        stylePreset,
        lightingPreset,
        userPrompt: userPrompt || undefined,
        aspectRatio: settings.aspectRatio,
        imageQuality: settings.quality,
        variantsCount: settings.variantsCount,
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handlePreviewPrompt = async () => {
    if (!subjectAnalysis) {
      toast.error('Product has not been analyzed yet');
      return;
    }

    try {
      const response = await fetch('/api/art-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectAnalysis,
          sceneTypeInspirations,
          stylePreset,
          lightingPreset,
          userPrompt: userPrompt || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Art Director failed');
      }

      const { finalPrompt, matchedSceneType: matched } = await response.json();
      setGeneratedPromptPreview(finalPrompt);
      toast.success(`Prompt generated for ${matched} scene`);
    } catch (error) {
      console.error('Prompt preview failed:', error);
      toast.error('Failed to generate prompt preview');
    }
  };

  const handleGenerate = async () => {
    if (!products || products.length === 0) return;

    try {
      // First, generate the prompt via Art Director
      let prompt = '';
      if (subjectAnalysis && Object.keys(sceneTypeInspirations).length > 0) {
        const artDirectorResponse = await fetch('/api/art-director', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectAnalysis,
            sceneTypeInspirations,
            stylePreset,
            lightingPreset,
            userPrompt: userPrompt || undefined,
          }),
        });

        if (artDirectorResponse.ok) {
          const { finalPrompt } = await artDirectorResponse.json();
          prompt = finalPrompt;
        }
      }

      // Fall back to user prompt if no Art Director prompt
      if (!prompt && userPrompt) {
        prompt = userPrompt;
      }

      const result = await apiClient.generateImages({
        sessionId: studioId,
        productIds: products.map((p: any) => p.id),
        prompt: prompt || undefined,
        productImageUrls: selectedBaseImageUrl ? [selectedBaseImageUrl] : undefined,
        inspirationImageUrls: inspirationImages.length > 0 ? inspirationImages.map(img => img.url) : undefined,
        settings: {
          aspectRatio: settings.aspectRatio,
          imageQuality: settings.quality.toLowerCase() as '1k' | '2k' | '4k',
          variantsPerProduct: settings.variantsCount,
        },
      });

      console.log('🚀 Generation started:', result);

      if (result.status === 'queued' && result.jobId) {
        startGeneration(result.jobId);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
        toast.success('Generation complete!');
      }
    } catch (error) {
      console.error('❌ Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Generation failed. Please try again.');
    }
  };

  // ===== LOADING STATE =====

  if (isLoadingFlow || isLoadingProducts) {
    return (
      <div className="flex h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-xl">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====

  if (productsError || !products || products.length === 0) {
    return (
      <div className="flex h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-xl">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-semibold">Studio</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <Package className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">Product Not Found</h2>
          <p className="mb-4 text-muted-foreground">
            {productsError instanceof Error ? productsError.message : 'Unable to load product data'}
          </p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const primaryImageUrl = currentProduct?.baseImages?.[0]?.url;

  // ===== RENDER =====

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-secondary">
              {primaryImageUrl ? (
                <Image src={primaryImageUrl} alt={currentProduct?.name || ''} fill className="object-cover" unoptimized />
              ) : (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-sm font-semibold">{currentProduct?.name}</h1>
              {products.length > 1 && (
                <p className="text-xs text-muted-foreground">+{products.length - 1} more products</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex min-h-0 flex-1">
        {/* Left Panel - Config (4 Sections) */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card/30">
          <div className="flex-1 overflow-y-auto">
            {/* Section 1: Scene Style */}
            <section className="border-b border-border">
              <button
                onClick={() => setExpandedSection(expandedSection === 'scene-style' ? null : 'scene-style')}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold">Scene Style</span>
                  {inspirationImages.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {inspirationImages.length} images
                    </Badge>
                  )}
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', expandedSection === 'scene-style' && 'rotate-180')} />
              </button>

              {expandedSection === 'scene-style' && (
                <div className="space-y-4 px-4 pb-4">
                  {/* Inspiration Images */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Inspiration Images
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {inspirationImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
                        >
                          <Image src={img.url} alt={`Inspiration ${idx + 1}`} fill className="object-cover" unoptimized />
                          <button
                            onClick={() => removeInspirationImage(img.url)}
                            className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                          {img.tags?.[0] && (
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[8px] text-white">
                              {img.tags[0]}
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzingInspiration}
                        className="flex aspect-square h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
                      >
                        {isAnalyzingInspiration ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleInspirationUpload}
                      />
                    </div>
                  </div>

                  {/* Detected Scene Types */}
                  {Object.keys(sceneTypeGroups).length > 0 && (
                    <div>
                      <label className="mb-2 block text-xs font-medium text-muted-foreground">
                        Detected Scene Types
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(sceneTypeGroups).map(([sceneType, count]) => (
                          <Badge
                            key={sceneType}
                            variant={matchedSceneType === sceneType ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {sceneType} ({count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Style Preset */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Style Preset
                    </label>
                    <select
                      value={stylePreset}
                      onChange={(e) => {
                        setStylePreset(e.target.value as StylePreset);
                        saveSettings();
                      }}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      {STYLE_PRESETS.map((style) => (
                        <option key={style} value={style}>{style}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lighting Preset */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Lighting Preset
                    </label>
                    <select
                      value={lightingPreset}
                      onChange={(e) => {
                        setLightingPreset(e.target.value as LightingPreset);
                        saveSettings();
                      }}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      {LIGHTING_PRESETS.map((lighting) => (
                        <option key={lighting} value={lighting}>{lighting}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </section>

            {/* Section 2: Product Details */}
            <section className="border-b border-border">
              <button
                onClick={() => setExpandedSection(expandedSection === 'product-details' ? null : 'product-details')}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold">Product Details</span>
                  {subjectAnalysis && (
                    <Badge variant="secondary" className="text-xs">
                      Analyzed
                    </Badge>
                  )}
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', expandedSection === 'product-details' && 'rotate-180')} />
              </button>

              {expandedSection === 'product-details' && (
                <div className="space-y-4 px-4 pb-4">
                  {/* Base Images */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Product Images
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {currentProduct?.baseImages?.map((img: any) => (
                        <button
                          key={img.id}
                          onClick={() => setSelectedBaseImageId(img.id)}
                          className={cn(
                            'relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                            selectedBaseImageId === img.id
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <Image src={img.url} alt="Product" fill className="object-cover" unoptimized />
                          {selectedBaseImageId === img.id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject Analysis (read-only) */}
                  {subjectAnalysis ? (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="mb-2 flex items-center gap-2">
                        <Wand2 className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">AI Analysis</span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p><span className="font-medium">Subject:</span> {subjectAnalysis.subjectClassHyphenated}</p>
                        <p><span className="font-medium">Scene Types:</span> {subjectAnalysis.nativeSceneTypes.join(', ')}</p>
                        <p><span className="font-medium">Camera:</span> {subjectAnalysis.inputCameraAngle}</p>
                        {matchedSceneType && (
                          <p className="mt-2 text-green-600">
                            <Check className="mr-1 inline h-3 w-3" />
                            Matched: {matchedSceneType}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                      Product not yet analyzed. Upload an image to trigger analysis.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Section 3: User Prompt */}
            <section className="border-b border-border">
              <button
                onClick={() => setExpandedSection(expandedSection === 'user-prompt' ? null : 'user-prompt')}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="font-semibold">Scene Prompt</span>
                  {userPrompt && (
                    <Badge variant="secondary" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', expandedSection === 'user-prompt' && 'rotate-180')} />
              </button>

              {expandedSection === 'user-prompt' && (
                <div className="space-y-4 px-4 pb-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Additional Details (optional)
                    </label>
                    <Textarea
                      placeholder="Add specific details for this generation... e.g., 'include a coffee cup on the table'"
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      onBlur={saveSettings}
                      className="min-h-[80px] resize-none text-sm"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Your additions will be appended to the AI-generated prompt
                    </p>
                  </div>

                  {/* Preview Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewPrompt}
                    disabled={!subjectAnalysis || Object.keys(sceneTypeInspirations).length === 0}
                    className="w-full"
                  >
                    <Eye className="mr-2 h-3.5 w-3.5" />
                    Preview Generated Prompt
                  </Button>

                  {/* Prompt Preview */}
                  {generatedPromptPreview && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium">Generated Prompt</span>
                        <button
                          onClick={() => setGeneratedPromptPreview(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {generatedPromptPreview.substring(0, 500)}...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Section 4: Output Settings */}
            <section className="border-b border-border">
              <button
                onClick={() => setExpandedSection(expandedSection === 'output-settings' ? null : 'output-settings')}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-green-500" />
                  <span className="font-semibold">Output Settings</span>
                </div>
                <ChevronDown className={cn('h-4 w-4 transition-transform', expandedSection === 'output-settings' && 'rotate-180')} />
              </button>

              {expandedSection === 'output-settings' && (
                <div className="space-y-4 px-4 pb-4">
                  {/* Quality */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Quality
                    </label>
                    <div className="flex gap-2">
                      {QUALITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSettings({ ...settings, quality: opt.value });
                            saveSettings();
                          }}
                          className={cn(
                            'flex flex-1 flex-col items-center rounded-lg border p-2 transition-colors',
                            settings.quality === opt.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <span className="text-sm font-semibold">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Aspect Ratio
                    </label>
                    <div className="flex gap-1.5">
                      {ASPECT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSettings({ ...settings, aspectRatio: opt.value });
                            saveSettings();
                          }}
                          className={cn(
                            'flex flex-1 flex-col items-center rounded-lg border py-2 text-xs transition-colors',
                            settings.aspectRatio === opt.value
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

                  {/* Variants */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Variants: {settings.variantsCount}
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 4, 6].map((n) => (
                        <button
                          key={n}
                          onClick={() => {
                            setSettings({ ...settings, variantsCount: n });
                            saveSettings();
                          }}
                          className={cn(
                            'flex-1 rounded-md border py-1 text-sm transition-colors',
                            settings.variantsCount === n
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
              )}
            </section>
          </div>

          {/* Footer - Generate Button */}
          <div className="shrink-0 border-t border-border bg-card p-3">
            <Button
              variant="glow"
              size="lg"
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {generationProgress > 0
                    ? `Generating... ${Math.round(generationProgress)}%`
                    : 'Starting...'}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate {settings.variantsCount} Images
                </>
              )}
            </Button>
            {isGenerating && (
              <>
                <Progress value={generationProgress} className="mt-2 h-1.5" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelGeneration}
                  className="mt-2 w-full text-xs text-muted-foreground"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex min-w-0 flex-1 flex-col bg-background/50">
          {/* Center - Main Preview */}
          <div className="flex flex-1 items-center justify-center p-6">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                  <div className="h-24 w-24 animate-pulse rounded-full bg-primary/20" />
                  <Loader2 className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">
                  {generationStatus === 'polling' ? 'Generating Images...' : 'Starting Generation...'}
                </h2>
                <p className="mb-4 text-muted-foreground">
                  {generationProgress > 0
                    ? 'AI is creating your visualizations.'
                    : 'Preparing your generation request...'}
                </p>
                <div className="w-64">
                  <Progress value={generationProgress} className="h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {Math.round(generationProgress)}% complete
                  </p>
                </div>
              </div>
            ) : selectedGeneratedImage ? (
              <div className="relative max-h-full max-w-full overflow-hidden rounded-xl bg-black/10 shadow-2xl">
                <Image
                  src={selectedGeneratedImage.url}
                  alt="Generated"
                  width={800}
                  height={800}
                  className="max-h-[70vh] w-auto object-contain"
                  unoptimized
                />
                {/* Floating action bar */}
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/90 px-4 py-2 shadow-lg backdrop-blur-sm">
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                  <div className="h-4 w-px bg-border" />
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5">
                    <Pin className="h-3.5 w-3.5" />
                    Pin
                  </Button>
                  <div className="h-4 w-px bg-border" />
                  <Button
                    size="sm"
                    variant={selectedGeneratedImage.approvalStatus === 'approved' ? 'default' : 'ghost'}
                    className="h-8 gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {selectedGeneratedImage.approvalStatus === 'approved' ? 'Approved' : 'Approve'}
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="Ready to Generate"
                description="Add inspiration images, configure your settings, and click Generate to create stunning product visualizations."
              />
            )}
          </div>

          {/* Bottom - History Gallery */}
          <div className="shrink-0 border-t border-border bg-card/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <History className="h-4 w-4" />
                Generation History
                <Badge variant="muted" className="ml-1">
                  {allGeneratedAssets.length}
                </Badge>
              </h4>
            </div>

            {allGeneratedAssets.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">Generated images will appear here</p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allGeneratedAssets.map((img) => (
                  <div key={img.id} className="group/history relative shrink-0">
                    <button
                      onClick={() => setSelectedGeneratedImage(img)}
                      className={cn(
                        'relative aspect-square h-32 w-32 overflow-hidden rounded-xl border-2 transition-all',
                        selectedGeneratedImage?.id === img.id
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-primary/50'
                      )}
                    >
                      <Image src={img.url} alt="Generated" fill className="object-cover" unoptimized />
                      {img.isPinned && (
                        <Pin className="absolute left-1.5 top-1.5 h-4 w-4 text-primary drop-shadow" />
                      )}
                      {img.approvalStatus === 'approved' && (
                        <div className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 shadow">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await apiClient.deleteGeneratedImage(img.id);
                          setNewlyGeneratedImages((prev) => prev.filter((i) => i.id !== img.id));
                          queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
                          if (selectedGeneratedImage?.id === img.id) {
                            setSelectedGeneratedImage(null);
                          }
                          toast.success('Image deleted');
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Failed to delete');
                        }
                      }}
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover/history:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
