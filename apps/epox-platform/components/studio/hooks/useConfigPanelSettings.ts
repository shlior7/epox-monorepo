'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, type UpdateStudioSettingsPayload } from '@/lib/api-client';
import { useConfigPanelContext, type ConfigPanelState } from '../config-panel';
import type { FlowGenerationSettings } from 'visualizer-types';

// ===== TYPES =====

export interface UseConfigPanelSettingsOptions {
  /**
   * Entity type being configured
   */
  mode: 'collection' | 'flow';
  /**
   * Collection or flow ID
   */
  entityId: string;
  /**
   * Callback after successful save
   */
  onSaveSuccess?: () => void;
}

export interface UseConfigPanelSettingsResult {
  /**
   * Save current state to the server
   */
  save: () => Promise<void>;
  /**
   * Whether save is in progress
   */
  isSaving: boolean;
  /**
   * Convert current state to FlowGenerationSettings for generation
   */
  toFlowSettings: () => FlowGenerationSettings;
  /**
   * Initialize state from server settings
   */
  initializeFromSettings: (settings: FlowGenerationSettings) => void;
}

/**
 * Hook to manage persisting ConfigPanelContext state to the server.
 * Bridges the unified config panel with existing API endpoints.
 */
export function useConfigPanelSettings({
  mode,
  entityId,
  onSaveSuccess,
}: UseConfigPanelSettingsOptions): UseConfigPanelSettingsResult {
  const queryClient = useQueryClient();
  const { state, isDirty, markClean, resetState } = useConfigPanelContext();

  // Convert ConfigPanelState to API payload
  const toApiPayload = useCallback((): UpdateStudioSettingsPayload => {
    return {
      generalInspiration: state.generalInspiration,
      inspirationSections: state.inspirationSections,
      userPrompt: state.userPrompt,
      aspectRatio: state.outputSettings.aspectRatio,
      imageQuality: state.outputSettings.quality,
      variantsPerProduct: state.outputSettings.variantsCount,
    };
  }, [state]);

  // Convert ConfigPanelState to FlowGenerationSettings
  const toFlowSettings = useCallback((): FlowGenerationSettings => {
    return {
      generalInspiration: state.generalInspiration,
      inspirationSections: state.inspirationSections,
      userPrompt: state.userPrompt,
      aspectRatio: state.outputSettings.aspectRatio,
      imageQuality: state.outputSettings.quality,
      variantsPerProduct: state.outputSettings.variantsCount,
    };
  }, [state]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toApiPayload();

      if (mode === 'collection') {
        await apiClient.updateCollection(entityId, { settings: payload as any });
      } else {
        await apiClient.updateStudioSettings(entityId, payload);
      }
    },
    onSuccess: () => {
      markClean();
      queryClient.invalidateQueries({ queryKey: [mode, entityId] });
      if (mode === 'collection') {
        queryClient.invalidateQueries({ queryKey: ['collection-flows', entityId] });
      }
      onSaveSuccess?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    },
  });

  // Initialize from server settings
  const initializeFromSettings = useCallback(
    (settings: FlowGenerationSettings) => {
      const newState: ConfigPanelState = {
        generalInspiration: settings.generalInspiration || [],
        inspirationSections: settings.inspirationSections || [],
        userPrompt: settings.userPrompt || '',
        applyCollectionInspiration: true,
        applyCollectionPrompt: true,
        outputSettings: {
          aspectRatio: settings.aspectRatio || '1:1',
          quality: settings.imageQuality || '2k',
          variantsCount: settings.variantsPerProduct || 1,
        },
      };
      resetState(newState);
    },
    [resetState]
  );

  return {
    save: () => saveMutation.mutateAsync(),
    isSaving: saveMutation.isPending,
    toFlowSettings,
    initializeFromSettings,
  };
}
