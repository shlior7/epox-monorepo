'use client';

import { useState, use, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Filter,
  LayoutGrid,
  Rows3,
  Plus,
  Sparkles,
  PanelRightOpen,
  PanelRightClose,
  Loader2,
  Play,
  X,
  ChevronDown,
  Image as ImageIcon,
  Lightbulb,
  Settings2,
  Video,
  Package,
  Wand2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input, SearchInput } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  MinimalAccordion,
  MinimalAccordionItem,
  MinimalAccordionTrigger,
  MinimalAccordionContent,
} from '@/components/ui/minimal-accordion';
import { SceneLoader } from '@/components/ui/scene-loader';
import { InspirationImageModal } from '@/components/studio/InspirationImageModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GenerationFlowCard } from '@/components/studio/GenerationFlowCard';
import { ProductAssetCard } from '@/components/studio/AssetCard/ProductAssetCard';
import { ProductThumbnailNav } from '@/components/studio/ThumbnailNav';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/toast';
import type { AssetStatus, ApprovalStatus } from '@/lib/types';
import type {
  FlowGenerationSettings,
  InspirationImage,
  InspirationSourceType,
  SceneTypeInspirationMap,
  StylePreset,
  LightingPreset,
  VisionAnalysisResult,
  VideoPromptSettings,
  ImageAspectRatio,
} from 'visualizer-types';
import {
  CAMERA_MOTION_OPTIONS,
  STYLE_PRESETS,
  LIGHTING_PRESETS,
  VIDEO_TYPE_OPTIONS,
} from 'visualizer-types';

type ViewMode = 'matrix' | 'list';

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

type StudioTab = 'images' | 'video';

interface VideoPreset {
  id: string;
  name: string;
  settings: VideoPromptSettings;
}

const VIDEO_PRESETS_STORAGE_KEY = 'epox_video_presets_v1';

// Track per-flow generation state
interface FlowJobState {
  jobId: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  progress: number;
  startedAt: number;
}

