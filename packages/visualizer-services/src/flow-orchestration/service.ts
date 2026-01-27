/**
 * Flow Orchestration Service
 * Coordinates flow creation, settings building, and image generation triggering
 *
 * Uses the bubble-based inspiration system where FlowGenerationSettings contains
 * generalInspiration (BubbleValue[]) and sceneTypeInspiration for prompt construction.
 */

import type { FlowGenerationSettings, BubbleValue } from 'visualizer-types';
import { DEFAULT_FLOW_SETTINGS } from 'visualizer-types';
import { getInspirationService } from '../inspiration';
import type { MergedInspirationSettings } from '../inspiration/types';
import type { CreateFlowRequest, PerProductSettings } from './types';

export interface FlowOrchestrationServiceConfig {
  defaultSettings?: Partial<FlowGenerationSettings>;
}

export class FlowOrchestrationService {
  private readonly defaultSettings: Partial<FlowGenerationSettings>;

  constructor(config: FlowOrchestrationServiceConfig = {}) {
    this.defaultSettings = config.defaultSettings ?? {};
  }

  /**
   * Build base settings from inspiration analysis.
   * Maps MergedInspirationSettings into bubble-based generalInspiration.
   */
  buildBaseSettings(
    inspirationSettings: MergedInspirationSettings,
    advancedSettings?: Partial<FlowGenerationSettings>
  ): FlowGenerationSettings {
    // Convert merged inspiration into bubbles
    const generalInspiration: BubbleValue[] = [];

    if (inspirationSettings.style) {
      generalInspiration.push({ type: 'style', preset: inspirationSettings.style });
    }
    if (inspirationSettings.lighting) {
      generalInspiration.push({ type: 'lighting', preset: inspirationSettings.lighting });
    }
    if (inspirationSettings.primaryImageUrl) {
      generalInspiration.push({
        type: 'reference',
        image: {
          url: inspirationSettings.primaryImageUrl,
          addedAt: new Date().toISOString(),
          sourceType: 'upload' as const,
        },
      });
    }

    const settings: FlowGenerationSettings = {
      ...DEFAULT_FLOW_SETTINGS,
      generalInspiration,

      // Output Settings
      aspectRatio: advancedSettings?.aspectRatio ?? '1:1',
      imageQuality: advancedSettings?.imageQuality ?? '2k',
      variantsPerProduct: advancedSettings?.variantsPerProduct ?? 4,

      // Model settings
      imageModel: advancedSettings?.imageModel,
      postAdjustments: advancedSettings?.postAdjustments,
    };

    return settings;
  }

  /**
   * Build per-product settings with room assignments
   */
  buildPerProductSettings(
    productId: string,
    productName: string,
    roomAssignment: string,
    baseImageId: string,
    baseSettings: FlowGenerationSettings
  ): PerProductSettings {
    const settings: FlowGenerationSettings = {
      ...baseSettings,
      sceneType: roomAssignment,
    };

    // Extract style/lighting from generalInspiration bubbles for prompt text
    const styleBubble = baseSettings.generalInspiration?.find((b) => b.type === 'style');
    const lightingBubble = baseSettings.generalInspiration?.find((b) => b.type === 'lighting');
    const style = (styleBubble as { preset?: string } | undefined)?.preset ?? 'modern';
    const lighting = (lightingBubble as { preset?: string } | undefined)?.preset ?? 'natural';

    const promptText = `Professional product photography of ${productName} in a ${roomAssignment} setting, ${style} style, ${lighting} lighting.`;

    return {
      productId,
      sceneType: roomAssignment,
      baseImageId,
      settings,
      promptText,
    };
  }

  /**
   * Prepare all data needed for flow creation
   * (The actual database operations should be done by the caller using visualizer-db)
   */
  prepareFlowCreation(request: CreateFlowRequest): {
    baseSettings: FlowGenerationSettings;
    productSettings: PerProductSettings[];
    estimatedDurationSeconds: number;
  } {
    // Merge inspiration analyses
    const inspirationService = getInspirationService();
    const mergedSettings = inspirationService.mergeInspirationAnalyses(request.inspirationImages);

    // Build base settings
    const baseSettings = this.buildBaseSettings(mergedSettings, request.advancedSettings);

    // Build per-product settings
    const productSettings: PerProductSettings[] = [];

    for (const productId of request.productIds) {
      // Get room assignment from analysis
      const sceneType = request.productAnalysis.productRoomAssignments[productId] ?? 'Living Room';

      // Get base image ID
      const baseImageId = request.selectedBaseImages[productId] ?? '';

      // Get product name from analysis
      const productAnalysis = request.productAnalysis.products.find((p) => p.productId === productId);
      const productName = productAnalysis?.productType ?? 'Product';

      const perProduct = this.buildPerProductSettings(productId, productName, sceneType, baseImageId, baseSettings);

      productSettings.push(perProduct);
    }

    // Estimate duration (roughly 30 seconds per image)
    const estimatedDurationSeconds = request.productIds.length * 30;

    return {
      baseSettings,
      productSettings,
      estimatedDurationSeconds,
    };
  }

  /**
   * Calculate estimated time for generation
   */
  estimateGenerationTime(imageCount: number): { seconds: number; display: string } {
    const seconds = imageCount * 30;
    const minutes = Math.ceil(seconds / 60);

    let display: string;
    if (minutes <= 1) {
      display = 'about 1 minute';
    } else if (minutes <= 5) {
      display = `${minutes - 1}-${minutes} minutes`;
    } else {
      display = `${minutes} minutes`;
    }

    return { seconds, display };
  }
}

// Singleton instance
let _flowOrchestrationService: FlowOrchestrationService | null = null;

export function getFlowOrchestrationService(): FlowOrchestrationService {
  _flowOrchestrationService ??= new FlowOrchestrationService();
  return _flowOrchestrationService;
}

export function resetFlowOrchestrationService(): void {
  _flowOrchestrationService = null;
}
