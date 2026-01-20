'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
  MinimalAccordion,
  MinimalAccordionItem,
  MinimalAccordionTrigger,
  MinimalAccordionContent,
} from '@/components/ui/minimal-accordion';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { SceneLoader } from '@/components/ui/scene-loader';
import type { GeneratedAsset } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import { useGenerationPolling } from '@/lib/hooks/use-generation-polling';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  History,
  Image as ImageIcon,
  Loader2,
  Package,
  Pin,
  Sparkles,
  Trash2,
  Upload,
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
  InspirationImage,
  LightingPreset,
  SceneTypeInspirationMap,
  StylePreset,
  SubjectAnalysis,
  VideoPromptSettings,
} from 'visualizer-types';
import { CAMERA_MOTION_OPTIONS, LIGHTING_PRESETS, STYLE_PRESETS, VIDEO_TYPE_OPTIONS } from 'visualizer-types';

interface StudioPageProps {
  params: Promise<{ id: string }>;
}

// Output quality options
const QUALITY_OPTIONS = [
  { value: '1k', label: '1K', description: 'Fast' },
  { value: '2k', label: '2K', description: 'Balanced' },
  { value: '4k', label: '4K', description: 'High Quality' },
] as const;

// Aspect ratio options
const ASPECT_OPTIONS = [
  { value: '1:1', label: '1:1', icon: '◻' },
  { value: '16:9', label: '16:9', icon: '▭' },
  { value: '9:16', label: '9:16', icon: '▯' },
  { value: '4:3', label: '4:3', icon: '▱' },
] as const;

const VIDEO_DURATION_SECONDS = 5;

