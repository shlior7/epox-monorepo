'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, type UpdateStudioSettingsPayload } from '@/lib/api-client';
import { useConfigPanelContext, type ConfigPanelState } from '../config-panel';
import type { FlowGenerationSettings, SceneTypeBubbleMap, SceneTypeInspirationMap } from 'visualizer-types';

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
 * Bridges the new unified config panel with existing API endpoints.
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
      inspirationImages: state.inspirationImages,
      sceneTypeInspirations: convertBubblesToApiFormat(state.sceneTypeBubbles),
      userPrompt: state.userPrompt,
      aspectRatio: state.outputSettings.aspectRatio,
      imageQuality: state.outputSettings.quality,
      variantsCount: state.outputSettings.variantsCount,
    };
  }, [state]);

  // Convert ConfigPanelState to FlowGenerationSettings
  const toFlowSettings = useCallback((): FlowGenerationSettings => {
    return {
      inspirationImages: state.inspirationImages,
      sceneTypeInspirations: convertBubblesToInspirations(state.sceneTypeBubbles),
      userPrompt: state.userPrompt,
      aspectRatio: state.outputSettings.aspectRatio,
      imageQuality: state.outputSettings.quality,
      variantsCount: state.outputSettings.variantsCount,
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
        sceneTypeBubbles: convertInspirationsTooBubbles(settings.sceneTypeInspirations),
        userPrompt: settings.userPrompt || '',
        applyCollectionPrompt: true,
        outputSettings: {
          aspectRatio: settings.aspectRatio || '1:1',
          quality: settings.imageQuality || '2k',
          variantsCount: settings.variantsCount || 1,
        },
        inspirationImages: settings.inspirationImages || [],
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

// ===== HELPER FUNCTIONS =====

/**
 * Convert SceneTypeBubbleMap to API format (with Record<string, unknown> for json).
 */
function convertBubblesToApiFormat(
  bubbles: SceneTypeBubbleMap
): UpdateStudioSettingsPayload['sceneTypeInspirations'] {
  if (Object.keys(bubbles).length === 0) {
    return undefined;
  }

  const result: NonNullable<UpdateStudioSettingsPayload['sceneTypeInspirations']> = {};

  for (const [sceneType, config] of Object.entries(bubbles)) {
    const images = config.bubbles
      .filter((b): b is typeof b & { image: NonNullable<typeof b.image> } =>
        b.type === 'inspiration' && b.image !== undefined
      )
      .map((b) => b.image);

    if (images.length > 0) {
      result[sceneType] = {
        inspirationImages: images,
        mergedAnalysis: {
          json: {
            styleSummary: '',
            detectedSceneType: sceneType,
            sceneInventory: [],
            lightingPhysics: {
              sourceDirection: '',
              shadowQuality: '',
              colorTemperature: '',
            },
          },
          promptText: '',
        },
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Convert SceneTypeBubbleMap to the existing SceneTypeInspirationMap format.
 * Note: This is bridge code - the mergedAnalysis fields are placeholders since
 * the new bubble system doesn't track per-image analysis like the old system.
 */
function convertBubblesToInspirations(
  bubbles: SceneTypeBubbleMap
): SceneTypeInspirationMap | undefined {
  if (Object.keys(bubbles).length === 0) {
    return undefined;
  }

  const result: SceneTypeInspirationMap = {};

  for (const [sceneType, config] of Object.entries(bubbles)) {
    const images = config.bubbles
      .filter((b): b is typeof b & { image: NonNullable<typeof b.image> } =>
        b.type === 'inspiration' && b.image !== undefined
      )
      .map((b) => b.image);

    if (images.length > 0) {
      result[sceneType] = {
        inspirationImages: images,
        // Placeholder analysis - the actual analysis will be regenerated server-side
        mergedAnalysis: {
          json: {
            styleSummary: '',
            detectedSceneType: sceneType,
            sceneInventory: [],
            lightingPhysics: {
              sourceDirection: '',
              shadowQuality: '',
              colorTemperature: '',
            },
          } as any,
          promptText: '',
        },
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Convert existing SceneTypeInspirationMap to SceneTypeBubbleMap
 */
function convertInspirationsTooBubbles(
  inspirations?: Record<string, { inspirationImages: any[]; mergedAnalysis: any }>
): SceneTypeBubbleMap {
  if (!inspirations) {
    return {};
  }

  const result: SceneTypeBubbleMap = {};

  for (const [sceneType, data] of Object.entries(inspirations)) {
    result[sceneType] = {
      bubbles: data.inspirationImages.map((img) => ({
        type: 'inspiration' as const,
        image: img,
      })),
    };
  }

  return result;
}
