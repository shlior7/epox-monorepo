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
  Upload,
  X,
  ChevronDown,
  Image as ImageIcon,
  Lightbulb,
  Settings2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SearchInput } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GenerationFlowCard } from '@/components/studio/GenerationFlowCard';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/toast';
import type { AssetStatus, ApprovalStatus } from '@/lib/types';
import type {
  FlowGenerationSettings,
  InspirationImage,
  SceneTypeInspirationMap,
  StylePreset,
  LightingPreset,
  VisionAnalysisResult,
} from 'visualizer-types';
import { STYLE_PRESETS, LIGHTING_PRESETS } from 'visualizer-types';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfigPanel, setShowConfigPanel] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('scene-style');

  // Settings state (mirrors single product studio)
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);
  const [sceneTypeInspirations, setSceneTypeInspirations] = useState<SceneTypeInspirationMap>({});
  const [stylePreset, setStylePreset] = useState<StylePreset>('Modern Minimalist');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('Studio Soft Light');
  const [userPrompt, setUserPrompt] = useState('');
  const [isAnalyzingInspiration, setIsAnalyzingInspiration] = useState(false);
  const [outputSettings, setOutputSettings] = useState({
    aspectRatio: '1:1',
    quality: '2k' as '1k' | '2k' | '4k',
    variantsCount: 1,
  });

  // Generation state
  const [flowJobs, setFlowJobs] = useState<Map<string, FlowJobState>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      if (s.sceneTypeInspirations) setSceneTypeInspirations(s.sceneTypeInspirations as unknown as SceneTypeInspirationMap);
      if (s.stylePreset) setStylePreset(s.stylePreset as StylePreset);
      if (s.lightingPreset) setLightingPreset(s.lightingPreset as LightingPreset);
      if (s.userPrompt) setUserPrompt(s.userPrompt);
      if (s.aspectRatio) setOutputSettings((prev) => ({ ...prev, aspectRatio: s.aspectRatio! }));
      if (s.imageQuality) setOutputSettings((prev) => ({ ...prev, quality: s.imageQuality! }));
      if (s.variantsCount) setOutputSettings((prev) => ({ ...prev, variantsCount: s.variantsCount! }));
    }
  }, [collection?.settings]);

  // Filter products to only those in the collection
  const collectionProducts = useMemo(() => {
    return productsData?.products.filter((p) => collection?.productIds?.includes(p.id)) || [];
  }, [productsData?.products, collection?.productIds]);

  // Derive scene types from products
  const derivedSceneTypes = useMemo(() => {
    const sceneTypeCounts: Record<string, number> = {};
    for (const product of collectionProducts) {
      const sceneTypes = product.sceneTypes || [];
      for (const sceneType of sceneTypes) {
        sceneTypeCounts[sceneType] = (sceneTypeCounts[sceneType] || 0) + 1;
      }
    }
    return sceneTypeCounts;
  }, [collectionProducts]);

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
        selectedBaseImageId: baseImages[0]?.id || '',
        revisions,
        status: getFlowStatus(product.id, flowData?.status),
        approvalStatus: 'pending' as ApprovalStatus,
        isPinned: false,
        sceneType: product.sceneTypes?.[0] || 'Living Room',
      };
    });
  }, [collectionProducts, getFlowStatus, productToFlowMap, flowsData?.flows]);

  const filteredFlows = useMemo(() => {
    return generationFlows.filter((flow) => {
      const matchesSearch = flow.product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || flow.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [generationFlows, searchQuery, statusFilter]);

  const readyToGenerateFlows = useMemo(() => {
    // Include pending, completed, and error flows - anything not currently generating
    return generationFlows.filter((flow) => flow.baseImages.length > 0 && flow.status !== 'generating');
  }, [generationFlows]);

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
        toast.success(`${completedCount} image(s) generated successfully!`);
        queryClient.invalidateQueries({ queryKey: ['collection', id] });
        queryClient.invalidateQueries({ queryKey: ['collection-flows', id] });
        queryClient.invalidateQueries({ queryKey: ['products', 'all'] });
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} generation(s) failed`);
      }
    }
  }, [flowJobs, id, queryClient]);

  // Start/stop polling based on active jobs
  useEffect(() => {
    if (flowJobs.size > 0 && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(pollJobStatuses, 2000);
      pollJobStatuses();
    } else if (flowJobs.size === 0 && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
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
      const settings = {
        inspirationImages,
        sceneTypeInspirations: sceneTypeInspirations as unknown as Record<string, {
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
        }>,
        stylePreset,
        lightingPreset,
        userPrompt,
        aspectRatio: outputSettings.aspectRatio,
        imageQuality: outputSettings.quality as '1k' | '2k' | '4k',
        variantsCount: outputSettings.variantsCount,
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
  }, [inspirationImages, sceneTypeInspirations, stylePreset, lightingPreset, userPrompt, outputSettings]);

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
      toast.error(error instanceof Error ? error.message : 'Failed to start generation');
    },
  });

  // Handle inspiration image upload
  const handleInspirationUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsAnalyzingInspiration(true);

    try {
      for (const file of Array.from(files)) {
        // Upload the file
        const uploadResult = await apiClient.uploadFile(file, 'inspiration', { collectionId: id });

        // Create inspiration image entry
        const newImage: InspirationImage = {
          url: uploadResult.url,
          thumbnailUrl: uploadResult.url,
          tags: [],
          addedAt: new Date().toISOString(),
          sourceType: 'upload',
        };

        // Add to state immediately
        setInspirationImages((prev) => [...prev, newImage]);

        // Analyze with Vision Scanner
        try {
          const analysisResponse = await fetch('/api/vision-scanner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: uploadResult.url }),
          });

          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            if (analysisData.success && analysisData.analysis) {
              const analysis: VisionAnalysisResult = analysisData.analysis;
              const detectedSceneType = analysis.json?.detectedSceneType || 'General';

              // Update scene type inspirations
              setSceneTypeInspirations((prev) => {
                const existing = prev[detectedSceneType] || {
                  inspirationImages: [],
                  mergedAnalysis: analysis,
                };
                return {
                  ...prev,
                  [detectedSceneType]: {
                    inspirationImages: [...existing.inspirationImages, newImage],
                    mergedAnalysis: analysis, // Use latest analysis (could merge in future)
                  },
                };
              });

              toast.success(`Analyzed: ${detectedSceneType} scene detected`);
            }
          }
        } catch (analysisError) {
          console.error('Vision analysis failed:', analysisError);
          // Still keep the image even if analysis fails
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload inspiration image');
    } finally {
      setIsAnalyzingInspiration(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
              disabled={readyToGenerateFlows.length === 0 || generateAllMutation.isPending}
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
                  Generating {generatingProductIds.length} image
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

          {/* Flow Cards Grid */}
          <div className="flex-1 overflow-y-auto p-8">
            {filteredFlows.length > 0 ? (
              <div
                className={cn(
                  'grid gap-4',
                  viewMode === 'matrix'
                    ? showConfigPanel
                      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
                      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1'
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
                    onDeleteRevision={handleDeleteRevision}
                    onClick={() => handleProductClick(flow.product.id, flow.realFlowId)}
                    className={cn('animate-fade-in cursor-pointer opacity-0', `stagger-${Math.min(index + 1, 6)}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No products in collection"
                description="Add products to start generating images."
                action={{
                  label: 'Add Products',
                  onClick: () => {},
                }}
              />
            )}
          </div>
        </main>

        {/* Config Panel Sidebar - New 4-Section Layout */}
        {showConfigPanel && (
          <aside className="w-96 overflow-y-auto border-l border-border bg-card/50">
            <div className="space-y-1 p-4">
              {/* Section 1: Scene Style (Inspiration Images) */}
              <div className="rounded-lg border border-border/50 bg-card">
                <button
                  className="flex w-full items-center justify-between p-4"
                  onClick={() => setExpandedSection(expandedSection === 'scene-style' ? null : 'scene-style')}
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span className="font-medium">Scene Style</span>
                    <Badge variant="secondary" className="text-xs">
                      {inspirationImages.length}
                    </Badge>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      expandedSection === 'scene-style' && 'rotate-180'
                    )}
                  />
                </button>

                {expandedSection === 'scene-style' && (
                  <div className="border-t border-border/50 p-4 pt-3">
                    {/* Inspiration Images Grid */}
                    <div className="mb-4">
                      <p className="mb-2 text-xs text-muted-foreground">Inspiration Images</p>
                      <div className="grid grid-cols-3 gap-2">
                        {inspirationImages.map((img, idx) => (
                          <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border">
                            <Image
                              src={img.url}
                              alt={`Inspiration ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                            <button
                              onClick={() => handleRemoveInspiration(idx)}
                              className="absolute right-1 top-1 rounded-full bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <X className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        ))}
                        {inspirationImages.length < 5 && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnalyzingInspiration}
                            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5"
                          >
                            {isAnalyzingInspiration ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : (
                              <Plus className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleInspirationUpload}
                      />
                    </div>

                    {/* Detected Scene Types */}
                    {Object.keys(sceneTypeGroups).length > 0 && (
                      <div className="mb-4">
                        <p className="mb-2 text-xs text-muted-foreground">Detected Scene Types</p>
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
                    <div className="mb-3">
                      <p className="mb-1.5 text-xs text-muted-foreground">Style</p>
                      <Select value={stylePreset} onValueChange={(v) => setStylePreset(v as StylePreset)}>
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
                      <Select value={lightingPreset} onValueChange={(v) => setLightingPreset(v as LightingPreset)}>
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
                )}
              </div>

              {/* Section 2: Product Scene Types (Read-only) */}
              <div className="rounded-lg border border-border/50 bg-card">
                <button
                  className="flex w-full items-center justify-between p-4"
                  onClick={() => setExpandedSection(expandedSection === 'products' ? null : 'products')}
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span className="font-medium">Product Scene Types</span>
                    <Badge variant="secondary" className="text-xs">
                      {Object.keys(derivedSceneTypes).length}
                    </Badge>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      expandedSection === 'products' && 'rotate-180'
                    )}
                  />
                </button>

                {expandedSection === 'products' && (
                  <div className="border-t border-border/50 p-4 pt-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Scene types detected from products in this collection
                    </p>
                    <div className="space-y-2">
                      {Object.entries(derivedSceneTypes).map(([sceneType, count]) => (
                        <div key={sceneType} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                          <span className="text-sm">{sceneType}</span>
                          <Badge variant="outline" className="text-xs">
                            {count} product{count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: User Prompt */}
              <div className="rounded-lg border border-border/50 bg-card">
                <button
                  className="flex w-full items-center justify-between p-4"
                  onClick={() => setExpandedSection(expandedSection === 'prompt' ? null : 'prompt')}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium">User Prompt</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      expandedSection === 'prompt' && 'rotate-180'
                    )}
                  />
                </button>

                {expandedSection === 'prompt' && (
                  <div className="border-t border-border/50 p-4 pt-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Add specific details for all generations in this collection
                    </p>
                    <Textarea
                      placeholder="e.g., include a coffee cup on the table, warm cozy atmosphere..."
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Section 4: Output Settings */}
              <div className="rounded-lg border border-border/50 bg-card">
                <button
                  className="flex w-full items-center justify-between p-4"
                  onClick={() => setExpandedSection(expandedSection === 'output' ? null : 'output')}
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <span className="font-medium">Output Settings</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      expandedSection === 'output' && 'rotate-180'
                    )}
                  />
                </button>

                {expandedSection === 'output' && (
                  <div className="border-t border-border/50 p-4 pt-3">
                    {/* Quality */}
                    <div className="mb-4">
                      <p className="mb-2 text-xs text-muted-foreground">Quality</p>
                      <div className="flex gap-2">
                        {QUALITY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setOutputSettings((prev) => ({ ...prev, quality: opt.value }))}
                            className={cn(
                              'flex-1 rounded-lg border px-3 py-2 text-center text-sm transition-colors',
                              outputSettings.quality === opt.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="mb-4">
                      <p className="mb-2 text-xs text-muted-foreground">Aspect Ratio</p>
                      <div className="flex gap-2">
                        {ASPECT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setOutputSettings((prev) => ({ ...prev, aspectRatio: opt.value }))}
                            className={cn(
                              'flex-1 rounded-lg border px-3 py-2 text-center text-sm transition-colors',
                              outputSettings.aspectRatio === opt.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <span className="mr-1">{opt.icon}</span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Variants per Product */}
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">Variants per Product</p>
                      <div className="flex gap-2">
                        {[1, 2, 4].map((count) => (
                          <button
                            key={count}
                            onClick={() => setOutputSettings((prev) => ({ ...prev, variantsCount: count }))}
                            className={cn(
                              'flex-1 rounded-lg border px-3 py-2 text-center text-sm transition-colors',
                              outputSettings.variantsCount === count
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
