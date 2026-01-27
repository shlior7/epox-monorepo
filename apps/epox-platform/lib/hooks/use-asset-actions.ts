'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api-client';

export function useAssetActions() {
  const queryClient = useQueryClient();

  const invalidateAssets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['store-assets'] });
  }, [queryClient]);

  // Delete asset with optimistic update
  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
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
      // Cancel related queries
      await queryClient.cancelQueries({ queryKey: ['assets'] });
      await queryClient.cancelQueries({ queryKey: ['store-assets'] });

      const previousAssets = queryClient.getQueryData(['assets']);
      const previousStoreAssets = queryClient.getQueryData(['store-assets']);

      // Optimistically remove from cache
      // This will be handled by the store-assets hook if needed
      // For general assets page, we'd update here

      return { previousAssets, previousStoreAssets };
    },
    onSuccess: () => {
      toast.success('Asset deleted');
    },
    onError: (err: Error, _assetId, context) => {
      if (context?.previousAssets) {
        queryClient.setQueryData(['assets'], context.previousAssets);
      }
      if (context?.previousStoreAssets) {
        queryClient.setQueryData(['store-assets'], context.previousStoreAssets);
      }
      toast.error('Failed to delete asset', {
        description: err.message,
      });
    },
    onSettled: () => {
      invalidateAssets();
    },
  });

  // Toggle favorite with optimistic update
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (assetId: string) => {
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
      await queryClient.cancelQueries({ queryKey: ['assets'] });
      await queryClient.cancelQueries({ queryKey: ['store-assets'] });

      const previousAssets = queryClient.getQueryData(['assets']);
      const previousStoreAssets = queryClient.getQueryData(['store-assets']);

      // Optimistic update handled by specific queries

      return { previousAssets, previousStoreAssets };
    },
    onError: (err: Error, _assetId, context) => {
      if (context?.previousAssets) {
        queryClient.setQueryData(['assets'], context.previousAssets);
      }
      if (context?.previousStoreAssets) {
        queryClient.setQueryData(['store-assets'], context.previousStoreAssets);
      }
      toast.error('Failed to update favorite', {
        description: err.message,
      });
    },
    onSettled: () => {
      invalidateAssets();
    },
  });

  return {
    deleteAsset: deleteAssetMutation.mutateAsync,
    toggleFavorite: toggleFavoriteMutation.mutateAsync,
    isDeleting: deleteAssetMutation.isPending,
    isTogglingFavorite: toggleFavoriteMutation.isPending,
  };
}
