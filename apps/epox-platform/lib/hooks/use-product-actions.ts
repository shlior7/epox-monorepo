'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api-client';
import type { Product } from '@/lib/api-client';

type ProductsData = { products: Product[] };

export function useProductActions() {
  const queryClient = useQueryClient();

  const invalidateProducts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [queryClient]);

  // Helper: Remove product from cache
  const removeProductFromCache = useCallback((productId: string) => {
    // Update all products queries
    queryClient.setQueriesData<ProductsData>(
      { queryKey: ['products'] },
      (old) => {
        if (!old) return old;
        return {
          products: old.products.filter((p) => p.id !== productId),
        };
      }
    );
  }, [queryClient]);

  // Helper: Update product in cache
  const updateProductInCache = useCallback(
    (productId: string, updater: (product: Product) => Product) => {
      queryClient.setQueriesData<ProductsData>(
        { queryKey: ['products'] },
        (old) => {
          if (!old) return old;
          return {
            products: old.products.map((p) => (p.id === productId ? updater(p) : p)),
          };
        }
      );
    },
    [queryClient]
  );

  // Delete product with optimistic update
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiClient.deleteProduct(productId);
    },
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousData = queryClient.getQueriesData<ProductsData>({
        queryKey: ['products'],
      });

      // Optimistically remove product
      removeProductFromCache(productId);

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Product deleted');
    },
    onError: (err: Error, _productId, context) => {
      // Rollback
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to delete product', {
        description: err.message,
      });
    },
    onSettled: () => {
      invalidateProducts();
    },
  });

  // Bulk delete with optimistic update
  const bulkDeleteMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      await Promise.all(productIds.map((id) => apiClient.deleteProduct(id)));
    },
    onMutate: async (productIds) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousData = queryClient.getQueriesData<ProductsData>({
        queryKey: ['products'],
      });

      // Optimistically remove all products
      productIds.forEach((id) => removeProductFromCache(id));

      return { previousData };
    },
    onSuccess: (_, productIds) => {
      toast.success(`${productIds.length} product${productIds.length > 1 ? 's' : ''} deleted`);
    },
    onError: (err: Error, _productIds, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to delete products', {
        description: err.message,
      });
    },
    onSettled: () => {
      invalidateProducts();
    },
  });

  // Toggle favorite with optimistic update
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Assuming API endpoint exists
      return apiClient.toggleProductFavorite?.(productId);
    },
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousData = queryClient.getQueriesData<ProductsData>({
        queryKey: ['products'],
      });

      // Optimistically toggle favorite
      updateProductInCache(productId, (product) => ({
        ...product,
        isFavorite: !product.isFavorite,
      }));

      return { previousData };
    },
    onError: (err: Error, _productId, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to update favorite', {
        description: err.message,
      });
    },
    onSettled: () => {
      invalidateProducts();
    },
  });

  return {
    deleteProduct: deleteProductMutation.mutateAsync,
    bulkDelete: bulkDeleteMutation.mutateAsync,
    toggleFavorite: toggleFavoriteMutation.mutateAsync,
    isDeleting: deleteProductMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    isTogglingFavorite: toggleFavoriteMutation.isPending,
  };
}
