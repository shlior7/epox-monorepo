'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  X,
  Download,
  Heart,
  CheckCircle,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout';
import {
  UnifiedStudioConfigPanel,
  ConfigPanelProvider,
  ProductGrid,
  type SceneTypeInfo,
} from '@/components/studio';
import { apiClient, type Product } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type {
  InspirationImage,
  InspirationBubbleValue,
} from 'visualizer-types';

type StudioTab = 'images' | 'video';

export default function StudioPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Selection state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Collection filter state
  const [activeCollectionFilter, setActiveCollectionFilter] = useState<string | null>(null);

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

  // Create flow/collection mutation
  const createFlowMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      if (productIds.length === 1) {
        // Single product - create generation flow
        const product = products.find((p) => p.id === productIds[0]);
        const flow = await apiClient.createGenerationFlow({
          productId: productIds[0],
          productName: product?.name,
          mode: 'generate',
        });
        return { type: 'flow' as const, id: flow.id };
      } else {
        // Multiple products - create collection
        const collection = await apiClient.createCollection({
          name: `Collection ${new Date().toLocaleDateString()}`,
          productIds,
        });
        return { type: 'collection' as const, id: collection.id };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['studio'] });

      if (result.type === 'flow') {
        toast.success('Opening product in studio');
        router.push(`/studio/${result.id}`);
      } else {
        toast.success('Collection created');
        router.push(`/studio/collections/${result.id}`);
      }
    },
    onError: (error) => {
      toast.error('Failed to create');
      console.error('Failed to create:', error);
    },
  });

  const handleCreateCollection = () => {
    if (selectedProductIds.length === 0) {
      toast.error('Please select at least one product');
      return;
    }
    createFlowMutation.mutate(selectedProductIds);
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

  // Derive scene types from selected products
  const sceneTypes: SceneTypeInfo[] = [];

  return (
    <ConfigPanelProvider
      initialState={{
        sceneTypeBubbles: {},
        userPrompt: '',
        applyCollectionPrompt: true,
        outputSettings: {
          aspectRatio: '1:1',
          quality: '2k',
          variantsCount: 1,
        },
        inspirationImages: [],
      }}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
      <div className="flex-none border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">Studio</h1>
            <p className="text-xs text-muted-foreground">
              Select products to create a collection
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="glow"
              onClick={handleCreateCollection}
              disabled={selectedProductIds.length === 0 || createFlowMutation.isPending}
            >
              {createFlowMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {selectedProductIds.length === 1 ? 'Open in Studio' : `Create Collection (${selectedProductIds.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Config Panel Sidebar */}
        <UnifiedStudioConfigPanel
          mode="studio-home"
          sceneTypes={sceneTypes}
          onGenerate={handleCreateCollection}
          isGenerating={createFlowMutation.isPending}
        />

        {/* Products Grid Area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Collection Filter Tags */}
          {collections.length > 0 && (
            <div className="flex items-center gap-2 border-b border-border bg-card/30 px-6 py-3">
              <span className="text-xs font-medium text-muted-foreground">Collections:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeCollectionFilter === null ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setActiveCollectionFilter(null)}
                >
                  All Products
                </Button>
                {collections.slice(0, 6).map((collection) => (
                  <Button
                    key={collection.id}
                    variant={activeCollectionFilter === collection.id ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setActiveCollectionFilter(collection.id)}
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
          )}

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <ProductGrid
              selectedIds={selectedProductIds}
              onSelectionChange={setSelectedProductIds}
              filterToIds={showSelectedOnly ? selectedProductIds : undefined}
              selectionMode="card"
              showGeneratedAssets={true}
              showFilters={true}
              showViewToggle={true}
              className="h-full"
              testId="studio-product-grid"
            />
          </div>
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
    </ConfigPanelProvider>
  );
}

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
          'animate-in fade-in slide-in-from-bottom-4 duration-300'
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
          <Button variant="ghost" size="sm" onClick={onDownload} data-testid="selection-island-download">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onPin} data-testid="selection-island-pin">
            <Heart className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onApprove} data-testid="selection-island-approve">
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