export default function CollectionStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfigPanel, setShowConfigPanel] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'scene-style',
    'output-settings',
  ]);
  const [activeTab, setActiveTab] = useState<StudioTab>('images');
  const [videoExpandedSections, setVideoExpandedSections] = useState<string[]>([
    'video-inputs',
    'video-prompt',
  ]);

  // List view state
  const mainListRef = useRef<HTMLDivElement>(null);

  // Settings state (mirrors single product studio)
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);
  const [sceneTypeInspirations, setSceneTypeInspirations] = useState<SceneTypeInspirationMap>({});
  const [stylePreset, setStylePreset] = useState<StylePreset>('Modern Minimalist');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('Studio Soft Light');
  const [userPrompt, setUserPrompt] = useState('');
  const [isAnalyzingInspiration, setIsAnalyzingInspiration] = useState(false);
  const [isInspirationModalOpen, setIsInspirationModalOpen] = useState(false);
  const [outputSettings, setOutputSettings] = useState({
    aspectRatio: '1:1' as ImageAspectRatio,
    quality: '2k' as '1k' | '2k' | '4k',
    variantsCount: 1,
  });

  const [selectedBaseImages, setSelectedBaseImages] = useState<Record<string, string>>({});

  // Video Settings
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoSettings, setVideoSettings] = useState<VideoPromptSettings>({});
  const [videoPresetId, setVideoPresetId] = useState<string | null>(null);
  const [videoPresetName, setVideoPresetName] = useState('');
  const [videoPresets, setVideoPresets] = useState<VideoPreset[]>([]);
  const [isEnhancingVideoPrompt, setIsEnhancingVideoPrompt] = useState(false);

  // Generation state
  const [flowJobs, setFlowJobs] = useState<Map<string, FlowJobState>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [activeGenerationType, setActiveGenerationType] = useState<'image' | 'video' | null>(null);

  const isGenerationInProgress = flowJobs.size > 0;
  const generatingProductIds = Array.from(flowJobs.keys());

  // Fetch collection data
  const { data: collection, isLoading: isLoadingCollection } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => apiClient.getCollection(id),
    refetchInterval: isGenerationInProgress ? 5000 : false,
  });

  // Fetch products for this collection
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => apiClient.listProducts({ limit: 500 }),
    enabled: !!collection,
    refetchInterval: isGenerationInProgress ? 5000 : false,
  });

  // Fetch real generation flows for this collection
  const { data: flowsData, isLoading: isLoadingFlows } = useQuery({
    queryKey: ['collection-flows', id],
    queryFn: () => apiClient.getCollectionFlows(id),
    enabled: !!collection,
    refetchInterval: isGenerationInProgress ? 5000 : false,
  });

  // Map productId -> flowId for quick lookup
  const productToFlowMap = useMemo(() => {
    const map: Record<string, string> = {};
    flowsData?.flows?.forEach((flow) => {
      if (flow.productId) {
        map[flow.productId] = flow.id;
      }
    });
    return map;
  }, [flowsData?.flows]);

  // Initialize settings from collection
  useEffect(() => {
    if (collection?.settings) {
      const s = collection.settings;
      if (s.inspirationImages) setInspirationImages(s.inspirationImages);
      if (s.sceneTypeInspirations)
        setSceneTypeInspirations(s.sceneTypeInspirations as unknown as SceneTypeInspirationMap);
      if (s.stylePreset) setStylePreset(s.stylePreset as StylePreset);
      if (s.lightingPreset) setLightingPreset(s.lightingPreset as LightingPreset);
      if (s.userPrompt) setUserPrompt(s.userPrompt);
      if (s.aspectRatio) setOutputSettings((prev) => ({ ...prev, aspectRatio: s.aspectRatio! }));
      if (s.imageQuality) setOutputSettings((prev) => ({ ...prev, quality: s.imageQuality! }));
      if (s.variantsCount)
        setOutputSettings((prev) => ({ ...prev, variantsCount: s.variantsCount! }));
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
  }, [collection?.settings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(VIDEO_PRESETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as VideoPreset[];
        setVideoPresets(parsed);
      }
    } catch (error) {
      console.warn('Failed to load video presets:', error);
    }
  }, []);

  // No longer needed - multi-open accordions don't need tab-based reset

  // Filter products to only those in the collection
  const collectionProducts = useMemo(() => {
    return productsData?.products.filter((p) => collection?.productIds?.includes(p.id)) || [];
  }, [productsData?.products, collection?.productIds]);

  // Scene type groups from inspiration analysis
  const sceneTypeGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const [sceneType, data] of Object.entries(sceneTypeInspirations)) {
      groups[sceneType] = data.inspirationImages.length;
    }
    return groups;
  }, [sceneTypeInspirations]);

  // Helper to determine flow status (combines local job state with server flow status)
  const getFlowStatus = useCallback(
    (productId: string, serverFlowStatus?: string): AssetStatus => {
      // First check local job state (for active generation)
      const jobState = flowJobs.get(productId);
      if (jobState) {
        return jobState.status;
      }
      // Then check server flow status
      if (serverFlowStatus === 'completed' || serverFlowStatus === 'generated') {
        return 'completed';
      }
      if (serverFlowStatus === 'generating' || serverFlowStatus === 'processing') {
        return 'generating';
      }
      if (serverFlowStatus === 'failed' || serverFlowStatus === 'error') {
        return 'error';
      }
      return 'pending';
    },
    [flowJobs]
  );

  // Build generation flows from products, using real flow IDs when available
  const generationFlows = useMemo(() => {
    return collectionProducts.map((product) => {
      const baseImages =
        product.images?.map((img, idx) => ({
          id: img.id,
          url: img.baseUrl,
          isPrimary: idx === 0,
        })) || [];

      // Use real flow ID if it exists, otherwise use temporary ID
      const realFlowId = productToFlowMap[product.id];
      const flowData = flowsData?.flows?.find((f) => f.productId === product.id);

      // Build revisions from generated images
      const revisions = (flowData?.generatedImages || [])
        .filter((img) => img.status === 'completed')
        .map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          timestamp: new Date(img.timestamp),
          type: 'generated' as const,
        }));

      return {
        id: realFlowId || `temp_${product.id}`, // Real or temporary ID
        realFlowId, // Store the real ID separately
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category,
        },
        baseImages: flowData?.baseImages || baseImages,
        selectedBaseImageId: selectedBaseImages[product.id] || baseImages[0]?.id || '',
        revisions,
        status: getFlowStatus(product.id, flowData?.status),
        approvalStatus: 'pending' as ApprovalStatus,
        isPinned: false,
        sceneType: product.sceneTypes?.[0] || 'Living Room',
      };
    });
  }, [collectionProducts, getFlowStatus, productToFlowMap, flowsData?.flows, selectedBaseImages]);

  useEffect(() => {
    setSelectedBaseImages((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const flow of generationFlows) {
        if (!next[flow.product.id] && flow.baseImages[0]?.id) {
          next[flow.product.id] = flow.selectedBaseImageId || flow.baseImages[0].id;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [generationFlows]);

  const filteredFlows = useMemo(() => {
    return generationFlows.filter((flow) => {
      const matchesSearch = flow.product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || flow.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [generationFlows, searchQuery, statusFilter]);

  const readyToGenerateFlows = useMemo(() => {
    // Include pending, completed, and error flows - anything not currently generating
    return generationFlows.filter(
      (flow) => flow.baseImages.length > 0 && flow.status !== 'generating'
    );
  }, [generationFlows]);

  const videoPromptSourceUrl = useMemo(() => {
    const firstFlow = readyToGenerateFlows[0];
    if (!firstFlow) return null;
    const baseImageId = selectedBaseImages[firstFlow.product.id] || firstFlow.baseImages[0]?.id;
    const baseImage =
      firstFlow.baseImages.find((img) => img.id === baseImageId) || firstFlow.baseImages[0];
    return baseImage?.url ?? null;
  }, [readyToGenerateFlows, selectedBaseImages]);

  // Poll for job statuses
  const pollJobStatuses = useCallback(async () => {
    if (flowJobs.size === 0) return;

    const updates = new Map(flowJobs);
    let hasChanges = false;
    let completedCount = 0;
    let errorCount = 0;

    for (const [productId, jobState] of flowJobs) {
      if (jobState.status === 'completed' || jobState.status === 'error') {
        continue;
      }

      try {
        const status = await apiClient.getJobStatus(jobState.jobId);

        if (status.status === 'completed') {
          updates.set(productId, { ...jobState, status: 'completed', progress: 100 });
          hasChanges = true;
          completedCount++;
        } else if (status.status === 'failed') {
          updates.set(productId, { ...jobState, status: 'error', progress: 0 });
          hasChanges = true;
          errorCount++;
        } else if (status.status === 'processing') {
          const newProgress = Math.min(90, jobState.progress + 10);
          if (newProgress !== jobState.progress) {
            updates.set(productId, { ...jobState, progress: newProgress });
            hasChanges = true;
          }
        }
      } catch (error) {
        console.error(`Failed to poll job status for ${productId}:`, error);
      }
    }

    if (hasChanges) {
      const activeJobs = new Map(
        Array.from(updates.entries()).filter(
          ([_, state]) => state.status !== 'completed' && state.status !== 'error'
        )
      );

      setFlowJobs(activeJobs);

      if (completedCount > 0) {
        const label = activeGenerationType === 'video' ? 'video' : 'image';
        toast.success(`${completedCount} ${label}(s) generated successfully!`);
        queryClient.invalidateQueries({ queryKey: ['collection', id] });
        queryClient.invalidateQueries({ queryKey: ['collection-flows', id] });
        queryClient.invalidateQueries({ queryKey: ['products', 'all'] });
      }
      if (errorCount > 0) {
        const label = activeGenerationType === 'video' ? 'video' : 'image';
        toast.error(`${errorCount} ${label} generation(s) failed`);
      }
    }
  }, [flowJobs, id, queryClient, activeGenerationType]);

  // Start/stop polling based on active jobs
  useEffect(() => {
    if (flowJobs.size > 0 && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(pollJobStatuses, 2000);
      pollJobStatuses();
    } else if (flowJobs.size === 0 && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setActiveGenerationType(null);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [flowJobs.size, pollJobStatuses]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const normalizedVideoSettings: VideoPromptSettings = {
        videoType: videoSettings.videoType,
        cameraMotion: videoSettings.cameraMotion,
        aspectRatio: videoSettings.aspectRatio,
        resolution: videoSettings.resolution,
        sound: videoSettings.sound,
        soundPrompt: videoSettings.soundPrompt,
      };
      const settings = {
        inspirationImages,
        sceneTypeInspirations: sceneTypeInspirations as unknown as Record<
          string,
          {
            inspirationImages: Array<{
              url: string;
              thumbnailUrl?: string;
              tags?: string[];
              addedAt: string;
              sourceType: 'upload' | 'library' | 'stock' | 'unsplash';
            }>;
            mergedAnalysis: {
              json: Record<string, unknown>;
              promptText: string;
            };
          }
        >,
        stylePreset,
        lightingPreset,
        userPrompt,
        aspectRatio: outputSettings.aspectRatio,
        imageQuality: outputSettings.quality as '1k' | '2k' | '4k',
        variantsCount: outputSettings.variantsCount,
        video: {
          prompt: videoPrompt || undefined,
          settings: normalizedVideoSettings,
          presetId: videoPresetId,
        },
      };
      return apiClient.updateCollection(id, { settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', id] });
    },
  });

  // Auto-save settings on change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (collection) {
        saveSettingsMutation.mutate();
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [
    inspirationImages,
    sceneTypeInspirations,
    stylePreset,
    lightingPreset,
    userPrompt,
    outputSettings,
    videoPrompt,
    videoSettings,
    videoPresetId,
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

  const handleSaveVideoPreset = () => {
    const name = videoPresetName.trim();
    if (!name) {
      toast.error('Preset name is required');
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
  };

  const handleApplyVideoPreset = (presetIdToApply: string) => {
    const preset = videoPresets.find((p) => p.id === presetIdToApply);
    if (!preset) return;
    setVideoSettings(preset.settings);
    setVideoPresetId(preset.id);
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
    if (!videoPromptSourceUrl) {
      toast.error('Select a base image to enhance the prompt');
      return;
    }

    setIsEnhancingVideoPrompt(true);
    try {
      const response = await fetch('/api/enhance-video-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceImageUrl: videoPromptSourceUrl,
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

  // Generate all mutation
  const generateAllMutation = useMutation({
    mutationFn: async () => {
      if (readyToGenerateFlows.length === 0) {
        throw new Error('No flows ready to generate');
      }

      const productIds = readyToGenerateFlows.map((flow) => flow.product.id);

      // Set optimistic state
      const newJobStates = new Map<string, FlowJobState>();
      const startedAt = Date.now();
      productIds.forEach((productId) => {
        newJobStates.set(productId, {
          jobId: '',
          status: 'generating',
          progress: 0,
          startedAt,
        });
      });
      setFlowJobs(newJobStates);
      setActiveGenerationType('image');

      // Call the new collection generate endpoint
      const result = await apiClient.generateCollection(id, {
        productIds,
        settings: {
          inspirationImages,
          sceneTypeInspirations: sceneTypeInspirations as any,
          stylePreset,
          lightingPreset,
          userPrompt,
          aspectRatio: outputSettings.aspectRatio,
          imageQuality: outputSettings.quality,
          variantsCount: outputSettings.variantsCount,
        },
      });

      return { ...result, productIds, startedAt };
    },
    onSuccess: (data) => {
      toast.success(`Started generating ${data.productCount} images`);

      // Update flow jobs with the actual jobId
      const updatedJobs = new Map<string, FlowJobState>();
      data.productIds.forEach((productId) => {
        updatedJobs.set(productId, {
          jobId: data.jobId,
          status: 'generating',
          progress: 10,
          startedAt: data.startedAt,
        });
      });
      setFlowJobs(updatedJobs);

      // Refresh flows to get the newly created flow IDs
      queryClient.invalidateQueries({ queryKey: ['collection-flows', id] });
    },
    onError: (error) => {
      setFlowJobs(new Map());
      setActiveGenerationType(null);
      toast.error(error instanceof Error ? error.message : 'Failed to start generation');
    },
  });

  const generateVideosMutation = useMutation({
    mutationFn: async () => {
      if (readyToGenerateFlows.length === 0) {
        throw new Error('No flows ready to generate');
      }
      if (!videoPrompt.trim()) {
        throw new Error('Video prompt is required');
      }

      // Create flows first before setting state
      const flowsResult = await apiClient.createCollectionFlows(id);

      // Only set active generation type after successful flow creation
      setActiveGenerationType('video');
      const flowIdMap = new Map(flowsResult.flows.map((flow) => [flow.productId, flow.flowId]));

      const prompt = buildVideoPrompt(videoPrompt, videoSettings);
      const startedAt = Date.now();

      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled(
        readyToGenerateFlows.map(async (flow) => {
          const baseImageId = selectedBaseImages[flow.product.id] || flow.baseImages[0]?.id;
          const baseImage =
            flow.baseImages.find((img) => img.id === baseImageId) || flow.baseImages[0];
          if (!baseImage?.url) {
            throw new Error(`Missing base image for ${flow.product.name}`);
          }

          const flowId = flow.realFlowId || flowIdMap.get(flow.product.id);
          if (!flowId) {
            throw new Error(`Missing flow for ${flow.product.name}`);
          }

          const result = await apiClient.generateVideo({
            sessionId: flowId,
            productId: flow.product.id,
            sourceImageUrl: baseImage.url,
            prompt,
            settings: {
              aspectRatio: videoSettings.aspectRatio ?? '16:9',
              resolution: videoSettings.resolution ?? '720p',
            },
          });

          return { productId: flow.product.id, jobId: result.jobId };
        })
      );

      // Separate fulfilled and rejected results
      const fulfilledJobs: Array<{ productId: string; jobId: string }> = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          fulfilledJobs.push(result.value);
        } else {
          const flowName = readyToGenerateFlows[index]?.product.name || `Flow ${index}`;
          errors.push(
            `${flowName}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
          );
        }
      });

      // Log errors for debugging
      if (errors.length > 0) {
        console.error('Video generation failures:', errors);
      }

      // Update flow jobs with successful ones
      const updatedJobs = new Map<string, FlowJobState>();
      fulfilledJobs.forEach(({ productId, jobId }) => {
        updatedJobs.set(productId, {
          jobId,
          status: 'generating',
          progress: 10,
          startedAt,
        });
      });
      setFlowJobs(updatedJobs);

      return {
        productCount: fulfilledJobs.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
    onSuccess: (data) => {
      if (data.productCount > 0) {
        toast.success(`Started generating ${data.productCount} videos`);
      }
      if (data.errorCount > 0) {
        toast.error(`${data.errorCount} video generation(s) failed to start`);
      }
      queryClient.invalidateQueries({ queryKey: ['collection-flows', id] });
    },
    onError: (error) => {
      setFlowJobs(new Map());
      setActiveGenerationType(null);
      toast.error(error instanceof Error ? error.message : 'Failed to start video generation');
    },
  });

  const analyzeAndAddInspiration = useCallback(
    async (imageUrl: string, sourceType: InspirationSourceType) => {
      const analysisResponse = await fetch('/api/vision-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          sourceType,
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Vision Scanner analysis failed');
      }

      const { inspirationImage, analysis } = await analysisResponse.json();
      const detectedSceneType = analysis?.json?.detectedSceneType || 'General';

      setInspirationImages((prev) => {
        if (prev.some((img) => img.url === inspirationImage.url)) {
          return prev;
        }
        return [...prev, inspirationImage];
      });

      setSceneTypeInspirations((prev) => {
        const existing = prev[detectedSceneType];
        const nextImages = existing
          ? [...existing.inspirationImages, inspirationImage]
          : [inspirationImage];
        const uniqueImages = nextImages.filter(
          (img, idx) => nextImages.findIndex((item) => item.url === img.url) === idx
        );

        return {
          ...prev,
          [detectedSceneType]: {
            inspirationImages: uniqueImages,
            mergedAnalysis: analysis as VisionAnalysisResult,
          },
        };
      });

      return detectedSceneType;
    },
    []
  );

  const addInspirationFromUrls = useCallback(
    async (items: Array<{ url: string; sourceType: InspirationSourceType }>) => {
      if (items.length === 0) return;
      setIsAnalyzingInspiration(true);

      try {
        for (const item of items) {
          try {
            const detectedSceneType = await analyzeAndAddInspiration(item.url, item.sourceType);
            toast.success(`Analyzed: ${detectedSceneType} scene detected`);
          } catch (err) {
            console.error('Inspiration analysis failed:', err);
            toast.error('Failed to analyze inspiration image');
          }
        }
      } finally {
        setIsAnalyzingInspiration(false);
      }
    },
    [analyzeAndAddInspiration]
  );

  // Remove inspiration image
  const handleRemoveInspiration = (index: number) => {
    const imageToRemove = inspirationImages[index];
    setInspirationImages((prev) => prev.filter((_, i) => i !== index));

    // Also remove from scene type inspirations
    setSceneTypeInspirations((prev) => {
      const updated = { ...prev };
      for (const [sceneType, data] of Object.entries(updated)) {
        const filtered = data.inspirationImages.filter((img) => img.url !== imageToRemove.url);
        if (filtered.length === 0) {
          delete updated[sceneType];
        } else {
          updated[sceneType] = { ...data, inspirationImages: filtered };
        }
      }
      return updated;
    });
  };

  // Navigate to product flow - creates flow if needed
  const handleProductClick = async (productId: string, existingFlowId?: string) => {
    // If we already have a flow ID, navigate directly
    if (existingFlowId) {
      router.push(`/studio/${existingFlowId}`);
      return;
    }

    // Otherwise, create flows for the collection first
    try {
      toast.loading('Preparing studio...', { id: 'create-flow' });

      // This will create flows for all products that don't have one yet
      const result = await apiClient.createCollectionFlows(id);

      // Find the flow for this specific product
      const flow = result.flows.find((f) => f.productId === productId);
      if (flow) {
        toast.dismiss('create-flow');
        router.push(`/studio/${flow.flowId}`);
      } else {
        toast.error('Failed to create flow', { id: 'create-flow' });
      }
    } catch (error) {
      toast.error('Failed to create flow', { id: 'create-flow' });
      console.error('Failed to create flow:', error);
    }
  };

  const handleDeleteRevision = async (revisionId: string) => {
    try {
      await apiClient.deleteGeneratedImage(revisionId);
      toast.success('Revision deleted');
      queryClient.invalidateQueries({ queryKey: ['collection', id] });
      queryClient.invalidateQueries({ queryKey: ['products', 'all'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete revision');
    }
  };

  // Scroll to product in list view
  const handleProductThumbnailClick = useCallback((productId: string) => {
    const element = document.getElementById(`product-${productId}`);
    if (element && mainListRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Asset action handlers for list view
  const handlePinAsset = async (flowId: string) => {
    try {
      // For now, we'll just show a toast since pinning is per-revision
      toast.info('Use the individual studio to pin specific revisions');
    } catch (error) {
      toast.error('Failed to toggle pin');
    }
  };

  const handleApproveAsset = async (flowId: string) => {
    try {
      toast.info('Use the individual studio to approve specific revisions');
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleDownloadAsset = (revision: { imageUrl: string }, productName: string) => {
    const link = document.createElement('a');
    link.href = revision.imageUrl;
    link.download = `${productName}-generated.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = isLoadingCollection || isLoadingProducts || isLoadingFlows;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading collection...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <EmptyState
          icon={Sparkles}
          title="Collection not found"
          description="The collection you're looking for doesn't exist."
          action={{
            label: 'Back to Collections',
            onClick: () => router.push('/collections'),
          }}
        />
      </div>
    );
  }

  const progress =
    collection.totalImages > 0 ? (collection.generatedCount / collection.totalImages) * 100 : 0;

  // Check if any flows are actually in 'generating' status (from server or local jobs)
  const hasGeneratingFlows = generationFlows.some((flow) => flow.status === 'generating');
  const isGenerating = hasGeneratingFlows || isGenerationInProgress;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 px-8 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/collections/${id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">{collection.name}</h1>
              <p className="text-sm text-muted-foreground">
                {collection.productCount} products • {inspirationImages.length} inspiration images
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              title={showConfigPanel ? 'Hide config panel' : 'Show config panel'}
            >
              {showConfigPanel ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="glow"
              onClick={() => generateAllMutation.mutate()}
              disabled={
                readyToGenerateFlows.length === 0 ||
                generateAllMutation.isPending ||
                isGenerationInProgress
              }
            >
              {generateAllMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Generate All ({readyToGenerateFlows.length})
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-muted-foreground">
                  Generating {generatingProductIds.length}{' '}
                  {activeGenerationType === 'video' ? 'video' : 'image'}
                  {generatingProductIds.length !== 1 ? 's' : ''}...
                </span>
              </div>
              <span className="font-medium">
                {(() => {
                  const progressValues = Array.from(flowJobs.values()).map((j) => j.progress);
                  const avgProgress =
                    progressValues.length > 0
                      ? progressValues.reduce((a, b) => a + b, 0) / progressValues.length
                      : 10;
                  return `${Math.round(avgProgress)}%`;
                })()}
              </span>
            </div>
            <Progress
              value={(() => {
                const progressValues = Array.from(flowJobs.values()).map((j) => j.progress);
                return progressValues.length > 0
                  ? progressValues.reduce((a, b) => a + b, 0) / progressValues.length
                  : 10;
              })()}
              className="h-2"
            />
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Config Panel Sidebar - LEFT SIDE (matching single studio layout) */}
        {showConfigPanel && (
          <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card/30">
            <div className="border-b border-border p-3">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('images')}
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
                  onClick={() => setActiveTab('video')}
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

            <div className="flex-1 overflow-y-auto px-3 py-2">
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
                        {/* Inspiration Images Grid */}
                        <div>
                          <p className="mb-2 text-xs text-muted-foreground">Inspiration Images</p>
                          <div className="flex flex-wrap gap-2">
                            {inspirationImages.map((img, idx) => (
                              <div
                                key={idx}
                                className="group relative aspect-square h-16 w-16 overflow-hidden rounded-lg border"
                              >
                                <Image
                                  src={img.url}
                                  alt={`Inspiration ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                                <button
                                  onClick={() => handleRemoveInspiration(idx)}
                                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                            {inspirationImages.length < 5 && (
                              <button
                                onClick={() => setIsInspirationModalOpen(true)}
                                disabled={isAnalyzingInspiration}
                                className="flex aspect-square h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                              >
                                {isAnalyzingInspiration ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Detected Scene Types */}
                        {Object.keys(sceneTypeGroups).length > 0 && (
                          <div>
                            <p className="mb-2 text-xs text-muted-foreground">
                              Detected Scene Types
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(sceneTypeGroups).map(([sceneType, count]) => (
                                <Badge key={sceneType} variant="outline" className="text-xs">
                                  {sceneType} ({count})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Style Preset */}
                        <div>
                          <p className="mb-1.5 text-xs text-muted-foreground">Style</p>
                          <Select
                            value={stylePreset}
                            onValueChange={(v) => setStylePreset(v as StylePreset)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STYLE_PRESETS.map((preset) => (
                                <SelectItem key={preset} value={preset}>
                                  {preset}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Lighting Preset */}
                        <div>
                          <p className="mb-1.5 text-xs text-muted-foreground">Lighting</p>
                          <Select
                            value={lightingPreset}
                            onValueChange={(v) => setLightingPreset(v as LightingPreset)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LIGHTING_PRESETS.map((preset) => (
                                <SelectItem key={preset} value={preset}>
                                  {preset}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </MinimalAccordionContent>
                  </MinimalAccordionItem>

                  {/* Section 2: User Prompt */}
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
                      Collection Prompt
                    </MinimalAccordionTrigger>
                    <MinimalAccordionContent>
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Add a prompt that applies to all products..."
                          value={userPrompt}
                          onChange={(e) => setUserPrompt(e.target.value)}
                          className="min-h-[80px] resize-none text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          This prompt will be applied to all products in the collection.
                        </p>
                      </div>
                    </MinimalAccordionContent>
                  </MinimalAccordionItem>

                  {/* Section 3: Output Settings */}
                  <MinimalAccordionItem value="output-settings">
                    <MinimalAccordionTrigger>Output Settings</MinimalAccordionTrigger>
                    <MinimalAccordionContent>
                      <div className="space-y-4">
                        {/* Quality */}
                        <div>
                          <p className="mb-2 text-xs text-muted-foreground">Quality</p>
                          <div className="flex gap-2">
                            {QUALITY_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() =>
                                  setOutputSettings((prev) => ({ ...prev, quality: opt.value }))
                                }
                                className={cn(
                                  'flex flex-1 flex-col items-center rounded-lg border p-2 transition-colors',
                                  outputSettings.quality === opt.value
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                )}
                              >
                                <span className="text-sm font-semibold">{opt.label}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {opt.description}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Aspect Ratio */}
                        <div>
                          <p className="mb-2 text-xs text-muted-foreground">Aspect Ratio</p>
                          <div className="flex gap-1.5">
                            {ASPECT_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() =>
                                  setOutputSettings((prev) => ({ ...prev, aspectRatio: opt.value }))
                                }
                                className={cn(
                                  'flex flex-1 flex-col items-center rounded-lg border py-2 text-xs transition-colors',
                                  outputSettings.aspectRatio === opt.value
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

                        {/* Variants per product */}
                        <div>
                          <p className="mb-2 text-xs text-muted-foreground">
                            Variants per product: {outputSettings.variantsCount}
                          </p>
                          <div className="flex gap-1">
                            {[1, 2, 4].map((n) => (
                              <button
                                key={n}
                                onClick={() =>
                                  setOutputSettings((prev) => ({ ...prev, variantsCount: n }))
                                }
                                className={cn(
                                  'flex-1 rounded-md border py-1 text-sm transition-colors',
                                  outputSettings.variantsCount === n
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
                  {/* Video Section: Prompt */}
                  <MinimalAccordionItem value="video-prompt">
                    <MinimalAccordionTrigger>Video Prompt</MinimalAccordionTrigger>
                    <MinimalAccordionContent>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Describe the video you want to generate..."
                          value={videoPrompt}
                          onChange={(e) => setVideoPrompt(e.target.value)}
                          className="min-h-[80px] resize-none text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEnhanceVideoPrompt}
                          disabled={isEnhancingVideoPrompt || !videoPromptSourceUrl}
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
                        <Select
                          value={videoSettings.videoType ?? ''}
                          onValueChange={(v) => updateVideoSettings({ videoType: v || undefined })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Video type" />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={videoSettings.cameraMotion ?? ''}
                          onValueChange={(v) =>
                            updateVideoSettings({ cameraMotion: v || undefined })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Camera motion" />
                          </SelectTrigger>
                          <SelectContent>
                            {CAMERA_MOTION_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={videoSettings.sound ?? 'automatic'}
                          onValueChange={(v) =>
                            updateVideoSettings({ sound: v as VideoPromptSettings['sound'] })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Sound" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="automatic">Automatic sound</SelectItem>
                            <SelectItem value="with_music">With music</SelectItem>
                            <SelectItem value="no_sound">No sound</SelectItem>
                            <SelectItem value="custom">Custom sound prompt</SelectItem>
                          </SelectContent>
                        </Select>
                        {videoSettings.sound === 'custom' && (
                          <Input
                            placeholder="Sound prompt..."
                            value={videoSettings.soundPrompt || ''}
                            onChange={(e) => updateVideoSettings({ soundPrompt: e.target.value })}
                          />
                        )}
                      </div>
                    </MinimalAccordionContent>
                  </MinimalAccordionItem>
                </MinimalAccordion>
              )}
            </div>

            {/* Footer - Generate Button */}
            <div className="shrink-0 border-t border-border bg-card p-3">
              {activeTab === 'images' ? (
                <Button
                  variant="glow"
                  size="lg"
                  className="w-full"
                  onClick={() => generateAllMutation.mutate()}
                  disabled={
                    readyToGenerateFlows.length === 0 ||
                    generateAllMutation.isPending ||
                    isGenerationInProgress
                  }
                >
                  {generateAllMutation.isPending || isGenerationInProgress ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate All ({readyToGenerateFlows.length})
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="glow"
                  size="lg"
                  className="w-full"
                  onClick={() => generateVideosMutation.mutate()}
                  disabled={
                    readyToGenerateFlows.length === 0 ||
                    generateVideosMutation.isPending ||
                    isGenerationInProgress
                  }
                >
                  {generateVideosMutation.isPending || isGenerationInProgress ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Videos...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Generate Videos ({readyToGenerateFlows.length})
                    </>
                  )}
                </Button>
              )}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Filters */}
          <div className="flex items-center gap-4 border-b border-border bg-card/30 px-8 py-4">
            <SearchInput
              placeholder="Search products..."
              className="w-64"
              value={searchQuery}
              onSearch={setSearchQuery}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="generating">Generating</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-1 rounded-lg border p-1">
              <Button
                variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('matrix')}
                title="Matrix view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <Rows3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Flow Cards Grid / List */}
          <div className="flex flex-1 overflow-hidden">
            {/* Scrollable Main View */}
            <div
              ref={mainListRef}
              className={cn('flex-1 overflow-y-auto p-8', viewMode === 'list' && 'p-4 md:p-6')}
            >
              {filteredFlows.length > 0 ? (
                viewMode === 'matrix' ? (
                  // Grid View - GenerationFlowCard
                  <div
                    className={cn(
                      'grid gap-4',
                      showConfigPanel
                        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    )}
                  >
                    {filteredFlows.map((flow, index) => (
                      <GenerationFlowCard
                        key={flow.id}
                        flowId={flow.id}
                        collectionId={id}
                        product={flow.product}
                        baseImages={flow.baseImages}
                        selectedBaseImageId={flow.selectedBaseImageId}
                        revisions={flow.revisions}
                        status={flow.status}
                        approvalStatus={flow.approvalStatus}
                        isPinned={flow.isPinned}
                        sceneType={flow.sceneType}
                        onChangeBaseImage={(imageId) => {
                          setSelectedBaseImages((prev) => ({
                            ...prev,
                            [flow.product.id]: imageId,
                          }));
                        }}
                        onDeleteRevision={handleDeleteRevision}
                        onClick={() => handleProductClick(flow.product.id, flow.realFlowId)}
                        className={cn(
                          'animate-fade-in cursor-pointer opacity-0',
                          `stagger-${Math.min(index + 1, 6)}`
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  // List View - ProductAssetCard with gallery navigation
                  <div className="mx-auto max-w-4xl space-y-6">
                    {filteredFlows.map((flow) => (
                      <div key={flow.id} id={`product-${flow.product.id}`}>
                        <ProductAssetCard
                          product={{
                            id: flow.product.id,
                            name: flow.product.name,
                            sku: flow.product.sku,
                            thumbnailUrl: flow.baseImages[0]?.url,
                          }}
                          revisions={flow.revisions.map((r) => ({
                            id: r.id,
                            imageUrl: r.imageUrl,
                            timestamp: r.timestamp,
                            type: r.type,
                            isVideo: false,
                          }))}
                          configuration={{
                            sceneType: flow.sceneType,
                            stylePreset,
                            lightingPreset,
                            aspectRatio: outputSettings.aspectRatio,
                            quality: outputSettings.quality,
                          }}
                          isPinned={flow.isPinned}
                          isApproved={flow.approvalStatus === 'approved'}
                          onPin={() => handlePinAsset(flow.id)}
                          onApprove={() => handleApproveAsset(flow.id)}
                          onDownload={() => {
                            const latestRevision = flow.revisions[0];
                            if (latestRevision) {
                              handleDownloadAsset(latestRevision, flow.product.name);
                            }
                          }}
                          onDelete={(revisionId) => handleDeleteRevision(revisionId)}
                          onGenerate={() => handleProductClick(flow.product.id, flow.realFlowId)}
                          onOpenStudio={() => handleProductClick(flow.product.id, flow.realFlowId)}
                        />
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No products in collection"
                  description="Add products to start generating images."
                  action={{
                    label: 'Add Products',
                    onClick: () => { },
                  }}
                />
              )}
            </div>

            {/* Right Product Thumbnail Nav (List View Only) */}
            {viewMode === 'list' && filteredFlows.length > 0 && (
              <div className="hidden border-l border-border bg-card/30 lg:block">
                <ProductThumbnailNav
                  items={filteredFlows.map((flow) => ({
                    id: flow.product.id,
                    thumbnailUrl: flow.baseImages[0]?.url,
                    name: flow.product.name,
                    generatedCount: flow.revisions.length,
                  }))}
                  onItemClick={handleProductThumbnailClick}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      <InspirationImageModal
        isOpen={isInspirationModalOpen}
        onClose={() => setIsInspirationModalOpen(false)}
        onSubmit={addInspirationFromUrls}
        existingImages={inspirationImages}
        isProcessing={isAnalyzingInspiration}
      />
    </div>
  );
}
