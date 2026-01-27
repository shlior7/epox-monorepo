'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import { apiClient, type UpdateCollectionPayload } from '@/lib/api-client';
import type { CollectionSession } from 'visualizer-types';

type CollectionsData = { collections: CollectionSession[] };

export function useCollectionActions() {
  const queryClient = useQueryClient();

  const invalidateCollections = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['collections'] });
  }, [queryClient]);

  // Helper: Remove collection from cache
  const removeCollectionFromCache = useCallback((collectionId: string) => {
    queryClient.setQueriesData<CollectionsData>(
      { queryKey: ['collections'] },
      (old) => {
        if (!old) return old;
        return {
          collections: old.collections.filter((c) => c.id !== collectionId),
        };
      }
    );
  }, [queryClient]);

  // Helper: Update collection in cache
  const updateCollectionInCache = useCallback(
    (collectionId: string, updater: (collection: CollectionSession) => CollectionSession) => {
      queryClient.setQueriesData<CollectionsData>(
        { queryKey: ['collections'] },
        (old) => {
          if (!old) return old;
          return {
            collections: old.collections.map((c) => (c.id === collectionId ? updater(c) : c)),
          };
        }
      );

      // Also update single collection query
      queryClient.setQueryData<CollectionSession>(
        ['collection', collectionId],
        (old) => {
          if (!old) return old;
          return updater(old);
        }
      );
    },
    [queryClient]
  );

  // Delete collection with optimistic update
  const deleteCollectionMutation = useMutation({
    mutationFn: async ({ id, assetAction }: { id: string; assetAction?: 'delete_all' | 'keep_pinned_approved' }) => {
      await apiClient.deleteCollection(id, assetAction ? { assetPolicy: assetAction } : undefined);
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['collections'] });
      const previousData = queryClient.getQueriesData<CollectionsData>({
        queryKey: ['collections'],
      });

      // Optimistically remove collection
      removeCollectionFromCache(id);

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Collection deleted');
    },
    onError: (err: Error, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to delete collection', {
        description: err.message,
      });
    },
    onSettled: () => {
      invalidateCollections();
    },
  });

  // Update collection with optimistic update
  const updateCollectionMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CollectionSession>;
    }) => {
      // Build a properly typed payload for the API
      const payload: UpdateCollectionPayload = {};

      // Copy over the allowed fields
      if (data.name !== undefined) payload.name = data.name;
      if (data.status !== undefined) payload.status = data.status;
      if (data.productIds !== undefined) payload.productIds = data.productIds;
      // Handle settings - skip if null, cast to proper type
      if (data.settings !== undefined && data.settings !== null) {
        // The settings type is complex - cast it to UpdateCollectionPayload's settings type
        payload.settings = data.settings as UpdateCollectionPayload['settings'];
      }

      return apiClient.updateCollection(id, payload);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['collections'] });
      await queryClient.cancelQueries({ queryKey: ['collection', id] });

      const previousListData = queryClient.getQueriesData<CollectionsData>({
        queryKey: ['collections'],
      });
      const previousSingleData = queryClient.getQueryData<CollectionSession>(['collection', id]);

      // Optimistically update collection
      updateCollectionInCache(id, (collection) => ({
        ...collection,
        ...data,
      }));

      return { previousListData, previousSingleData };
    },
    onError: (err: Error, { id }, context) => {
      if (context?.previousListData) {
        context.previousListData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousSingleData) {
        queryClient.setQueryData(['collection', id], context.previousSingleData);
      }
      toast.error('Failed to update collection', {
        description: err.message,
      });
    },
    onSettled: (_, __, { id }) => {
      invalidateCollections();
      queryClient.invalidateQueries({ queryKey: ['collection', id] });
    },
  });

  return {
    deleteCollection: deleteCollectionMutation.mutateAsync,
    updateCollection: updateCollectionMutation.mutateAsync,
    isDeleting: deleteCollectionMutation.isPending,
    isUpdating: updateCollectionMutation.isPending,
  };
}
