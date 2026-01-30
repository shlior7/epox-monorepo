'use client';

import {
  ProductGrid,
  UnifiedStudioConfigPanel,
  type ConfigPanelState,
  type SceneTypeInfo,
} from '@/components/studio';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  Download,
  Eye,
  Filter,
  Heart,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { CategoryGenerationSettings, InspirationSection } from 'visualizer-types';
import type { CategoryInfo } from '@/components/studio/config-panel/InspireSection';

type StudioTab = 'images' | 'video';

function StudioPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch categories for the config panel
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) return { categories: [] };
      return res.json() as Promise<{
        categories: Array<{
          id: string;
          name: string;
          productCount: number;
          generationSettings?: CategoryGenerationSettings;
        }>;
      }>;
    },
  });

  const configPanelCategories: CategoryInfo[] = useMemo(() => {
    return (categoriesData?.categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      productCount: c.productCount,
    }));
  }, [categoriesData?.categories]);

  // Build initial inspiration sections from category defaults
  const initialConfigState: ConfigPanelState | undefined = useMemo(() => {
    const cats = categoriesData?.categories;
    if (!cats || cats.length === 0) return undefined;

    const sections: InspirationSection[] = cats.map((cat) => ({
      id: crypto.randomUUID(),
      categoryIds: [cat.id],
      sceneTypes: [],
      bubbles: cat.generationSettings?.defaultBubbles ?? [{ type: 'style' }, { type: 'lighting' }],
      enabled: true,
    }));

    return {
      generalInspiration: [],
      inspirationSections: sections,
      userPrompt: '',
      applyCollectionInspiration: true,
      applyCollectionPrompt: true,
      outputSettings: { aspectRatio: '1:1' as const, quality: '2k' as const, variantsCount: 1 },
    };
  }, [categoriesData?.categories]);

  // Track config panel state via onStateChange callback (inner provider → outer page)
  const configStateRef = useRef<ConfigPanelState>({
    generalInspiration: [],
    inspirationSections: [],
    userPrompt: '',
    applyCollectionInspiration: true,
    applyCollectionPrompt: true,
    outputSettings: { aspectRatio: '1:1', quality: '2k', variantsCount: 1 },
  });
  const handleConfigStateChange = useCallback((state: ConfigPanelState) => {
    configStateRef.current = state;
  }, []);

  // Selection state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Collection filter state
  const [activeCollectionFilter, setActiveCollectionFilter] = useState<string | null>(null);
  const [matchedCollectionId, setMatchedCollectionId] = useState<string | null>(null);

  // Fetch collections for filter tags
  const { data: collectionsData } = useQuery({
    queryKey: ['collections', { limit: 20 }],
    queryFn: () => apiClient.getCollections({ limit: 20 }),
  });

  const collections = collectionsData?.collections ?? [];

  // Fetch products for getting product names
  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 100 }],
    queryFn: () => apiClient.listProducts({ limit: 100 }),
  });

  const products = productsData?.products ?? [];

  // Map category ID → first product image URL for category bubble previews
  const categoryProductImages = useMemo(() => {
    const cats = categoriesData?.categories;
    if (!cats || !products.length) return {};
    const map: Record<string, string> = {};
    for (const cat of cats) {
      const product = products.find((p) => p.category === cat.name && p.imageUrl);
      if (product) {
        map[cat.id] = product.imageUrl;
      }
    }
    return map;
  }, [categoriesData?.categories, products]);

  // Detect if selected products match any collection
  useEffect(() => {
    if (selectedProductIds.length === 0) {
      setMatchedCollectionId(null);
      return;
    }

    // Check if selection matches any collection exactly
    const sortedSelection = [...selectedProductIds].sort();
    const matchingCollection = collections.find((collection) => {
      if (!collection.productIds || collection.productIds.length !== selectedProductIds.length) {
        return false;
      }
      const sortedCollectionProducts = [...collection.productIds].sort();
      return sortedSelection.every((id, index) => id === sortedCollectionProducts[index]);
    });

    setMatchedCollectionId(matchingCollection?.id || null);
  }, [selectedProductIds, collections]);

  // Handle collection click - select all products in that collection
  const handleCollectionClick = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (collection && collection.productIds) {
      setSelectedProductIds(collection.productIds);
      setActiveCollectionFilter(collectionId);
    }
  };

  // Create flow/collection mutation
  const createFlowMutation = useMutation({
    mutationFn: async (params: { productIds: string[]; autoGenerate?: boolean }) => {
      const { productIds, autoGenerate = false } = params;

      // Read latest config panel state from ref (bridges inner provider to outer page)
      const configState = configStateRef.current;

      if (productIds.length === 1) {
        // Single product - create generation flow
        const product = products.find((p) => p.id === productIds[0]);
        const flow = await apiClient.createGenerationFlow({
          productId: productIds[0],
          productName: product?.name,
          mode: 'generate',
        });
        return { type: 'flow' as const, id: flow.id, autoGenerate };
      } else {
        // Multiple products - create collection with settings
        const collection = await apiClient.createCollection({
          name: `Collection ${new Date().toLocaleDateString()}`,
          productIds,
          settings: {
            generalInspiration: configState.generalInspiration || [],
            inspirationSections: configState.inspirationSections || [],
            userPrompt: configState.userPrompt || '',
            aspectRatio: configState.outputSettings.aspectRatio,
            imageQuality: configState.outputSettings.quality,
            variantsPerProduct: configState.outputSettings.variantsCount,
          },
        });

        // If autoGenerate is true, trigger generation
        if (autoGenerate) {
          try {
            await apiClient.generateCollection(collection.id, {
              productIds,
              settings: {
                generalInspiration: configState.generalInspiration || [],
                inspirationSections: configState.inspirationSections || [],
                userPrompt: configState.userPrompt || '',
                aspectRatio: configState.outputSettings.aspectRatio,
                imageQuality: configState.outputSettings.quality,
                variantsPerProduct: configState.outputSettings.variantsCount,
              },
            });
          } catch (genError) {
            console.error('Failed to start generation:', genError);
            // Don't fail the whole operation, just warn
            toast.warning('Collection created but generation failed to start');
          }
        }

        return { type: 'collection' as const, id: collection.id, autoGenerate };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['studio'] });

      if (result.type === 'flow') {
        toast.success('Opening product in studio');
        router.push(`/studio/${result.id}`);
      } else {
        if (result.autoGenerate) {
          toast.success('Collection created and generation started!');
        } else {
          toast.success('Collection created');
        }
        router.push(`/studio/collections/${result.id}`);
      }
    },
    onError: (error) => {
      toast.error('Failed to create');
      console.error('Failed to create:', error);
    },
  });

  const handleCreateCollection = (autoGenerate: boolean = false) => {
    if (selectedProductIds.length === 0) {
      toast.error('Please select at least one product');
      return;
    }
    createFlowMutation.mutate({ productIds: selectedProductIds, autoGenerate });
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
    setShowSelectedOnly(false);
  };

  const handleDownloadSelected = () => {
    toast.info('Download functionality coming soon');
  };

  const handlePinSelected = () => {
    toast.info('Pin functionality coming soon');
  };

  const handleApproveSelected = () => {
    toast.info('Approve functionality coming soon');
  };

  const handleDeleteSelected = () => {
    toast.info('Delete functionality coming soon');
  };

  const handleSceneTypeChange = async (productId: string, sceneType: string) => {
    // Save the selected scene type as the product's default
    // When creating a collection, flows will automatically use this scene type

    // Optimistic update - update all relevant query keys
    const updateProductData = (old: any) => {
      if (!old) return old;
      if (old.products) {
        return {
          ...old,
          products: old.products.map((p: any) =>
            p.id === productId ? { ...p, selectedSceneType: sceneType } : p
          ),
        };
      }
      // If it's just an array of products
      if (Array.isArray(old)) {
        return old.map((p: any) =>
          p.id === productId ? { ...p, selectedSceneType: sceneType } : p
        );
      }
      return old;
    };

    queryClient.setQueryData(['products', { limit: 100 }], updateProductData);
    queryClient.setQueryData(['products'], updateProductData);

    try {
      await apiClient.updateProduct(productId, { selectedSceneType: sceneType });
      toast.success('Scene type updated');
    } catch (error) {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.error('Failed to update scene type');
      console.error('Failed to update scene type:', error);
    }
  };

  // Derive scene types from selected products using their selectedSceneType
  const sceneTypes: SceneTypeInfo[] = useMemo(() => {
    if (selectedProductIds.length === 0) {
      return [];
    }

    // Get selected products
    const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));

    // Group by scene type (using selectedSceneType or first scene type)
    const sceneTypeMap = new Map<string, { productIds: string[] }>();

    selectedProducts.forEach((product) => {
      // Use selectedSceneType if available, otherwise use the first scene type
      const rawSceneType = product.selectedSceneType || product.sceneTypes?.[0];
      // Normalize: trim whitespace
      const sceneType = rawSceneType?.trim();
      if (sceneType) {
        if (!sceneTypeMap.has(sceneType)) {
          sceneTypeMap.set(sceneType, { productIds: [] });
        }
        sceneTypeMap.get(sceneType)!.productIds.push(product.id);
      }
    });

    // Convert to array
    return Array.from(sceneTypeMap.entries()).map(([sceneType, data]) => ({
      sceneType,
      productCount: data.productIds.length,
      productIds: data.productIds,
    }));
  }, [selectedProductIds, products]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex-none border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          <div>
            <h1 className="text-lg font-semibold">Studio</h1>
            <p className="text-xs text-muted-foreground">Select products to create a collection</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Config Panel Sidebar */}
        <UnifiedStudioConfigPanel
          key={initialConfigState ? 'loaded' : 'loading'}
          mode="studio-home"
          sceneTypes={sceneTypes}
          categories={configPanelCategories}
          categoryProductImages={categoryProductImages}
          initialState={initialConfigState}
          onGenerate={() => handleCreateCollection(true)}
          isGenerating={createFlowMutation.isPending}
          onStateChange={handleConfigStateChange}
        />

        {/* Products Grid Area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Products Grid with integrated collection filters */}
          <ProductGrid
            selectedIds={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
            onSceneTypeChange={handleSceneTypeChange}
            filterToIds={showSelectedOnly ? selectedProductIds : undefined}
            selectionMode="card"
            showGeneratedAssets={true}
            showFilters={true}
            showViewToggle={true}
            className="h-full"
            testId="studio-product-grid"
            // Collection filter header to render after search
            collectionFilterHeader={
              <div className="flex items-center justify-between gap-4 border-b border-border bg-card/30 px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Collections:</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={
                        activeCollectionFilter === null && !matchedCollectionId
                          ? 'secondary'
                          : 'ghost'
                      }
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setActiveCollectionFilter(null);
                        setSelectedProductIds([]);
                      }}
                    >
                      All Products
                    </Button>
                    {collections.slice(0, 6).map((collection) => (
                      <Button
                        key={collection.id}
                        variant={matchedCollectionId === collection.id ? 'default' : 'ghost'}
                        size="sm"
                        className={cn(
                          'h-7 text-xs',
                          matchedCollectionId === collection.id &&
                            'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20'
                        )}
                        onClick={() => handleCollectionClick(collection.id)}
                      >
                        {collection.name}
                      </Button>
                    ))}
                    {collections.length > 6 && (
                      <Link href="/collections">
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          +{collections.length - 6} more
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                <Button
                  variant="glow"
                  size="sm"
                  onClick={() => {
                    if (matchedCollectionId) {
                      router.push(`/studio/collections/${matchedCollectionId}`);
                    } else {
                      handleCreateCollection(false); // Don't auto-generate from this button
                    }
                  }}
                  disabled={selectedProductIds.length === 0 || createFlowMutation.isPending}
                  data-testid="selection-island-create-button"
                >
                  {createFlowMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : matchedCollectionId ? (
                    <>
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      Go to Collection
                    </>
                  ) : selectedProductIds.length === 1 ? (
                    <>
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      Open in Studio
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      Create Collection{' '}
                      {selectedProductIds.length > 0 ? `(${selectedProductIds.length})` : ''}
                    </>
                  )}
                </Button>
              </div>
            }
          />
        </main>
      </div>

      {/* Selection Action Island */}
      {selectedProductIds.length > 0 && (
        <SelectionActionIsland
          selectedCount={selectedProductIds.length}
          showSelectedOnly={showSelectedOnly}
          onShowSelectedToggle={() => setShowSelectedOnly(!showSelectedOnly)}
          onDownload={handleDownloadSelected}
          onPin={handlePinSelected}
          onApprove={handleApproveSelected}
          onDelete={handleDeleteSelected}
          onClear={handleClearSelection}
        />
      )}
    </div>
  );
}

