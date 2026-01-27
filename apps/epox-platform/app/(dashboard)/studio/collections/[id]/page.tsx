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
  Video,
  Package,
  Wand2,
  RefreshCw,
  Pin,
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
import {
  UnifiedStudioConfigPanel,
  ConfigPanelProvider,
  type SceneTypeInfo,
  type ConfigPanelState,
  useScrollSync,
  InspirationPickerModal,
  StyleExplorerModal,
  ColorPaletteModal,
  SceneTypeGroupedView,
  type ProductItem,
} from '@/components/studio';
import { useConfigPanelSettings } from '@/components/studio/hooks/useConfigPanelSettings';
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
  SceneTypeInspirationMap,
  VideoPromptSettings,
  ImageAspectRatio,
  BubbleValue,
} from 'visualizer-types';
import {
  CAMERA_MOTION_OPTIONS,
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

  // Bulk selection state
  const [selectedFlowIds, setSelectedFlowIds] = useState<Set<string>>(new Set());

  // List view state
  const mainListRef = useRef<HTMLDivElement>(null);

  // Settings state
  const [generalInspiration, setGeneralInspiration] = useState<BubbleValue[]>([]);
  const [sceneTypeInspiration, setSceneTypeInspiration] = useState<SceneTypeInspirationMap>({});
  const [useSceneTypeInspiration, setUseSceneTypeInspiration] = useState(true);
  const [userPrompt, setUserPrompt] = useState('');
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

  // Scene type management state
  const [expandedSceneTypes, setExpandedSceneTypes] = useState<string[]>([]);
  const [editingSceneTypeFlowId, setEditingSceneTypeFlowId] = useState<string | null>(null);
  const [newSceneTypeValue, setNewSceneTypeValue] = useState('');
  const sceneTypeAccordionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // Fetch generation flows for this collection (includes product and asset data)
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

  // Resume polling for generating assets on page load/refresh
  const hasInitializedPolling = useRef(false);
  useEffect(() => {
    if (!flowsData?.flows || hasInitializedPolling.current) return;

    // Find generating assets with jobIds
    const generatingJobs = new Map<string, FlowJobState>();
    for (const flow of flowsData.flows) {
      const generatingAsset = flow.generatedImages?.find(
        (img) => (img.status === 'generating' || img.status === 'pending') && img.jobId
      );
      if (generatingAsset?.jobId) {
        generatingJobs.set(flow.productId, {
          jobId: generatingAsset.jobId,
          status: 'generating',
          progress: 30, // Assume some progress already made
          startedAt: Date.now(),
        });
      }
    }

    if (generatingJobs.size > 0) {
      console.log(`Resuming polling for ${generatingJobs.size} generating jobs`);
      setFlowJobs(generatingJobs);
      setActiveGenerationType('image'); // Assume image generation
      hasInitializedPolling.current = true;
    }
  }, [flowsData?.flows]);

  // Initialize settings from collection
  useEffect(() => {
    if (collection?.settings) {
      const s = collection.settings as any;
      console.log('📥 Loading collection settings from database:', {
        generalInspirationCount: Array.isArray(s.generalInspiration) ? s.generalInspiration.length : 0,
        sceneTypeInspirationKeys: Object.keys(s.sceneTypeInspiration ?? {}),
      });
      if (Array.isArray(s.generalInspiration)) setGeneralInspiration(s.generalInspiration);
      if (s.sceneTypeInspiration)
        setSceneTypeInspiration(s.sceneTypeInspiration as SceneTypeInspirationMap);
      if (typeof s.useSceneTypeInspiration === 'boolean') setUseSceneTypeInspiration(s.useSceneTypeInspiration);
      if (s.userPrompt) setUserPrompt(s.userPrompt);
      if (s.aspectRatio) setOutputSettings((prev) => ({ ...prev, aspectRatio: s.aspectRatio! }));
      if (s.imageQuality) setOutputSettings((prev) => ({ ...prev, quality: s.imageQuality! }));
      if (s.variantsPerProduct)
        setOutputSettings((prev) => ({ ...prev, variantsCount: s.variantsPerProduct! }));
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

  // Scene type groups from inspiration
  const sceneTypeGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const [sceneType, data] of Object.entries(sceneTypeInspiration)) {
      groups[sceneType] = data.bubbles?.length ?? 0;
    }
    return groups;
  }, [sceneTypeInspiration]);

  // All available scene types (from flows in the collection)
  const availableSceneTypes = useMemo(() => {
    const types = new Set<string>();
    flowsData?.flows?.forEach((flow) => {
      // Normalize scene types: trim whitespace
      flow.productSceneTypes?.forEach((type) => {
        const normalized = type.trim();
        if (normalized) types.add(normalized);
      });
    });
    // Also add any scene types from inspiration
    Object.keys(sceneTypeInspiration).forEach((type) => {
      const normalized = type.trim();
      if (normalized) types.add(normalized);
    });
    // Add some common defaults if empty
    if (types.size === 0) {
      ['Living Room', 'Bedroom', 'Office', 'Kitchen', 'Dining Room', 'Outdoor', 'Studio'].forEach(
        (type) => types.add(type)
      );
    }
    return Array.from(types).sort();
  }, [flowsData?.flows, sceneTypeInspiration]);

  // Derive scene types for config panel (grouped by sceneType field in flow settings)
  const configPanelSceneTypes: SceneTypeInfo[] = useMemo(() => {
    if (!flowsData?.flows) return [];

    const sceneTypeMap = new Map<string, { productIds: string[] }>();

    flowsData.flows.forEach((flow) => {
      // Normalize scene type to avoid duplicates from whitespace/case differences
      let rawSceneType =
        (typeof flow.settings?.sceneType === 'string' ? flow.settings.sceneType : null) ||
        flow.productSceneTypes?.[0] ||
        'Living Room';

      // Normalize: trim whitespace and ensure consistent casing
      const sceneType = rawSceneType.trim();

      if (!sceneTypeMap.has(sceneType)) {
        sceneTypeMap.set(sceneType, { productIds: [] });
      }
      if (flow.productId) {
        sceneTypeMap.get(sceneType)!.productIds.push(flow.productId);
      }
    });

    return Array.from(sceneTypeMap.entries()).map(([sceneType, data]) => ({
      sceneType,
      productCount: data.productIds.length,
      productIds: data.productIds,
    }));
  }, [flowsData?.flows]);

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

  // Build generation flows directly from flows API response
  const generationFlows = useMemo(() => {
    if (!flowsData?.flows) return [];

    return flowsData.flows.map((flow) => {
      // Build revisions from generated images
      const revisions = (flow.generatedImages || [])
        .filter((img) => img.status === 'completed')
        .map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          timestamp: new Date(img.timestamp),
          type: 'generated' as const,
          aspectRatio: img.aspectRatio,
        }));

      const baseImages = flow.baseImages || [];

      return {
        id: flow.id,
        realFlowId: flow.id,
        product: {
          id: flow.productId,
          name: flow.productName,
          sku: undefined,
          category: flow.productCategory,
        },
        baseImages,
        selectedBaseImageId: selectedBaseImages[flow.productId] || baseImages[0]?.id || '',
        revisions,
        status: getFlowStatus(flow.productId, flow.status),
        approvalStatus: 'pending' as ApprovalStatus,
        isPinned: false,
        sceneType:
          (typeof flow.settings?.sceneType === 'string' ? flow.settings.sceneType : null) ||
          flow.productSceneTypes?.[0] ||
          'Living Room',
      };
    });
  }, [flowsData?.flows, getFlowStatus, selectedBaseImages]);

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

  // Separate pinned and unpinned flows
  const pinnedFlows = useMemo(() => {
    return filteredFlows.filter((flow) => flow.isPinned);
  }, [filteredFlows]);

  const unpinnedFlows = useMemo(() => {
    return filteredFlows.filter((flow) => !flow.isPinned);
  }, [filteredFlows]);

  // Flows grouped by scene type
  const flowsBySceneType = useMemo(() => {
    const groups: Record<string, typeof generationFlows> = {};
    for (const flow of generationFlows) {
      const sceneType = flow.sceneType || 'Unassigned';
      if (!groups[sceneType]) {
        groups[sceneType] = [];
      }
      groups[sceneType].push(flow);
    }
    return groups;
  }, [generationFlows]);

  // Handler to change a flow's scene type
  const handleChangeSceneType = useCallback(
    async (_flowId: string, productId: string, newSceneType: string) => {
      try {
        // Update the flow's scene type setting
        const realFlowId = productToFlowMap[productId];
        if (realFlowId) {
          await apiClient.updateStudioSettings(realFlowId, {
            sceneType: newSceneType,
          });
          // Invalidate queries to refresh the data
          queryClient.invalidateQueries({ queryKey: ['collection-flows', id] });
          toast.success(`Moved to "${newSceneType}"`);

          // Expand and scroll to the new scene type
          setExpandedSceneTypes((prev) => {
            if (!prev.includes(newSceneType)) {
              return [...prev, newSceneType];
            }
            return prev;
          });

          // Scroll to the scene type accordion after a short delay
          setTimeout(() => {
            const ref = sceneTypeAccordionRefs.current[newSceneType];
            if (ref) {
              ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }
      } catch (error) {
        toast.error('Failed to change scene type');
        console.error('Failed to change scene type:', error);
      } finally {
        setEditingSceneTypeFlowId(null);
        setNewSceneTypeValue('');
      }
    },
    [productToFlowMap, queryClient, id]
  );

  // Bulk selection handlers
  const handleSelectFlow = useCallback((flowId: string, selected: boolean) => {
    setSelectedFlowIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(flowId);
      } else {
        next.delete(flowId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedFlowIds.size === filteredFlows.length) {
      setSelectedFlowIds(new Set());
    } else {
      setSelectedFlowIds(new Set(filteredFlows.map((f) => f.id)));
    }
  }, [selectedFlowIds.size, filteredFlows]);

  // Handler to change a flow's selected base image and persist to database
  const handleChangeBaseImage = useCallback(
    async (productId: string, imageId: string, imageUrl: string) => {
      // Update local state immediately
      setSelectedBaseImages((prev) => ({
        ...prev,
        [productId]: imageId,
      }));

      // Persist to database
      const realFlowId = productToFlowMap[productId];
      if (realFlowId) {
        try {
          await apiClient.updateFlowBaseImages(realFlowId, {
            [productId]: imageUrl,
          });
        } catch (error) {
          console.error('Failed to persist base image selection:', error);
          // Don't show error toast - local state is still updated
        }
      }
    },
    [productToFlowMap]
  );

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

      // Skip polling if jobId is not yet available (optimistic state before mutation completes)
      if (!jobState.jobId) {
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
        generalInspiration,
        sceneTypeInspiration,
        useSceneTypeInspiration,
        userPrompt,
        aspectRatio: outputSettings.aspectRatio,
        imageQuality: outputSettings.quality as '1k' | '2k' | '4k',
        variantsPerProduct: outputSettings.variantsCount,
        video: {
          prompt: videoPrompt || undefined,
          settings: normalizedVideoSettings,
          presetId: videoPresetId,
        },
      };
      console.log('📤 Saving collection settings to API:', {
        generalInspirationCount: settings.generalInspiration.length,
        sceneTypeInspirationKeys: Object.keys(settings.sceneTypeInspiration),
      });
      return apiClient.updateCollection(id, { settings });
    },
    onSuccess: async (data) => {
      console.log('✅ Collection settings saved successfully:', data);

      // After saving collection settings, sync all flows to inherit new settings
      // This ensures inspiration images propagate to individual flow studios
      try {
        console.log('🔄 Syncing flows with updated collection settings...');
        const syncResult = await apiClient.syncCollectionFlows(id);
        console.log('✅ Flows synced:', syncResult);
      } catch (error) {
        console.error('⚠️ Failed to sync flows, they will update on next access:', error);
        // Non-critical - flows will be updated when accessed
      }

      queryClient.invalidateQueries({ queryKey: ['collection', id] });
      queryClient.invalidateQueries({ queryKey: ['collection-flows', id] });
    },
    onError: (error) => {
      console.error('❌ Failed to save collection settings:', error);
      toast.error('Failed to save settings');
    },
  });

  // Track if settings have been initialized from collection
  const hasInitializedSettings = useRef(false);

  // Mark settings as initialized after collection data loads
  useEffect(() => {
    if (collection?.settings) {
      hasInitializedSettings.current = true;
    }
  }, [collection?.settings]);

  // Auto-save settings on change (skip initial mount)
  useEffect(() => {
    // Skip auto-save if settings haven't been initialized yet
    if (!hasInitializedSettings.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (collection) {
        console.log('💾 Auto-saving collection settings:', {
          generalInspirationCount: generalInspiration.length,
          sceneTypeInspirationKeys: Object.keys(sceneTypeInspiration),
        });
        saveSettingsMutation.mutate();
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    generalInspiration,
    sceneTypeInspiration,
    useSceneTypeInspiration,
    userPrompt,
    outputSettings,
    videoPrompt,
    videoSettings,
    videoPresetId,
    collection?.id, // Only depend on collection ID, not the whole object
    // Note: saveSettingsMutation is intentionally excluded to prevent infinite loop
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
          generalInspiration,
          sceneTypeInspiration,
          useSceneTypeInspiration,
          userPrompt,
          aspectRatio: outputSettings.aspectRatio,
          imageQuality: outputSettings.quality,
          variantsPerProduct: outputSettings.variantsCount,
        },
      });

      return { ...result, productIds, startedAt };
    },
    onSuccess: (data) => {
      toast.success(`Started generating ${data.productCount} images`);

      // Update flow jobs with their respective jobIds (one job per product)
      const updatedJobs = new Map<string, FlowJobState>();
      data.productIds.forEach((productId, index) => {
        // Use the individual jobId for this product, or fall back to primary jobId
        const jobId = data.jobIds?.[index] ?? data.jobId;
        updatedJobs.set(productId, {
          jobId,
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

  // Handler for individual flow generation
  const handleGenerateFlow = useCallback(
    (productId: string) => {
      const flow = generationFlows.find((f) => f.product.id === productId);
      if (!flow || flow.status === 'generating') return;

      // Set optimistic state
      const newJobStates = new Map<string, FlowJobState>();
      newJobStates.set(productId, {
        jobId: '',
        status: 'generating',
        progress: 0,
        startedAt: Date.now(),
      });
      setFlowJobs(newJobStates);
      setActiveGenerationType('image');

      // Call generate mutation for single product
      generateAllMutation.mutate();
    },
    [generationFlows, generateAllMutation]
  );

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

  // Pin handler - toggles pin status for a flow
  const handlePinFlow = useCallback(
    async (flowId: string, productId: string, currentPinned: boolean) => {
      try {
        const realFlowId = productToFlowMap[productId];
        if (realFlowId) {
          // Update via API (you'll need to implement this endpoint)
          // For now, we'll update local state optimistically
          queryClient.setQueryData(['collection-flows', id], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              flows: oldData.flows.map((flow: any) =>
                flow.id === realFlowId ? { ...flow, isPinned: !currentPinned } : flow
              ),
            };
          });
          toast.success(currentPinned ? 'Flow unpinned' : 'Flow pinned');
        }
      } catch (error) {
        toast.error('Failed to toggle pin');
        console.error('Failed to toggle pin:', error);
      }
    },
    [productToFlowMap, queryClient, id]
  );

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

  const isLoading = isLoadingCollection || isLoadingFlows;

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
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 flex-none border-b border-border bg-card/80 px-8 py-4 backdrop-blur-xl">
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
                {collection.productCount} products • {generalInspiration.length} inspiration bubbles
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
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Config Panel Sidebar - LEFT SIDE (matching single studio layout) */}
        {showConfigPanel && (
          <UnifiedStudioConfigPanel
            mode="collection-studio"
            sceneTypes={configPanelSceneTypes}
            initialState={{
              generalInspiration,
              sceneTypeInspiration,
              useSceneTypeInspiration,
              userPrompt,
              applyCollectionPrompt: true,
              outputSettings: {
                aspectRatio: outputSettings.aspectRatio,
                quality: outputSettings.quality,
                variantsCount: outputSettings.variantsCount,
              },
            }}
            onStateChange={(panelState) => {
              // Use functional updaters to avoid unnecessary re-renders
              // when values haven't actually changed
              setGeneralInspiration((prev) =>
                prev === panelState.generalInspiration ? prev : panelState.generalInspiration
              );
              setSceneTypeInspiration((prev) =>
                prev === panelState.sceneTypeInspiration ? prev : panelState.sceneTypeInspiration
              );
              setUseSceneTypeInspiration(panelState.useSceneTypeInspiration);
              setUserPrompt(panelState.userPrompt);
              setOutputSettings((prev) => {
                const next = panelState.outputSettings;
                if (
                  prev.aspectRatio === next.aspectRatio &&
                  prev.quality === next.quality &&
                  prev.variantsCount === next.variantsCount
                ) {
                  return prev;
                }
                return {
                  aspectRatio: next.aspectRatio,
                  quality: next.quality,
                  variantsCount: next.variantsCount,
                };
              });
            }}
            onSave={async () => {
              await saveSettingsMutation.mutateAsync();
            }}
            onGenerate={() => {
              if (activeTab === 'images') {
                generateAllMutation.mutate();
              } else {
                generateVideosMutation.mutate();
              }
            }}
            isGenerating={isGenerating}
            isSaving={saveSettingsMutation.isPending}
            className="h-full"
          />
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
            {selectedFlowIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  {selectedFlowIds.size} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFlowIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
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
              data-testid="generation-flow-list"
            >
              {filteredFlows.length > 0 ? (
                viewMode === 'matrix' ? (
                  // Grid View - GenerationFlowCard
                  <div className="space-y-6">
                    {/* Pinned Section */}
                    {pinnedFlows.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <Pin className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-medium text-muted-foreground">
                            Pinned ({pinnedFlows.length})
                          </h3>
                        </div>
                        <div
                          className={cn(
                            'grid gap-4',
                            showConfigPanel
                              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
                              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                          )}
                        >
                          {pinnedFlows.map((flow, index) => (
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
                              availableSceneTypes={availableSceneTypes}
                              onChangeBaseImage={(imageId) => {
                                const baseImage = flow.baseImages.find((img) => img.id === imageId);
                                if (baseImage) {
                                  handleChangeBaseImage(flow.product.id, imageId, baseImage.url);
                                }
                              }}
                              onChangeSceneType={(newSceneType) => {
                                handleChangeSceneType(flow.id, flow.product.id, newSceneType);
                              }}
                              onPin={() => handlePinFlow(flow.id, flow.product.id, flow.isPinned)}
                              onGenerate={() => handleGenerateFlow(flow.product.id)}
                              onDeleteRevision={handleDeleteRevision}
                              onClick={() => handleProductClick(flow.product.id, flow.realFlowId)}
                              isSelected={selectedFlowIds.has(flow.id)}
                              onSelect={(selected) => handleSelectFlow(flow.id, selected)}
                              className={cn(
                                'animate-fade-in opacity-0',
                                `stagger-${Math.min(index + 1, 6)}`
                              )}
                              testId={`flow-item--${flow.id}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Flows Section */}
                    <div>
                      {pinnedFlows.length > 0 && (
                        <div className="mb-3">
                          <h3 className="text-sm font-medium text-muted-foreground">
                            All Flows ({unpinnedFlows.length})
                          </h3>
                        </div>
                      )}
                      <div
                        className={cn(
                          'grid gap-4',
                          showConfigPanel
                            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
                            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                        )}
                      >
                        {unpinnedFlows.map((flow, index) => (
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
                            availableSceneTypes={availableSceneTypes}
                            onChangeBaseImage={(imageId) => {
                              const baseImage = flow.baseImages.find((img) => img.id === imageId);
                              if (baseImage) {
                                handleChangeBaseImage(flow.product.id, imageId, baseImage.url);
                              }
                            }}
                            onChangeSceneType={(newSceneType) => {
                              handleChangeSceneType(flow.id, flow.product.id, newSceneType);
                            }}
                            onPin={() => handlePinFlow(flow.id, flow.product.id, flow.isPinned)}
                            onGenerate={() => handleGenerateFlow(flow.product.id)}
                            onDeleteRevision={handleDeleteRevision}
                            onClick={() => handleProductClick(flow.product.id, flow.realFlowId)}
                            isSelected={selectedFlowIds.has(flow.id)}
                            onSelect={(selected) => handleSelectFlow(flow.id, selected)}
                            className={cn(
                              'animate-fade-in opacity-0',
                              `stagger-${Math.min(index + 1, 6)}`
                            )}
                            testId={`flow-item--${flow.id}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // List View - ProductAssetCard with gallery navigation (1.5 cards visible)
                  <div className="mx-auto flex max-w-3xl flex-col gap-6">
                    {filteredFlows.map((flow) => (
                      <ProductAssetCard
                        key={flow.id}
                        product={{
                          id: flow.product.id,
                          name: flow.product.name,
                          sku: flow.product.sku,
                          thumbnailUrl: flow.baseImages[0]?.url,
                        }}
                        testId={`product-card--${flow.product.id}`}
                        revisions={flow.revisions.map((r) => ({
                          id: r.id,
                          imageUrl: r.imageUrl,
                          timestamp: r.timestamp,
                          type: r.type,
                          isVideo: false,
                          aspectRatio: r.aspectRatio,
                        }))}
                        configuration={{
                          sceneType: flow.sceneType,
                          aspectRatio: outputSettings.aspectRatio,
                          quality: outputSettings.quality,
                        }}
                        isPinned={flow.isPinned}
                        isApproved={flow.approvalStatus === 'approved'}
                        isGenerating={flow.status === 'generating'}
                        onPin={() => handlePinFlow(flow.id, flow.product.id, flow.isPinned)}
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
                        className="shrink-0"
                      />
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
                    onClick: () => {},
                  }}
                  testId="generation-flow-empty"
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

    </div>
  );
}
