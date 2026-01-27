'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import type { StoreProductView, GeneratedAssetWithSync } from 'visualizer-types';

interface SyncResult {
  success: boolean;
  syncId?: string;
  externalImageId?: string;
  error?: string;
}

interface BulkSyncResult {
  success: boolean;
  results: Array<{
    assetId: string;
    success: boolean;
    syncId?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

interface FavoriteResult {
  success: boolean;
  isFavorite: boolean;
}

type StoreAssetsData = { products: StoreProductView[] };

export function useStoreActions() {
  const queryClient = useQueryClient();

  const invalidateAssets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['store-assets'] });
  }, [queryClient]);

  // Helper: Update asset in cache
  const updateAssetInCache = useCallback((
    assetId: string,
    updater: (asset: GeneratedAssetWithSync) => GeneratedAssetWithSync
  ) => {
    queryClient.setQueryData<StoreAssetsData>(['store-assets'], (old) => {
      if (!old) return old;

      return {
        products: old.products.map(product => ({
          ...product,
          syncedAssets: product.syncedAssets.map(asset =>
            asset.id === assetId ? updater(asset) : asset
          ),
          unsyncedAssets: product.unsyncedAssets.map(asset =>
            asset.id === assetId ? updater(asset) : asset
          ),
        })),
      };
    });
  }, [queryClient]);

  // Helper: Move asset between synced/unsynced lists
  const moveAssetInCache = useCallback((
    assetId: string,
    toSynced: boolean
  ) => {
    queryClient.setQueryData<StoreAssetsData>(['store-assets'], (old) => {
      if (!old) return old;

      return {
        products: old.products.map(product => {
          const syncedAsset = product.syncedAssets.find(a => a.id === assetId);
          const unsyncedAsset = product.unsyncedAssets.find(a => a.id === assetId);
          const asset = syncedAsset || unsyncedAsset;

          if (!asset) return product;

          if (toSynced) {
            // Move from unsynced to synced
            return {
              ...product,
              syncedAssets: [...product.syncedAssets, { ...asset, syncStatus: 'synced' as const }],
              unsyncedAssets: product.unsyncedAssets.filter(a => a.id !== assetId),
            };
          } else {
            // Move from synced to unsynced
            return {
              ...product,
              syncedAssets: product.syncedAssets.filter(a => a.id !== assetId),
              unsyncedAssets: [...product.unsyncedAssets, { ...asset, syncStatus: 'not_synced' as const }],
            };
          }
        }),
      };
    });
  }, [queryClient]);

  // Helper: Remove asset from cache
  const removeAssetFromCache = useCallback((assetId: string) => {
    queryClient.setQueryData<StoreAssetsData>(['store-assets'], (old) => {
      if (!old) return old;

      return {
        products: old.products.map(product => ({
          ...product,
          syncedAssets: product.syncedAssets.filter(a => a.id !== assetId),
          unsyncedAssets: product.unsyncedAssets.filter(a => a.id !== assetId),
        })).filter(p => p.syncedAssets.length > 0 || p.unsyncedAssets.length > 0 || p.baseImages.length > 0),
      };
    });
  }, [queryClient]);

  // Sync single asset with optimistic update
  const syncAssetMutation = useMutation({
    mutationFn: async ({
      assetId,
      productId,
    }: {
      assetId: string;
      productId: string;
    }): Promise<SyncResult> => {
      const response = await fetch('/api/store/sync-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, productId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync asset');
      }
      return data;
    },
    onMutate: async ({ assetId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['store-assets'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<StoreAssetsData>(['store-assets']);

      // Optimistically update: move to synced list
      moveAssetInCache(assetId, true);

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Asset synced to store');
    },
    onError: (err, _variables, context) => {
      // Rollback to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(['store-assets'], context.previousData);
      }
      toast.error('Failed to sync asset', {
        description: err.message,
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      invalidateAssets();
    },
  });

  // Unsync single asset with optimistic update
  const unsyncAssetMutation = useMutation({
    mutationFn: async ({
      assetId,
      productId,
    }: {
      assetId: string;
      productId: string;
    }): Promise<{ success: boolean }> => {
      const response = await fetch('/api/store/unsync-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, productId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsync asset');
      }
      return data;
    },
    onMutate: async ({ assetId }) => {
      await queryClient.cancelQueries({ queryKey: ['store-assets'] });
      const previousData = queryClient.getQueryData<StoreAssetsData>(['store-assets']);

      // Optimistically update: move to unsynced list
      moveAssetInCache(assetId, false);

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Asset removed from store');
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['store-assets'], context.previousData);
      }
      toast.error('Failed to remove asset', {
        description: err.message,
      });
    },
    onSettled: () => {
      invalidateAssets();
    },
  });

  // Bulk sync with optimistic update
  const bulkSyncMutation = useMutation({
    mutationFn: async (assetIds: string[]): Promise<BulkSyncResult> => {
      const response = await fetch('/api/store/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to bulk sync assets');
      }
      return data;
    },
    onMutate: async (assetIds) => {
      await queryClient.cancelQueries({ queryKey: ['store-assets'] });
      const previousData = queryClient.getQueryData<StoreAssetsData>(['store-assets']);

      // Optimistically update all assets
      assetIds.forEach(assetId => moveAssetInCache(assetId, true));

      return { previousData };
    },
    onSuccess: (data) => {
      const { succeeded, failed } = data.summary;
      if (failed === 0) {
        toast.success(`${succeeded} asset${succeeded > 1 ? 's' : ''} synced to store`);
      } else {
        toast.warning(`${succeeded} synced, ${failed} failed`);
      }
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['store-assets'], context.previousData);
      }
      toast.error('Failed to sync assets', {
        description: err.message,
      });
    },
    onSettled: () => {
      invalidateAssets();
    },
  });

  // Toggle favorite with optimistic update
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (assetId: string): Promise<FavoriteResult> => {
      const response = await fetch('/api/favorite-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle favorite');
      }
      return data;
    },
    onMutate: async (assetId) => {
      await queryClient.cancelQueries({ queryKey: ['store-assets'] });
      const previousData = queryClient.getQueryData<StoreAssetsData>(['store-assets']);

      // Optimistically toggle favorite
      updateAssetInCache(assetId, (asset) => ({
        ...asset,
        isFavorite: !asset.isFavorite,
      }));

      return { previousData };
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['store-assets'], context.previousData);
      }
      toast.error('Failed to update favorite', {
        description: err.message,
      });
    },
    onSettled: () => {
      invalidateAssets();
    },
  });

  // Delete asset with optimistic update
  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string): Promise<{ success: boolean }> => {
      const response = await fetch('/api/generated-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assetId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete asset');
      }
      return { success: true };
    },
    onMutate: async (assetId) => {
      await queryClient.cancelQueries({ queryKey: ['store-assets'] });
      const previousData = queryClient.getQueryData<StoreAssetsData>(['store-assets']);

      // Optimistically remove asset
      removeAssetFromCache(assetId);

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Asset deleted');
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['store-assets'], context.previousData);
      }
      toast.error('Failed to delete asset', {
        description: err.message,
      });
    },
    onSettled: () => {
      invalidateAssets();
    },
  });

  return {
    syncAsset: syncAssetMutation.mutateAsync,
    unsyncAsset: unsyncAssetMutation.mutateAsync,
    bulkSync: bulkSyncMutation.mutateAsync,
    toggleFavorite: toggleFavoriteMutation.mutateAsync,
    deleteAsset: deleteAssetMutation.mutateAsync,
    isSyncing: syncAssetMutation.isPending,
    isUnsyncing: unsyncAssetMutation.isPending,
    isBulkSyncing: bulkSyncMutation.isPending,
    isTogglingFavorite: toggleFavoriteMutation.isPending,
    isDeleting: deleteAssetMutation.isPending,
  };
}