// Main export — no outer ConfigPanelProvider needed;
// UnifiedStudioConfigPanel creates its own, and we bridge state via onStateChange + ref.
export default function StudioPage() {
  return <StudioPageContent />;
}

// TODO: move to a shared SelectionActionIsland component
// Selection Action Island Component
function SelectionActionIsland({
  selectedCount,
  showSelectedOnly,
  onShowSelectedToggle,
  onDownload,
  onPin,
  onApprove,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  showSelectedOnly: boolean;
  onShowSelectedToggle: () => void;
  onDownload: () => void;
  onPin: () => void;
  onApprove: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2" data-testid="selection-island">
      <div
        className={cn(
          'flex items-center gap-4 rounded-full border border-border',
          'bg-card/95 px-6 py-3 shadow-xl backdrop-blur',
          'duration-300 animate-in fade-in slide-in-from-bottom-4'
        )}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onClear}
          data-testid="selection-island-clear"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Selection count */}
        <div className="flex items-center gap-2 border-r border-border pr-4">
          <span className="text-sm font-medium" data-testid="selection-island-count">
            {selectedCount} selected
          </span>
        </div>

        {/* Show selected toggle */}
        <Button
          variant={showSelectedOnly ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onShowSelectedToggle}
          data-testid="selection-island-show-toggle"
        >
          {showSelectedOnly ? (
            <Filter className="mr-2 h-4 w-4" />
          ) : (
            <Eye className="mr-2 h-4 w-4" />
          )}
          {showSelectedOnly ? 'Show All' : 'Show Selected'}
        </Button>

        {/* Action buttons */}
        <div className="flex items-center gap-1 border-l border-border pl-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            data-testid="selection-island-download"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onPin}
            data-testid="selection-island-pin"
          >
            <Heart className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onApprove}
            data-testid="selection-island-approve"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            data-testid="selection-island-delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
