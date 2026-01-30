'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Package, Import, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout';
import { Skeleton } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ConnectStoreWizard,
  StoreFiltersBar,
  ProductAssetsGroup,
  BulkActionBar,
  useStoreAssets,
  useStoreActions,
  ImportProductsModal,
  type ImportResult,
  type StoreFilters,
  type StoreProductViewWithUrls,
} from '@/components/store';
import { CategoryWizardModal, type CategoryWizardCategory } from '@/components/wizard';
import type { StoreProductView } from 'visualizer-types';

const DEFAULT_FILTERS: StoreFilters = {
  search: '',
  syncStatus: 'all',
  favoriteFilter: 'all',
  collectionId: undefined,
};

interface Collection {
  id: string;
  name: string;
  productIds: string[];
}

function StoreAssetsContent({
  storeUrl,
  storeType,
  onImportClick,
}: {
  storeUrl: string;
  storeType: string;
  onImportClick: () => void;
}) {
  const queryClient = useQueryClient();

  // Filters state
  const [filters, setFilters] = useState<StoreFilters>(DEFAULT_FILTERS);

  // Selection state
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  // Syncing state (track individual assets being synced)
  const [syncingAssetIds, setSyncingAssetIds] = useState<Set<string>>(new Set());

  // Fetch products with filters
  const { products: allProducts, isLoading, error, refetch } = useStoreAssets(filters);

  // Fetch collections for the dropdown
  const { data: collectionsData } = useQuery({
    queryKey: ['collections-list'],
    queryFn: async () => {
      const response = await fetch('/api/collections?limit=100');
      if (!response.ok) throw new Error('Failed to fetch collections');
      return response.json() as Promise<{ collections: Collection[] }>;
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  });

  // Get collection options for the filter dropdown
  const collectionOptions = useMemo(() => {
    return (collectionsData?.collections ?? []).map((c) => ({
      id: c.id,
      name: c.name,
    }));
  }, [collectionsData?.collections]);

  // Filter products by selected collection
  const products = useMemo(() => {
    if (!filters.collectionId) return allProducts;

    const selectedCollection = collectionsData?.collections?.find(
      (c) => c.id === filters.collectionId
    );
    if (!selectedCollection) return allProducts;

    const productIdsInCollection = new Set(selectedCollection.productIds);
    return allProducts.filter((p) => productIdsInCollection.has(p.product.id));
  }, [allProducts, filters.collectionId, collectionsData?.collections]);

  // Actions
  const {
    syncAsset,
    unsyncAsset,
    bulkSync,
    toggleFavorite,
    deleteAsset,
    isBulkSyncing,
  } = useStoreActions();

  // Find product name by asset
  const findProductForAsset = useCallback((assetId: string): StoreProductView | undefined => {
    return products.find((p) =>
      p.syncedAssets.some((a) => a.id === assetId) ||
      p.unsyncedAssets.some((a) => a.id === assetId)
    );
  }, [products]);

  // Selection handlers
  const handleSelectAsset = useCallback((assetId: string, selected: boolean) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(assetId);
      } else {
        next.delete(assetId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedAssetIds(new Set());
  }, []);

  // Sync handlers with toast notifications
  const handleSyncAsset = useCallback(
    async (assetId: string, productId: string) => {
      const productView = findProductForAsset(assetId);
      setSyncingAssetIds((prev) => new Set(prev).add(assetId));

      try {
        await syncAsset({ assetId, productId });

        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['store-assets'] });

        // Show success toast with product link
        if (productView) {
          toast.success('Image synced to store', {
            description: `Synced to ${productView.product.name}`,
            action: productView.product.storeUrl ? {
              label: 'View in Store',
              onClick: () => window.open(productView.product.storeUrl!, '_blank'),
            } : undefined,
          });
        } else {
          toast.success('Image synced to store');
        }
      } catch (err) {
        toast.error('Failed to sync image', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setSyncingAssetIds((prev) => {
          const next = new Set(prev);
          next.delete(assetId);
          return next;
        });
      }
    },
    [syncAsset, findProductForAsset, queryClient]
  );

  const handleUnsyncAsset = useCallback(
    async (assetId: string, productId: string) => {
      const productView = findProductForAsset(assetId);
      setSyncingAssetIds((prev) => new Set(prev).add(assetId));

      try {
        await unsyncAsset({ assetId, productId });

        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['store-assets'] });

        toast.success('Image removed from store', {
          description: productView ? `Removed from ${productView.product.name}` : undefined,
        });
      } catch (err) {
        toast.error('Failed to remove image', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setSyncingAssetIds((prev) => {
          const next = new Set(prev);
          next.delete(assetId);
          return next;
        });
      }
    },
    [unsyncAsset, findProductForAsset, queryClient]
  );

  // Bulk action handlers
  const handleBulkSync = useCallback(async () => {
    if (selectedAssetIds.size === 0) return;

    const assetIds = Array.from(selectedAssetIds);
    setSyncingAssetIds(new Set(assetIds));

    try {
      await bulkSync(assetIds);
      setSelectedAssetIds(new Set());

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['store-assets'] });

      toast.success(`${assetIds.length} images synced to store`);
    } catch (err) {
      toast.error('Failed to sync some images', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSyncingAssetIds(new Set());
    }
  }, [selectedAssetIds, bulkSync, queryClient]);

  const handleBulkFavorite = useCallback(async () => {
    const assetIds = Array.from(selectedAssetIds);

    // Perform favorites in parallel
    const results = await Promise.allSettled(
      assetIds.map((assetId) => toggleFavorite(assetId))
    );

    setSelectedAssetIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['store-assets'] });

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      toast.error(`Failed to update ${failures.length} favorites`);
    } else {
      toast.success(`Updated ${assetIds.length} favorites`);
    }
  }, [selectedAssetIds, toggleFavorite, queryClient]);

  const handleBulkDelete = useCallback(async () => {
    const assetIds = Array.from(selectedAssetIds);
    const deleteCount = assetIds.length;

    // Optimistic update: immediately remove from UI
    queryClient.setQueryData(['store-assets'], (oldData: { products: StoreProductView[] } | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        products: oldData.products.map((p) => ({
          ...p,
          syncedAssets: p.syncedAssets.filter((a) => !assetIds.includes(a.id)),
          unsyncedAssets: p.unsyncedAssets.filter((a) => !assetIds.includes(a.id)),
        })).filter((p) => p.syncedAssets.length > 0 || p.unsyncedAssets.length > 0 || p.baseImages.length > 0),
      };
    });

    // Clear selection immediately
    setSelectedAssetIds(new Set());
    toast.success(`Deleted ${deleteCount} assets`);

    // Perform actual deletes in parallel (fire and forget with error handling)
    const results = await Promise.allSettled(
      assetIds.map((assetId) => deleteAsset(assetId))
    );

    // Check for failures and refetch if needed
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      toast.error(`Failed to delete ${failures.length} assets`);
      // Refetch to restore correct state
      queryClient.invalidateQueries({ queryKey: ['store-assets'] });
    }
  }, [selectedAssetIds, deleteAsset, queryClient]);

  // Toggle favorite handler
  const handleToggleFavorite = useCallback(
    async (assetId: string) => {
      await toggleFavorite(assetId);
      queryClient.invalidateQueries({ queryKey: ['store-assets'] });
    },
    [toggleFavorite, queryClient]
  );

  // Delete handler
  const handleDeleteAsset = useCallback(
    async (assetId: string) => {
      await deleteAsset(assetId);
      queryClient.invalidateQueries({ queryKey: ['store-assets'] });
      toast.success('Asset deleted');
    },
    [deleteAsset, queryClient]
  );

  // Image edited handler - refresh the data
  const handleAssetEdited = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['store-assets'] });
  }, [queryClient]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6" data-testid="store-assets-loading">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8" data-testid="store-assets-error">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Failed to load store assets</p>
          <p className="mt-2 text-xs text-destructive">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Empty state - no products at all
  if (products.length === 0 && !filters.search && filters.syncStatus === 'all' && filters.favoriteFilter === 'all') {
    return (
      <div className="flex flex-1 items-center justify-center p-8" data-testid="store-assets-empty">
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No products yet"
          description="Import products from your store or create them manually to get started."
          action={{
            label: 'Import Products',
            onClick: onImportClick,
          }}
          testId="store-empty-state"
        />
      </div>
    );
  }

  // Empty state - no results for current filters
  if (products.length === 0) {
    return (
      <div className="flex flex-col" data-testid="store-assets-no-results">
        <StoreFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          collectionOptions={collectionOptions}
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="No matching products"
            description="Try adjusting your filters to find what you're looking for."
            action={{
              label: 'Clear Filters',
              onClick: () => setFilters(DEFAULT_FILTERS),
            }}
            testId="store-no-results-state"
          />
        </div>
      </div>
    );
  }

  // Products display
  return (
    <div className="flex flex-col" data-testid="store-assets-content">
      {/* Filters Bar */}
      <StoreFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        collectionOptions={collectionOptions}
      />

      {/* Product Groups */}
      <div className="flex-1 space-y-4 p-4" data-testid="store-product-groups">
        {products.map((productView, index) => (
          <ProductAssetsGroup
            key={productView.product.id}
            productView={productView as StoreProductViewWithUrls}
            selectedAssetIds={selectedAssetIds}
            onSelectAsset={handleSelectAsset}
            onSyncAsset={handleSyncAsset}
            onUnsyncAsset={handleUnsyncAsset}
            onToggleFavorite={handleToggleFavorite}
            onDeleteAsset={handleDeleteAsset}
            onAssetEdited={handleAssetEdited}
            syncingAssetIds={syncingAssetIds}
            testId={`store-product-group-${index}`}
          />
        ))}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedAssetIds.size}
        onSync={handleBulkSync}
        onFavorite={handleBulkFavorite}
        onDelete={handleBulkDelete}
        onClearSelection={handleClearSelection}
        isSyncing={isBulkSyncing}
        testId="store-bulk-action-bar"
      />
    </div>
  );
}