type StudioTab = 'images' | 'video';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const {
    isGenerating: isGeneratingVideo,
    progress: videoProgress,
    status: videoStatus,
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
    quality: '2k' as '1k' | '2k' | '4k',
    variantsCount: 4,
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

  // UI state - multi-open accordions (support multiple open at once)
  const [expandedSections, setExpandedSections] = useState<string[]>(['scene-style', 'output-settings']);
  const [videoExpandedSections, setVideoExpandedSections] = useState<string[]>(['video-inputs', 'video-prompt']);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

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
      const s = flowData.settings as FlowGenerationSettings;
      if (s.inspirationImages) setInspirationImages(s.inspirationImages);
      if (s.sceneTypeInspirations) setSceneTypeInspirations(s.sceneTypeInspirations);
      if (s.stylePreset) setStylePreset(s.stylePreset);
      if (s.lightingPreset) setLightingPreset(s.lightingPreset);
      if (s.userPrompt) setUserPrompt(s.userPrompt);
      if (s.aspectRatio) setSettings(prev => ({ ...prev, aspectRatio: s.aspectRatio }));
      if (s.imageQuality) setSettings(prev => ({ ...prev, quality: s.imageQuality as '1k' | '2k' | '4k' }));
      if (s.variantsCount) setSettings(prev => ({ ...prev, variantsCount: s.variantsCount! }));
      if (s.video) {
        setVideoPrompt(s.video.prompt ?? '');
        setVideoSettings({
          videoType: s.video.settings?.videoType,
          cameraMotion: s.video.settings?.cameraMotion,
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

  const saveSettings = useCallback(async () => {
    try {
      const normalizedVideoSettings: VideoPromptSettings = {
        videoType: videoSettings.videoType,
        cameraMotion: videoSettings.cameraMotion,
        sound: videoSettings.sound,
        soundPrompt: videoSettings.soundPrompt,
      };
      await apiClient.updateStudioSettings(studioId, {
        inspirationImages: inspirationImages as any,
        sceneTypeInspirations: sceneTypeInspirations as any,
        stylePreset,
        lightingPreset,
        userPrompt: userPrompt || undefined,
        aspectRatio: settings.aspectRatio,
        imageQuality: settings.quality,
        variantsCount: settings.variantsCount,
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
    inspirationImages,
    sceneTypeInspirations,
    stylePreset,
    lightingPreset,
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
  }, [
    activeTab,
    videoPrompt,
    videoSettings,
    videoPresetId,
    flowData?.settings,
    saveSettings,
  ]);

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
    const isDuplicate = videoPresets.some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
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

  const buildVideoPrompt = (
    basePrompt: string,
    settings: VideoPromptSettings
  ) => {
    const lines = [basePrompt.trim()];
    if (settings.videoType) lines.push(`Video type: ${settings.videoType}`);
    if (settings.cameraMotion) lines.push(`Camera motion: ${settings.cameraMotion}`);
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
          durationSeconds: VIDEO_DURATION_SECONDS,
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

      {/* Main Layout - Responsive: stacked on small screens, side-by-side on larger */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left Panel - Config (4 Sections) */}
        <aside className="flex w-full shrink-0 flex-col border-b border-border bg-card/30 lg:w-80 lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-3">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1 text-xs font-semibold">
              <button
                onClick={() => handleSetActiveTab('images')}
                className={cn(
                  'rounded-md px-2 py-2 transition-colors',
                  activeTab === 'images'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Images
              </button>
              <button
                onClick={() => handleSetActiveTab('video')}
                className={cn(
                  'rounded-md px-2 py-2 transition-colors',
                  activeTab === 'video'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Video
              </button>
            </div>
          </div>

          <div className="max-h-[40vh] flex-1 overflow-y-auto px-3 py-2 lg:max-h-none">
            {activeTab === 'images' ? (
              <MinimalAccordion
                value={expandedSections}
                onValueChange={setExpandedSections}
                defaultValue={['scene-style', 'output-settings']}
              >
                {/* Section 1: Scene Style */}
                <MinimalAccordionItem value="scene-style">
                  <MinimalAccordionTrigger
                    suffix={
                      inspirationImages.length > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {inspirationImages.length}
                        </Badge>
                      ) : null
                    }
                  >
                    Scene Style
                  </MinimalAccordionTrigger>
                  <MinimalAccordionContent>
                    <div className="space-y-4">
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
                          onChange={(e) => setStylePreset(e.target.value as StylePreset)}
                          onBlur={saveSettings}
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
                          onChange={(e) => setLightingPreset(e.target.value as LightingPreset)}
                          onBlur={saveSettings}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          {LIGHTING_PRESETS.map((lighting) => (
                            <option key={lighting} value={lighting}>{lighting}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </MinimalAccordionContent>
                </MinimalAccordionItem>

                {/* Section 2: Product Details */}
                <MinimalAccordionItem value="product-details">
                  <MinimalAccordionTrigger
                    suffix={
                      subjectAnalysis ? (
                        <Badge variant="secondary" className="text-xs">
                          Analyzed
                        </Badge>
                      ) : null
                    }
                  >
                    Product Details
                  </MinimalAccordionTrigger>
                  <MinimalAccordionContent>
                    <div className="space-y-4">
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
                  </MinimalAccordionContent>
                </MinimalAccordionItem>

                {/* Section 3: User Prompt */}
                <MinimalAccordionItem value="user-prompt">
                  <MinimalAccordionTrigger
                    suffix={
                      userPrompt ? (
                        <Badge variant="secondary" className="text-xs">
                          Custom
                        </Badge>
                      ) : null
                    }
                  >
                    Scene Prompt
                  </MinimalAccordionTrigger>
                  <MinimalAccordionContent>
                    <div className="space-y-4">
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
                  </MinimalAccordionContent>
                </MinimalAccordionItem>

                {/* Section 4: Output Settings */}
                <MinimalAccordionItem value="output-settings">
                  <MinimalAccordionTrigger>Output Settings</MinimalAccordionTrigger>
                  <MinimalAccordionContent>
                    <div className="space-y-4">
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
                  </MinimalAccordionContent>
                </MinimalAccordionItem>
              </MinimalAccordion>
            ) : (
              <MinimalAccordion
                value={videoExpandedSections}
                onValueChange={setVideoExpandedSections}
                defaultValue={['video-inputs', 'video-prompt']}
              >
                {/* Video Section: Inputs */}
                <MinimalAccordionItem value="video-inputs">
                  <MinimalAccordionTrigger>Video Inputs</MinimalAccordionTrigger>
                  <MinimalAccordionContent>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">
                          Source Image
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setVideoSource('base')}
                            className={cn(
                              'rounded-lg border-2 p-2 text-left transition-all',
                              videoSource === 'base'
                                ? 'border-primary ring-2 ring-primary/30'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {selectedBaseImageUrl ? (
                              <div className="relative aspect-square w-full overflow-hidden rounded-md">
                                <Image src={selectedBaseImageUrl} alt="Base" fill className="object-cover" unoptimized />
                              </div>
                            ) : (
                              <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">
                                Select base image
                              </div>
                            )}
                            <span className="mt-1 block text-[10px] font-medium">Base</span>
                          </button>
                          <button
                            onClick={() => setVideoSource('generated')}
                            disabled={!selectedGeneratedImage}
                            className={cn(
                              'rounded-lg border-2 p-2 text-left transition-all',
                              videoSource === 'generated'
                                ? 'border-primary ring-2 ring-primary/30'
                                : 'border-border hover:border-primary/50',
                              !selectedGeneratedImage && 'cursor-not-allowed opacity-50'
                            )}
                          >
                            {selectedGeneratedImage ? (
                              <div className="relative aspect-square w-full overflow-hidden rounded-md">
                                <Image src={selectedGeneratedImage.url} alt="Generated" fill className="object-cover" unoptimized />
                              </div>
                            ) : (
                              <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">
                                Generate an image first
                              </div>
                            )}
                            <span className="mt-1 block text-[10px] font-medium">Generated</span>
                          </button>
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Choose one image to drive the video.
                        </p>
                      </div>
                    </div>
                  </MinimalAccordionContent>
                </MinimalAccordionItem>

                {/* Video Section: Prompt */}
                <MinimalAccordionItem value="video-prompt">
                  <MinimalAccordionTrigger>Video Prompt</MinimalAccordionTrigger>
                  <MinimalAccordionContent>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">
                          Prompt
                        </label>
                        <Textarea
                          placeholder="Describe the video you want to generate..."
                          value={videoPrompt}
                          onChange={(e) => setVideoPrompt(e.target.value)}
                          onBlur={saveSettings}
                          className="min-h-[80px] resize-none text-sm"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEnhanceVideoPrompt}
                        disabled={isEnhancingVideoPrompt || !videoSourceUrl}
                        className="w-full"
                      >
                        {isEnhancingVideoPrompt ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Enhancing...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-3.5 w-3.5" />
                            Enhance Prompt
                          </>
                        )}
                      </Button>
                    </div>
                  </MinimalAccordionContent>
                </MinimalAccordionItem>

                {/* Video Section: Settings */}
                <MinimalAccordionItem value="video-settings">
                  <MinimalAccordionTrigger>Video Settings</MinimalAccordionTrigger>
                  <MinimalAccordionContent>
                    <div className="space-y-3">
                      <select
                        value={videoSettings.videoType ?? ''}
                        onChange={(e) => updateVideoSettings({ videoType: e.target.value || undefined })}
                        onBlur={saveSettings}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Video type</option>
                        {VIDEO_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <select
                        value={videoSettings.cameraMotion ?? ''}
                        onChange={(e) => updateVideoSettings({ cameraMotion: e.target.value || undefined })}
                        onBlur={saveSettings}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Camera motion</option>
                        {CAMERA_MOTION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <select
                        value={videoSettings.sound ?? 'automatic'}
                        onChange={(e) =>
                          updateVideoSettings({ sound: e.target.value as VideoPromptSettings['sound'] })
                        }
                        onBlur={saveSettings}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="automatic">Automatic sound</option>
                        <option value="with_music">With music</option>
                        <option value="no_sound">No sound</option>
                        <option value="custom">Custom sound prompt</option>
                      </select>
                      {videoSettings.sound === 'custom' && (
                        <Input
                          placeholder="Sound prompt (e.g., ambient cafe noise, soft synth)"
                          value={videoSettings.soundPrompt || ''}
                          onChange={(e) => updateVideoSettings({ soundPrompt: e.target.value })}
                          onBlur={saveSettings}
                        />
                      )}
                    </div>
                  </MinimalAccordionContent>
                </MinimalAccordionItem>

                {/* Video Section: Presets */}
                <MinimalAccordionItem value="video-presets">
                  <MinimalAccordionTrigger
                    suffix={
                      videoPresets.length > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {videoPresets.length}
                        </Badge>
                      ) : null
                    }
                  >
                    Presets
                  </MinimalAccordionTrigger>
                  <MinimalAccordionContent>
                    <div className="space-y-3">
                      <select
                        value={videoPresetId ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setVideoPresetId(value || null);
                          if (value) {
                            handleApplyVideoPreset(value);
                          }
                        }}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select preset</option>
                        {videoPresets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Preset name"
                          value={videoPresetName}
                          onChange={(e) => setVideoPresetName(e.target.value)}
                        />
                        <Button variant="outline" onClick={handleSaveVideoPreset}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </MinimalAccordionContent>
                </MinimalAccordionItem>
              </MinimalAccordion>
            )}
          </div>

          {/* Footer - Generate Button */}
          <div className="shrink-0 border-t border-border bg-card p-3">
            {activeTab === 'images' ? (
              <>
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
              </>
            ) : (
              <>
                <Button
                  variant="glow"
                  size="lg"
                  className="w-full"
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo}
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {videoProgress > 0
                        ? `Generating... ${Math.round(videoProgress)}%`
                        : 'Starting...'}
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Generate Video
                    </>
                  )}
                </Button>
                {isGeneratingVideo && (
                  <>
                    <Progress value={videoProgress} className="mt-2 h-1.5" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelVideoGeneration}
                      className="mt-2 w-full text-xs text-muted-foreground"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex min-w-0 flex-1 flex-col bg-background/50">
          {/* Center - Main Preview */}
          <div className="flex flex-1 items-center justify-center p-6">
            {activeTab === 'images' ? (
              isGenerating ? (
                <SceneLoader
                  progress={generationProgress}
                  status={generationStatus === 'polling' ? 'Building Your Scene' : 'Starting Generation'}
                  label={generationProgress > 0 ? 'AI is creating your visualizations' : 'Preparing your generation request...'}
                  type="image"
                />
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
              )
            ) : isGeneratingVideo ? (
              <SceneLoader
                progress={videoProgress}
                status={videoStatus === 'polling' ? 'Creating Your Video' : 'Starting Video Generation'}
                label={videoProgress > 0 ? 'AI is animating your scene' : 'Preparing your video request...'}
                type="video"
              />
            ) : selectedGeneratedVideo ? (
              <div className="relative max-h-full max-w-full overflow-hidden rounded-xl bg-black/10 shadow-2xl">
                <video
                  src={selectedGeneratedVideo.url}
                  controls
                  className="max-h-[70vh] w-auto object-contain"
                />
              </div>
            ) : (
              <EmptyState
                icon={Video}
                title="Ready to Generate Video"
                description="Pick a base image, add a motion prompt, and generate a video."
              />
            )}
          </div>

          {/* Bottom - History Gallery (Collapsible) */}
          <div className={cn(
            'shrink-0 border-t border-border bg-card/50 transition-all duration-200',
            isHistoryCollapsed ? 'py-2 px-4' : 'p-4'
          )}>
            <button
              onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
              className="flex w-full items-center justify-between"
            >
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <History className="h-4 w-4" />
                {activeTab === 'images' ? 'Generation History' : 'Video History'}
                <Badge variant="muted" className="ml-1">
                  {activeTab === 'images' ? imageAssets.length : videoAssets.length}
                </Badge>
              </h4>
              {isHistoryCollapsed ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {!isHistoryCollapsed && (
              <>
                {(activeTab === 'images' ? imageAssets.length === 0 : videoAssets.length === 0) ? (
                  <div className="mt-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-border">
                    <p className="text-sm text-muted-foreground">
                      {activeTab === 'images'
                        ? 'Generated images will appear here'
                        : 'Generated videos will appear here'}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {(activeTab === 'images' ? imageAssets : videoAssets).map((asset) => (
                  <div key={asset.id} className="group/history relative shrink-0">
                    <button
                      onClick={() => {
                        if (activeTab === 'images') {
                          setSelectedGeneratedImage(asset);
                        } else {
                          setSelectedGeneratedVideo(asset);
                        }
                      }}
                      className={cn(
                        'relative aspect-square h-32 w-32 overflow-hidden rounded-xl border-2 transition-all',
                        (activeTab === 'images'
                          ? selectedGeneratedImage?.id === asset.id
                          : selectedGeneratedVideo?.id === asset.id)
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-primary/50'
                      )}
                    >
                      {activeTab === 'images' ? (
                        <Image src={asset.url} alt="Generated" fill className="object-cover" unoptimized />
                      ) : (
                        <video src={asset.url} muted playsInline className="h-full w-full object-cover" />
                      )}
                      {asset.isPinned && (
                        <Pin className="absolute left-1.5 top-1.5 h-4 w-4 text-primary drop-shadow" />
                      )}
                      {asset.approvalStatus === 'approved' && (
                        <div className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 shadow">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
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
                          toast.success(activeTab === 'images' ? 'Image deleted' : 'Video deleted');
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
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
