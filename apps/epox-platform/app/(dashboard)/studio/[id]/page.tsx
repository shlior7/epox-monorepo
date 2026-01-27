'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/spinner';
import { SceneLoader } from '@/components/ui/scene-loader';
import { AssetCard } from '@/components/studio/AssetCard/AssetCard';
import { ThumbnailNav } from '@/components/studio/ThumbnailNav';
import { ImageEditOverlay } from '@/components/ui/image-edit-overlay';
import { ImageEditorModal } from '@/components/studio/modals/ImageEditorModal';
import {
  UnifiedStudioConfigPanel,
  ConfigPanelProvider,
  type SceneTypeInfo,
} from '@/components/studio';
import type { GeneratedAsset } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import { useGenerationPolling } from '@/lib/hooks/use-generation-polling';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  Grid3X3,
  LayoutList,
  Loader2,
  Package,
  Sparkles,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type {
  FlowGenerationSettings,
  SceneTypeInspirationMap,
  SubjectAnalysis,
  VideoPromptSettings,
  BubbleValue,
} from 'visualizer-types';
import {
  CAMERA_MOTION_OPTIONS,
  IMAGE_ASPECT_RATIO_OPTIONS,
  VIDEO_TYPE_OPTIONS,
  VIDEO_ASPECT_RATIO_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
  formatAspectRatioDisplay,
} from 'visualizer-types';
import type { ImageAspectRatio } from 'visualizer-types';

interface StudioPageProps {
  params: Promise<{ id: string }>;
}

// Output quality options
const QUALITY_OPTIONS = [
  { value: '1k', label: '1K', description: 'Fast' },
  { value: '2k', label: '2K', description: 'Balanced' },
  { value: '4k', label: '4K', description: 'High Quality' },
] as const;

// Aspect ratio options with icons
const ASPECT_RATIO_ICONS: Record<ImageAspectRatio, string> = {
  '1:1': '◻',
  '2:3': '▯',
  '3:2': '▭',
  '3:4': '▯',
  '4:3': '▱',
  '9:16': '▯',
  '16:9': '▭',
  '21:9': '▭',
};

type StudioTab = 'images' | 'video';
type ViewMode = 'list' | 'grid';

interface VideoPreset {
  id: string;
  name: string;
  settings: VideoPromptSettings;
}

const VIDEO_PRESETS_STORAGE_KEY = 'epox_video_presets_v1';