function StorePageContent() {
  const searchParams = useSearchParams();
  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [wizardCategories, setWizardCategories] = useState<CategoryWizardCategory[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Auto-open import modal after store connection
  const justConnected = searchParams.get('connected') === 'true';
  useEffect(() => {
    if (justConnected) {
      setIsImportModalOpen(true);
    }
  }, [justConnected]);

  const handleImportComplete = useCallback((result: ImportResult) => {
    toast.success(`Imported ${result.imported} products`);

    // If there are unconfigured categories, show the wizard
    if (result.unconfiguredCategories.length > 0) {
      setWizardCategories(
        result.unconfiguredCategories.map((c) => ({
          id: c.id,
          name: c.name,
          productCount: c.productCount,
        }))
      );
      setIsWizardOpen(true);
    }
  }, []);

  // Check store connection status
  const {
    data: connectionData,
    isLoading: isLoadingConnection,
    error: connectionError,
  } = useQuery({
    queryKey: ['store-connection-status'],
    queryFn: async () => {
      const response = await fetch('/api/store-connection/status');
      if (!response.ok) {
        throw new Error('Failed to fetch store connection status');
      }
      return response.json() as Promise<{
        connected: boolean;
        connection: {
          id: string;
          storeType: string;
          storeUrl: string;
          status: string;
        } | null;
      }>;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isConnected = connectionData?.connected ?? false;

  // Loading state
  if (isLoadingConnection) {
    return (
      <div className="flex h-full flex-col" data-testid="store-page-loading">
        <PageHeader
          title="Store"
          description="Manage your store connection and sync assets"
          testId="store-header"
        />
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-64 w-full max-w-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (connectionError) {
    return (
      <div className="flex h-full flex-col" data-testid="store-page-error">
        <PageHeader
          title="Store"
          description="Manage your store connection and sync assets"
          testId="store-header"
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Failed to load store connection status
            </p>
            <p className="mt-2 text-xs text-destructive">
              {connectionError instanceof Error ? connectionError.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not connected - show wizard
  if (!isConnected) {
    return (
      <div className="flex h-full flex-col" data-testid="store-page-not-connected">
        <ConnectStoreWizard />
      </div>
    );
  }

  // Connected - show store page with assets
  return (
    <div className="flex h-full flex-col" data-testid="store-page-connected">
      <PageHeader
        title="Store"
        description={`Connected to ${connectionData?.connection?.storeType ?? 'store'}`}
        testId="store-header"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              data-testid="store-import-btn"
            >
              <Import className="h-4 w-4 mr-2" />
              Import Products
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              data-testid="store-settings-btn"
            >
              <Link href="/store/settings" className='flex flex-row'>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          </div>
        }
      />

      <StoreAssetsContent
        storeUrl={connectionData?.connection?.storeUrl ?? ''}
        storeType={connectionData?.connection?.storeType ?? 'store'}
        onImportClick={() => setIsImportModalOpen(true)}
      />

      {/* Import Products Modal */}
      <ImportProductsModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={handleImportComplete}
        testId="store-import-modal"
      />

      {/* Category Wizard Modal — shown after import if unconfigured categories exist */}
      <CategoryWizardModal
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        categories={wizardCategories}
        onComplete={() => {
          // Wizard saves defaults to categories via API internally
          toast.success('Category defaults saved');
        }}
        saveToCategories
      />
    </div>
  );
}

export function StoreClient() {
  return (
    <div className="flex h-full flex-col" data-testid="store-page">
      <StorePageContent />
    </div>
  );
}
