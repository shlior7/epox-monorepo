'use client';

import { useQuery } from '@tanstack/react-query';
import type { StoreProductView, AssetSyncStatus } from 'visualizer-types';

export interface StoreFilters {
  search: string;
  syncStatus: 'all' | AssetSyncStatus;
  favoriteFilter: 'all' | 'favorites_only';
  collectionId?: string;
}

interface UseStoreAssetsResult {
  products: StoreProductView[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

async function fetchStoreAssets(): Promise<{ products: StoreProductView[] }> {
  const response = await fetch('/api/store/assets');
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch assets' }));
    throw new Error(error.error || 'Failed to fetch assets');
  }
  return response.json();
}

export function useStoreAssets(filters?: StoreFilters): UseStoreAssetsResult {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['store-assets'],
    queryFn: fetchStoreAssets,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Apply client-side filtering
  let products = data?.products ?? [];

  if (filters) {
    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.product.name.toLowerCase().includes(searchLower) ||
          p.syncedAssets.some((asset) => asset.prompt?.toLowerCase().includes(searchLower)) ||
          p.unsyncedAssets.some((asset) => asset.prompt?.toLowerCase().includes(searchLower))
      );
    }

    // Filter by sync status - affects which assets are shown
    if (filters.syncStatus !== 'all') {
      products = products.map((p) => {
        if (filters.syncStatus === 'synced') {
          return { ...p, unsyncedAssets: [] };
        } else {
          // Show only unsynced assets with the specific status
          return {
            ...p,
            syncedAssets: [],
            unsyncedAssets: p.unsyncedAssets.filter((a) => a.syncStatus === filters.syncStatus),
          };
        }
      }).filter((p) => p.syncedAssets.length > 0 || p.unsyncedAssets.length > 0 || p.baseImages.length > 0);
    }

    // Filter by favorites - show only products with favorite assets
    if (filters.favoriteFilter === 'favorites_only') {
      products = products.map((p) => ({
        ...p,
        syncedAssets: p.syncedAssets.filter((a) => a.isFavorite),
        unsyncedAssets: p.unsyncedAssets.filter((a) => a.isFavorite),
      })).filter((p) => p.syncedAssets.length > 0 || p.unsyncedAssets.length > 0);
    }

    // Filter by collection (products in the collection)
    if (filters.collectionId) {
      // This will be passed down from parent component with the collection's productIds
      // For now, keep this as a placeholder - will be implemented with collection data
    }
  }

  return {
    products,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