export default function StudioPage({ params }: StudioPageProps) {
  const { id: studioId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Get productId and tab from URL params
  const productIdFromUrl = searchParams.get('productId');
  const tabFromUrl = searchParams.get('tab') as StudioTab | null;

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

  const manualImageCompletionRef = useRef(false);
  const [imageGenerationTracker, setImageGenerationTracker] = useState<{
    expectedCount: number;
    baselineIds: string[];
  } | null>(null);

  // Generation state with robust polling
  const {
    isGenerating,
    progress: generationProgress,
    status: generationStatus,
    error: generationError,
    retryCount: generationRetryCount,
    startGeneration,
    cancelGeneration,
  } = useGenerationPolling({
    sessionId: studioId,
    onComplete: () => {
      if (manualImageCompletionRef.current) {
        manualImageCompletionRef.current = false;
        return;
      }
      setImageGenerationTracker(null);
      queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
      toast.success('Generation complete!');
    },
    onError: (error) => {
      manualImageCompletionRef.current = false;
      setImageGenerationTracker(null);
      toast.error(error || 'Generation failed');
    },
  });

  const {
    isGenerating: isGeneratingVideo,
    progress: videoProgress,
    status: videoStatus,
    error: videoError,
    retryCount: videoRetryCount,
    startGeneration: startVideoGeneration,
    cancelGeneration: cancelVideoGeneration,
  } = useGenerationPolling({
    sessionId: `${studioId}-video`,
    onComplete: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
      toast.success('Video generation complete!');
    },
    onError: (error) => {
      toast.error(error || 'Video generation failed');
    },
  });

  // ===== STATE =====
  // View mode and refs
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const mainViewRef = useRef<HTMLDivElement>(null);

  // Tab from URL (defaults to 'images')
  const activeTab: StudioTab = tabFromUrl === 'video' ? 'video' : 'images';

  // Helper to change tab via URL
  const handleSetActiveTab = useCallback(
    (tab: StudioTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Section 1: Scene Style
  const [generalInspiration, setGeneralInspiration] = useState<BubbleValue[]>([]);
  const [sceneTypeInspiration, setSceneTypeInspiration] = useState<SceneTypeInspirationMap>({});
  const [useSceneTypeInspiration, setUseSceneTypeInspiration] = useState(true);
  const [sceneType, setSceneType] = useState<string>('');
  const [customSceneType, setCustomSceneType] = useState('');

  // Track previous values to avoid unnecessary saves
  const prevSettingsRef = useRef<string>('');

  // Section 2: Product Details (read-only from product analysis)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedBaseImageId, setSelectedBaseImageId] = useState<string | null>(null);

  // Section 3: User Prompt
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedPromptPreview, setGeneratedPromptPreview] = useState<string | null>(null);

  // Section 4: Output Settings
  const [settings, setSettings] = useState({
    aspectRatio: '1:1' as ImageAspectRatio,
    quality: '2k' as '1k' | '2k' | '4k',
    variantsCount: 1,
  });

  // Video Settings
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoSettings, setVideoSettings] = useState<VideoPromptSettings>({});
  const [videoPresetId, setVideoPresetId] = useState<string | null>(null);
  const [videoPresetName, setVideoPresetName] = useState('');
  const [videoPresets, setVideoPresets] = useState<VideoPreset[]>([]);
  const [videoExpandedSection, setVideoExpandedSection] = useState<string | null>('video-inputs');
  const [videoSource, setVideoSource] = useState<'base' | 'generated'>('base');
  const [isEnhancingVideoPrompt, setIsEnhancingVideoPrompt] = useState(false);

  // Generated images
  const [newlyGeneratedImages, setNewlyGeneratedImages] = useState<GeneratedAsset[]>([]);
  const [selectedGeneratedImage, setSelectedGeneratedImage] = useState<GeneratedAsset | null>(null);
  const [selectedGeneratedVideo, setSelectedGeneratedVideo] = useState<GeneratedAsset | null>(null);

  // Image editor state
  const [gridEditorOpen, setGridEditorOpen] = useState(false);
  const [gridEditingAsset, setGridEditingAsset] = useState<GeneratedAsset | null>(null);

  // UI state - multi-open accordions (support multiple open at once)
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'scene-style',
    'output-settings',
  ]);
  const [videoExpandedSections, setVideoExpandedSections] = useState<string[]>([
    'video-inputs',
    'video-prompt',
  ]);
  const [showAllProductHistory, setShowAllProductHistory] = useState(false);

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
    queryKey: [
      'generated-images',
      studioId,
      showAllProductHistory ? 'products' : 'flow',
      productIds.join(','),
    ],
    queryFn: async () => {
      if (showAllProductHistory && productIds.length > 0) {
        return apiClient.listGeneratedImages({
          productIds,
          limit: 50,
          sort: 'date',
        });
      }
      return apiClient.listGeneratedImages({
        flowId: studioId,
        limit: 50,
        sort: 'date',
      });
    },
    refetchInterval: isGenerating || isGeneratingVideo ? 3000 : false,
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

  const videoSourceUrl = useMemo(() => {
    if (videoSource === 'generated') {
      return selectedGeneratedImage?.url ?? null;
    }
    return selectedBaseImageUrl;
  }, [videoSource, selectedGeneratedImage, selectedBaseImageUrl]);

  const allGeneratedAssets = useMemo(() => {
    const existing = generatedImagesData?.images || [];
    const combined = [...newlyGeneratedImages, ...existing];
    return combined.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
  }, [generatedImagesData?.images, newlyGeneratedImages]);

  const imageAssets = useMemo(
    () => allGeneratedAssets.filter((asset) => asset.assetType !== 'video'),
    [allGeneratedAssets]
  );

  const videoAssets = useMemo(
    () => allGeneratedAssets.filter((asset) => asset.assetType === 'video'),
    [allGeneratedAssets]
  );

  const newGeneratedImageCount = useMemo(() => {
    if (!imageGenerationTracker) return 0;
    const baselineIds = new Set(imageGenerationTracker.baselineIds);
    let count = 0;
    for (const asset of imageAssets) {
      if (!baselineIds.has(asset.id)) {
        count += 1;
      }
    }
    return count;
  }, [imageAssets, imageGenerationTracker]);

  const effectiveImageProgress = useMemo(() => {
    if (!isGenerating || !imageGenerationTracker) return generationProgress;
    const expectedCount = imageGenerationTracker.expectedCount;
    if (!expectedCount || expectedCount <= 0) return generationProgress;
    const progressFromAssets = Math.min(95, (newGeneratedImageCount / expectedCount) * 100);
    return Math.max(generationProgress, progressFromAssets);
  }, [generationProgress, imageGenerationTracker, isGenerating, newGeneratedImageCount]);

  // Scene type groups from inspiration
  const sceneTypeGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const [sceneType, data] of Object.entries(sceneTypeInspiration)) {
      groups[sceneType] = data.bubbles?.length ?? 0;
    }
    return groups;
  }, [sceneTypeInspiration]);

  // Matched scene type for current product
  const matchedSceneType = useMemo(() => {
    if (!subjectAnalysis?.nativeSceneTypes || Object.keys(sceneTypeInspiration).length === 0) {
      return null;
    }
    for (const sceneType of subjectAnalysis.nativeSceneTypes) {
      if (sceneTypeInspiration[sceneType]) {
        return sceneType;
      }
    }
    return Object.keys(sceneTypeInspiration)[0] || null;
  }, [subjectAnalysis, sceneTypeInspiration]);

  // Current tab assets
  const currentAssets = activeTab === 'images' ? imageAssets : videoAssets;

  // Configuration object for asset cards
  const assetConfiguration = useMemo(
    () => ({
      sceneType: matchedSceneType ?? undefined,
      aspectRatio: settings.aspectRatio,
      quality: settings.quality,
    }),
    [matchedSceneType, settings.aspectRatio, settings.quality]
  );

  // ===== EFFECTS =====

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(VIDEO_PRESETS_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        // Validate parsed data is an array
        if (!Array.isArray(parsed)) {
          console.warn('Invalid video presets format, resetting');
          localStorage.removeItem(VIDEO_PRESETS_STORAGE_KEY);
          return;
        }
        // Filter and validate each preset
        const validPresets = parsed.filter((item): item is VideoPreset => {
          if (typeof item !== 'object' || item === null) return false;
          const preset = item as Record<string, unknown>;
          return (
            typeof preset.id === 'string' &&
            typeof preset.name === 'string' &&
            (preset.settings === undefined || typeof preset.settings === 'object')
          );
        });
        setVideoPresets(validPresets);
        // Update localStorage with sanitized data if any items were filtered out
        if (validPresets.length !== parsed.length) {
          localStorage.setItem(VIDEO_PRESETS_STORAGE_KEY, JSON.stringify(validPresets));
        }
      }
    } catch (error) {
      console.warn('Failed to load video presets:', error);
      // Clear corrupted data
      localStorage.removeItem(VIDEO_PRESETS_STORAGE_KEY);
    }
  }, []);

  // No longer needed - multi-open accordions don't need tab-based reset

  // Initialize from flow settings
  useEffect(() => {
    if (flowData?.settings) {
      const s = flowData.settings as any;
      if (Array.isArray(s.generalInspiration)) setGeneralInspiration(s.generalInspiration);
      if (s.sceneTypeInspiration) setSceneTypeInspiration(s.sceneTypeInspiration as SceneTypeInspirationMap);
      if (typeof s.useSceneTypeInspiration === 'boolean') setUseSceneTypeInspiration(s.useSceneTypeInspiration);

      // Handle sceneType
      if (s.sceneType) {
        const nativeTypes = products?.[0]?.analysis?.subject?.nativeSceneTypes || [];
        if (nativeTypes.includes(s.sceneType)) {
          setSceneType(s.sceneType);
        } else {
          setSceneType('Custom');
          setCustomSceneType(s.sceneType);
        }
      }

      if (s.userPrompt) setUserPrompt(s.userPrompt);
      if (s.aspectRatio) setSettings((prev) => ({ ...prev, aspectRatio: s.aspectRatio }));
      if (s.imageQuality)
        setSettings((prev) => ({ ...prev, quality: s.imageQuality as '1k' | '2k' | '4k' }));
      if (s.variantsPerProduct) setSettings((prev) => ({ ...prev, variantsCount: s.variantsPerProduct! }));
      if (s.video) {
        setVideoPrompt(s.video.prompt ?? '');
        setVideoSettings({
          videoType: s.video.settings?.videoType,
          cameraMotion: s.video.settings?.cameraMotion,
          aspectRatio: s.video.settings?.aspectRatio,
          resolution: s.video.settings?.resolution,
          sound: s.video.settings?.sound,
          soundPrompt: s.video.settings?.soundPrompt,
        });
        setVideoPresetId(s.video.presetId ?? null);
      }
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
  const prevImageCount = useRef(0);
  const prevVideoCount = useRef(0);
  const prevLatestVideoId = useRef<string | null>(null);

  useEffect(() => {
    if (imageAssets.length > prevImageCount.current && imageAssets.length > 0) {
      setSelectedGeneratedImage(imageAssets[0]);
    }
    prevImageCount.current = imageAssets.length;
  }, [imageAssets]);

  useEffect(() => {
    if (!isGenerating || !imageGenerationTracker) return;
    const expectedCount = imageGenerationTracker.expectedCount;
    if (!expectedCount || expectedCount <= 0) return;
    if (newGeneratedImageCount < expectedCount) return;

    manualImageCompletionRef.current = true;
    setImageGenerationTracker(null);
    cancelGeneration();
    queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
    toast.success('Generation complete!');
  }, [
    cancelGeneration,
    imageGenerationTracker,
    isGenerating,
    newGeneratedImageCount,
    queryClient,
    studioId,
  ]);

  useEffect(() => {
    const latestVideoId = videoAssets[0]?.id ?? null;
    const hasNewVideo =
      (videoAssets.length > prevVideoCount.current && videoAssets.length > 0) ||
      (latestVideoId && latestVideoId !== prevLatestVideoId.current);

    if (hasNewVideo && videoAssets.length > 0) {
      setSelectedGeneratedVideo(videoAssets[0]);
      if (isGeneratingVideo) {
        cancelVideoGeneration();
      }
    }

    prevVideoCount.current = videoAssets.length;
    prevLatestVideoId.current = latestVideoId;
  }, [videoAssets, isGeneratingVideo, cancelVideoGeneration]);

  useEffect(() => {
    if (videoSource === 'generated' && !selectedGeneratedImage) {
      setVideoSource('base');
    }
  }, [videoSource, selectedGeneratedImage]);

  // ===== HANDLERS =====

  const saveSettings = useCallback(async () => {
    try {
      const normalizedVideoSettings: VideoPromptSettings = {
        videoType: videoSettings.videoType,
        cameraMotion: videoSettings.cameraMotion,
        aspectRatio: videoSettings.aspectRatio,
        resolution: videoSettings.resolution,
        sound: videoSettings.sound,
        soundPrompt: videoSettings.soundPrompt,
      };

      const effectiveSceneType = sceneType === 'Custom' ? customSceneType : sceneType;

      // Create settings object for comparison
      const currentSettings = JSON.stringify({
        generalInspiration,
        sceneTypeInspiration,
        useSceneTypeInspiration,
        sceneType: effectiveSceneType,
        userPrompt,
        aspectRatio: settings.aspectRatio,
        quality: settings.quality,
        variantsCount: settings.variantsCount,
        videoPrompt,
        videoSettings: normalizedVideoSettings,
        videoPresetId,
      });

      // Skip save if settings haven't changed
      if (prevSettingsRef.current === currentSettings) {
        return;
      }
      prevSettingsRef.current = currentSettings;

      await apiClient.updateStudioSettings(studioId, {
        generalInspiration: generalInspiration as any,
        sceneTypeInspiration: sceneTypeInspiration as any,
        useSceneTypeInspiration,
        sceneType: effectiveSceneType || undefined,
        userPrompt: userPrompt || undefined,
        aspectRatio: settings.aspectRatio,
        imageQuality: settings.quality,
        variantsPerProduct: settings.variantsCount,
        video: {
          prompt: videoPrompt || undefined,
          settings: normalizedVideoSettings,
          presetId: videoPresetId,
        },
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [
    studioId,
    generalInspiration,
    sceneTypeInspiration,
    useSceneTypeInspiration,
    sceneType,
    customSceneType,
    userPrompt,
    settings.aspectRatio,
    settings.quality,
    settings.variantsCount,
    videoPrompt,
    videoSettings,
    videoPresetId,
  ]);

  // Auto-save video settings when they change
  useEffect(() => {
    if (activeTab !== 'video') return;
    const timeoutId = setTimeout(() => {
      if (flowData?.settings) {
        saveSettings();
      }
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [activeTab, videoPrompt, videoSettings, videoPresetId, flowData?.settings, saveSettings]);

  const persistVideoPresets = (presets: VideoPreset[]) => {
    setVideoPresets(presets);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(VIDEO_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.warn('Failed to save video presets:', error);
    }
  };

  const handleSaveVideoPreset = async () => {
    const name = videoPresetName.trim();
    if (!name) {
      toast.error('Preset name is required');
      return;
    }
    // Check for duplicate names (case-insensitive)
    const isDuplicate = videoPresets.some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      toast.error('A preset with this name already exists');
      return;
    }
    const preset: VideoPreset = {
      id: `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      settings: { ...videoSettings },
    };
    const updated = [preset, ...videoPresets];
    persistVideoPresets(updated);
    setVideoPresetId(preset.id);
    setVideoPresetName('');
    try {
      await saveSettings();
    } catch (error) {
      console.error('Failed to save settings after preset creation:', error);
    }
  };

  const handleApplyVideoPreset = (presetIdToApply: string) => {
    const preset = videoPresets.find((p) => p.id === presetIdToApply);
    if (!preset) return;
    setVideoSettings(preset.settings);
    setVideoPresetId(preset.id);
    saveSettings();
  };

  const buildVideoPrompt = (basePrompt: string, settings: VideoPromptSettings) => {
    const lines = [basePrompt.trim()];
    if (settings.videoType) lines.push(`Video type: ${settings.videoType}`);
    if (settings.cameraMotion) lines.push(`Camera motion: ${settings.cameraMotion}`);
    if (settings.aspectRatio) lines.push(`Aspect ratio: ${settings.aspectRatio}`);
    if (settings.resolution) lines.push(`Resolution: ${settings.resolution}`);
    if (settings.sound) {
      if (settings.sound === 'custom' && settings.soundPrompt?.trim()) {
        lines.push(`Sound: ${settings.soundPrompt.trim()}`);
      } else if (settings.sound === 'with_music') {
        lines.push('Sound: with music');
      } else if (settings.sound === 'no_sound') {
        lines.push('Sound: no sound');
      } else if (settings.sound === 'automatic') {
        lines.push('Sound: automatic');
      } else {
        lines.push(`Sound: ${settings.sound}`);
      }
    }
    return lines.filter(Boolean).join('\n');
  };

  const updateVideoSettings = (updates: Partial<VideoPromptSettings>) => {
    setVideoSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleEnhanceVideoPrompt = async () => {
    if (!videoSourceUrl) {
      toast.error('Select a source image to enhance the prompt');
      return;
    }

    setIsEnhancingVideoPrompt(true);
    try {
      const response = await fetch('/api/enhance-video-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceImageUrl: videoSourceUrl,
          videoType: videoSettings.videoType,
          settings: {
            videoType: videoSettings.videoType,
            cameraMotion: videoSettings.cameraMotion,
            aspectRatio: videoSettings.aspectRatio,
            resolution: videoSettings.resolution,
            sound: videoSettings.sound,
            soundPrompt: videoSettings.soundPrompt,
          },
          userPrompt: videoPrompt,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to enhance prompt');
      }

      if (data.enhancedPrompt) {
        setVideoPrompt(data.enhancedPrompt);
        toast.success('Video prompt enhanced');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enhance prompt');
    } finally {
      setIsEnhancingVideoPrompt(false);
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
          generalInspiration,
          sceneTypeInspiration,
          useSceneTypeInspiration,
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
      manualImageCompletionRef.current = false;
      // First, generate the prompt via Art Director
      let prompt = '';
      if (subjectAnalysis && (generalInspiration.length > 0 || Object.keys(sceneTypeInspiration).length > 0)) {
        const artDirectorResponse = await fetch('/api/art-director', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectAnalysis,
            generalInspiration,
            sceneTypeInspiration,
            useSceneTypeInspiration,
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

      // Extract reference image URLs from reference bubbles
      const referenceImageUrls: string[] = [];
      for (const bubble of generalInspiration) {
        if (bubble.type === 'reference' && bubble.image?.url) {
          referenceImageUrls.push(bubble.image.url);
        }
      }

      const result = await apiClient.generateImages({
        sessionId: studioId,
        productIds: products.map((p: any) => p.id),
        prompt: prompt || undefined,
        productImageUrls: selectedBaseImageUrl ? [selectedBaseImageUrl] : undefined,
        inspirationImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
        settings: {
          aspectRatio: settings.aspectRatio,
          imageQuality: settings.quality.toLowerCase() as '1k' | '2k' | '4k',
          variantsPerProduct: settings.variantsCount,
        },
      });

      console.log('🚀 Generation started:', result);

      if (result.status === 'queued' && result.jobId) {
        setImageGenerationTracker({
          expectedCount: result.expectedImageCount ?? products.length * settings.variantsCount,
          baselineIds: imageAssets.map((asset) => asset.id),
        });
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

  const handleGenerateVideo = async () => {
    if (!currentProduct) return;
    if (!videoSourceUrl) {
      toast.error(
        videoSource === 'generated'
          ? 'Select a generated image to generate video'
          : 'Select a base image to generate video'
      );
      return;
    }
    if (!videoPrompt.trim()) {
      toast.error('Enter a video prompt');
      return;
    }

    try {
      const prompt = buildVideoPrompt(videoPrompt, videoSettings);
      const result = await apiClient.generateVideo({
        sessionId: studioId,
        productId: currentProduct.id,
        sourceImageUrl: videoSourceUrl,
        prompt,
        settings: {
          aspectRatio: videoSettings.aspectRatio ?? '16:9',
          resolution: videoSettings.resolution ?? '720p',
        },
      });

      // Handle different response statuses
      switch (result.status) {
        case 'queued':
          if (result.jobId) {
            startVideoGeneration(result.jobId);
          } else {
            // Queued without jobId is an error condition
            console.error('Video queued but no job ID returned:', result);
            toast.error('Video queued but no job ID returned — please retry');
          }
          break;
        case 'completed':
          toast.success('Video generation complete!');
          await queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
          break;
        case 'failed':
          toast.error(result.error ?? result.message ?? 'Video generation failed');
          break;
        default:
          // Handle any unexpected status
          toast.info(`Video generation status: ${result.status ?? 'unknown'}`);
      }
    } catch (error) {
      console.error('❌ Video generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Video generation failed');
    }
  };

  // Scroll to asset when thumbnail clicked
  const handleThumbnailClick = useCallback((assetId: string) => {
    const element = document.getElementById(`asset-${assetId}`);
    if (element && mainViewRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Asset action handlers
  const handlePinAsset = async (asset: GeneratedAsset) => {
    try {
      await apiClient.togglePinImage(asset.id);
      queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
      toast.success(asset.isPinned ? 'Unpinned' : 'Pinned');
    } catch (error) {
      toast.error('Failed to toggle pin');
    }
  };

  const handleApproveAsset = async (asset: GeneratedAsset) => {
    try {
      await apiClient.updateImageApproval(asset.id, 'approved');
      queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
      toast.success('Approved');
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleDownloadAsset = (asset: GeneratedAsset) => {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = `${currentProduct?.name || 'generated'}-${asset.id}.${asset.assetType === 'video' ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteAsset = async (asset: GeneratedAsset) => {
    try {
      await apiClient.deleteGeneratedImage(asset.id);
      setNewlyGeneratedImages((prev) => prev.filter((i) => i.id !== asset.id));
      queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
      if (activeTab === 'images' && selectedGeneratedImage?.id === asset.id) {
        setSelectedGeneratedImage(null);
      }
      if (activeTab === 'video' && selectedGeneratedVideo?.id === asset.id) {
        setSelectedGeneratedVideo(null);
      }
      toast.success('Deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // ===== PREPARE SCENE TYPES FOR CONFIG PANEL =====

  const configPanelSceneTypes: SceneTypeInfo[] = useMemo(() => {
    if (!currentProduct) return [];

    // Get all unique scene types from the current product
    const sceneTypes = currentProduct.sceneTypes || [];

    // If no scene types exist, try to get a default one
    if (sceneTypes.length === 0) {
      const defaultSceneType =
        flowData?.settings?.sceneType ||
        currentProduct?.selectedSceneType ||
        currentProduct?.analysis?.subject?.nativeSceneTypes?.[0];

      // If we have a default scene type, use it
      if (defaultSceneType) {
        return [
          {
            sceneType: defaultSceneType,
            productCount: 1,
            productIds: [currentProduct.id],
          },
        ];
      }

      // No scene type at all - return empty array
      return [];
    }

    // Create scene type info for each scene type
    return sceneTypes.map((st: any) => ({
      sceneType: st,
      productCount: 1,
      productIds: [currentProduct.id],
    }));
  }, [currentProduct, flowData?.settings?.sceneType]);

  const selectedSceneTypeValue = useMemo(() => {
    // Priority: state sceneType > flow settings > product selected > product first scene type > native scene type
    if (sceneType) return sceneType;

    if (flowData?.settings?.sceneType) return flowData.settings.sceneType;

    if (currentProduct?.selectedSceneType) return currentProduct.selectedSceneType;

    if (currentProduct?.sceneTypes?.length > 0) return currentProduct.sceneTypes[0];

    // Fallback to native scene type from analysis
    if (currentProduct?.analysis?.subject?.nativeSceneTypes?.[0]) {
      return currentProduct.analysis.subject.nativeSceneTypes[0];
    }

    // No scene type - return empty string
    return '';
  }, [sceneType, flowData?.settings?.sceneType, currentProduct]);

  // Prepare base images for config panel
  const configPanelBaseImages = useMemo(() => {
    if (!currentProduct?.baseImages) return [];
    return currentProduct.baseImages.map((img: any) => ({
      id: img.id,
      url: img.url,
      thumbnailUrl: img.thumbnailUrl || img.url,
    }));
  }, [currentProduct]);

  // Handler for scene type change
  const handleSceneTypeChange = useCallback(
    async (newSceneType: string) => {
      setSceneType(newSceneType);
      if (currentProduct) {
        try {
          // Add scene type to product's sceneTypes array if not already there
          const currentSceneTypes = currentProduct.sceneTypes || [];
          const updatedSceneTypes = currentSceneTypes.includes(newSceneType)
            ? currentSceneTypes
            : [...currentSceneTypes, newSceneType];

          await apiClient.updateProduct(currentProduct.id, {
            selectedSceneType: newSceneType,
            sceneTypes: updatedSceneTypes,
          });

          // Refresh product data to reflect the change
          queryClient.invalidateQueries({ queryKey: ['products', productIds] });
        } catch (error) {
          console.error('Failed to update scene type:', error);
        }
      }
    },
    [currentProduct, productIds, queryClient]
  );

  // Handler for base image selection
  const handleBaseImageSelect = useCallback(
    async (imageId: string) => {
      setSelectedBaseImageId(imageId);
      if (currentProduct) {
        const image = currentProduct.baseImages?.find((img: any) => img.id === imageId);
        if (image) {
          try {
            await apiClient.updateFlowBaseImages(studioId, {
              [currentProduct.id]: image.url,
            });
          } catch (error) {
            console.error('Failed to save base image selection:', error);
          }
        }
      }
    },
    [currentProduct, studioId]
  );

  // ===== LOADING STATE =====

  if (isLoadingFlow || isLoadingProducts) {
    return (
      <div className="flex h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-xl">
          <Link href="/home">
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
          <Link href="/home">
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
          <Link href="/home">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const primaryImageUrl = currentProduct?.baseImages?.[0]?.url;

  // ===== RENDER =====

  return (
    <ConfigPanelProvider
      initialState={{
        generalInspiration,
        sceneTypeInspiration,
        useSceneTypeInspiration,
        userPrompt,
        applyCollectionPrompt: !!flowData?.collectionSessionId,
        outputSettings: {
          aspectRatio: settings.aspectRatio,
          quality: settings.quality,
          variantsCount: settings.variantsCount,
        },
      }}
    >
      <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href={
              flowData?.collectionSessionId
                ? `/studio/collections/${flowData.collectionSessionId}`
                : '/home'
            }
          >
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          {/* Breadcrumb when flow belongs to a collection */}
          {flowData?.collectionSessionId && flowData?.collectionName && (
            <div className="flex items-center gap-1.5 text-sm">
              <Link
                href={`/studio/collections/${flowData.collectionSessionId}`}
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="max-w-[120px] truncate">{flowData.collectionName}</span>
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-secondary">
              {primaryImageUrl ? (
                <Image
                  src={primaryImageUrl}
                  alt={currentProduct?.name || ''}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-sm font-semibold">{currentProduct?.name}</h1>
              {products.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  +{products.length - 1} more products
                </p>
              )}
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout - Responsive: stacked on small screens, side-by-side on larger */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left Panel - Config (4 Sections) */}
        {/* Unified Config Panel */}
        <UnifiedStudioConfigPanel
          mode="single-flow"
          sceneTypes={configPanelSceneTypes}
          selectedSceneType={selectedSceneTypeValue}
          onSceneTypeChange={handleSceneTypeChange}
          collectionSessionId={flowData?.collectionSessionId ?? undefined}
          collectionName={flowData?.collectionName ?? undefined}
          collectionSettings={flowData?.collectionSettings}
          flowSceneType={flowData?.flowSceneType ?? undefined}
          collectionPrompt={flowData?.collectionSettings?.userPrompt}
          onSave={saveSettings}
          onGenerate={() => {
            if (activeTab === 'images') {
              handleGenerate();
            } else {
              handleGenerateVideo();
            }
          }}
          isGenerating={activeTab === 'images' ? isGenerating : isGeneratingVideo}
          isSaving={false}
          baseImages={configPanelBaseImages}
          selectedBaseImageId={selectedBaseImageId || ''}
          onBaseImageSelect={handleBaseImageSelect}
          className="h-full"
        />
        {/* Main Content Area */}
        <main className="flex min-w-0 flex-1 bg-background/50">
          {/* Scrollable Main View */}
          <div
            ref={mainViewRef}
            className={cn('flex-1 overflow-y-auto', viewMode === 'grid' ? 'p-4' : 'p-4 md:p-6')}
          >
            {/* Generating State */}
            {(isGenerating || isGeneratingVideo) && (
              <div className="mb-6 flex items-center justify-center rounded-xl border border-border bg-card p-8">
                <SceneLoader
                  progress={activeTab === 'images' ? effectiveImageProgress : videoProgress}
                  status={
                    (activeTab === 'images' ? generationStatus : videoStatus) === 'retrying'
                      ? `Retrying... (Attempt ${(activeTab === 'images' ? generationRetryCount : videoRetryCount) + 1}/3)`
                      : (activeTab === 'images' ? generationStatus : videoStatus) === 'polling'
                        ? activeTab === 'images'
                          ? 'Building Your Scene'
                          : 'Creating Your Video'
                        : 'Starting Generation'
                  }
                  label={
                    (activeTab === 'images' ? generationStatus : videoStatus) === 'retrying'
                      ? (activeTab === 'images' ? generationError : videoError) ||
                      'Encountered an issue, retrying...'
                      : (activeTab === 'images' ? effectiveImageProgress : videoProgress) > 0
                        ? activeTab === 'images'
                          ? 'AI is creating your visualizations'
                          : 'AI is animating your scene'
                        : 'Preparing your request...'
                  }
                  type={activeTab === 'images' ? 'image' : 'video'}
                />
              </div>
            )}

            {/* Error State */}
            {((activeTab === 'images' && generationStatus === 'failed' && generationError) ||
              (activeTab === 'video' && videoStatus === 'failed' && videoError)) && (
                <div className="mb-6 flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-8 text-center">
                  <div className="rounded-full bg-destructive/10 p-4">
                    <X className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                      {activeTab === 'images' ? 'Generation Failed' : 'Video Generation Failed'}
                    </h3>
                    <p className="mb-4 max-w-md text-sm text-muted-foreground">
                      {activeTab === 'images' ? generationError : videoError}
                    </p>
                  </div>
                  <Button
                    onClick={activeTab === 'images' ? handleGenerate : handleGenerateVideo}
                    variant="default"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              )}

            {/* Assets Display */}
            {currentAssets.length === 0 && !isGenerating && !isGeneratingVideo ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  icon={activeTab === 'images' ? Sparkles : Video}
                  title={activeTab === 'images' ? 'Ready to Generate' : 'Ready to Generate Video'}
                  description={
                    activeTab === 'images'
                      ? 'Add inspiration images, configure your settings, and click Generate to create stunning product visualizations.'
                      : 'Pick a base image, add a motion prompt, and generate a video.'
                  }
                />
              </div>
            ) : viewMode === 'list' ? (
              // List View - Scrollable Asset Cards
              <div className="mx-auto max-w-5xl space-y-6">
                {currentAssets.map((asset) => (
                  <div key={asset.id} id={`asset-${asset.id}`}>
                    <AssetCard
                      asset={asset}
                      baseImage={
                        selectedBaseImageUrl
                          ? { url: selectedBaseImageUrl, name: currentProduct?.name }
                          : undefined
                      }
                      configuration={assetConfiguration}
                      isPinned={asset.isPinned}
                      isApproved={asset.approvalStatus === 'approved'}
                      isRejected={asset.approvalStatus === 'rejected'}
                      onPin={() => handlePinAsset(asset)}
                      onApprove={() => handleApproveAsset(asset)}
                      onDownload={() => handleDownloadAsset(asset)}
                      onDelete={() => handleDeleteAsset(asset)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // Grid View
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {currentAssets.map((asset) => (
                  <div
                    key={asset.id}
                    id={`asset-${asset.id}`}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all hover:ring-2 hover:ring-primary/50"
                    onClick={() => {
                      if (activeTab === 'images') {
                        setSelectedGeneratedImage(asset);
                      } else {
                        setSelectedGeneratedVideo(asset);
                      }
                      setViewMode('list');
                      setTimeout(() => handleThumbnailClick(asset.id), 100);
                    }}
                  >
                    {asset.assetType === 'video' ? (
                      <video
                        src={asset.url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <ImageEditOverlay
                        onEdit={() => {
                          setGridEditingAsset(asset);
                          setGridEditorOpen(true);
                        }}
                        className="h-full w-full"
                        testId={`grid-asset-${asset.id}-edit-overlay`}
                      >
                        <Image
                          src={asset.url}
                          alt="Generated"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </ImageEditOverlay>
                    )}

                    {/* Hover overlay with quick actions */}
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex w-full items-center justify-between p-2">
                        <div className="flex gap-1">
                          {asset.isPinned && (
                            <Badge variant="secondary" className="text-[10px]">
                              Pinned
                            </Badge>
                          )}
                          {asset.approvalStatus === 'approved' && (
                            <Badge variant="success" className="text-[10px]">
                              Approved
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Thumbnail Nav */}
          {currentAssets.length > 0 && viewMode === 'list' && (
            <div className="hidden border-l border-border bg-card/30 lg:block">
              <ThumbnailNav
                items={currentAssets.map((asset) => ({
                  id: asset.id,
                  thumbnailUrl: asset.url,
                  isVideo: asset.assetType === 'video',
                }))}
                onItemClick={handleThumbnailClick}
              />
            </div>
          )}
        </main>
      </div>

      {/* Image Editor Modal for grid view */}
      {gridEditingAsset && gridEditingAsset.assetType !== 'video' && (
        <ImageEditorModal
          open={gridEditorOpen}
          onOpenChange={setGridEditorOpen}
          imageUrl={gridEditingAsset.url}
          imageType="generated"
          imageId={gridEditingAsset.id}
          productId={currentProduct?.id}
          onSave={(result) => {
            // TODO: Handle save - refresh assets after save
            queryClient.invalidateQueries({ queryKey: ['generated-images', studioId] });
          }}
        />
      )}
      </div>
    </ConfigPanelProvider>
  );
}
