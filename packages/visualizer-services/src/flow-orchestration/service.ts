/**
 * Flow Orchestration Service
 * Coordinates flow creation, settings building, and image generation triggering
 * 
 * NOTE: This service is being updated to work with the new FlowGenerationSettings structure.
 * The new structure uses inspiration images with Vision Scanner analysis and Art Director
 * for prompt construction.
 */

import type { FlowGenerationSettings, StylePreset, LightingPreset } from 'visualizer-types';
import { DEFAULT_FLOW_SETTINGS } from 'visualizer-types';
import { getInspirationService } from '../inspiration';
import type { MergedInspirationSettings } from '../inspiration/types';
import type {
  CreateFlowRequest,
  PerProductSettings
} from './types';

export interface FlowOrchestrationServiceConfig {
  defaultSettings?: Partial<FlowGenerationSettings>;
}

export class FlowOrchestrationService {
  private readonly defaultSettings: Partial<FlowGenerationSettings>;

  constructor(config: FlowOrchestrationServiceConfig = {}) {
    this.defaultSettings = config.defaultSettings ?? {};
  }

  /**
   * Build base settings from inspiration images
   * Updated to work with new FlowGenerationSettings structure
   */
  buildBaseSettings(
    inspirationSettings: MergedInspirationSettings,
    advancedSettings?: Partial<FlowGenerationSettings>
  ): FlowGenerationSettings {
    // Map old style names to new StylePreset
    const stylePreset = this.mapToStylePreset(inspirationSettings.style);
    const lightingPreset = this.mapToLightingPreset(inspirationSettings.lighting);

    const settings: FlowGenerationSettings = {
      ...DEFAULT_FLOW_SETTINGS,
      
      // Scene Style (Section 1)
      inspirationImages: inspirationSettings.primaryImageUrl 
        ? [{
            url: inspirationSettings.primaryImageUrl,
            addedAt: new Date().toISOString(),
            sourceType: 'upload' as const,
          }]
        : [],
      stylePreset,
      lightingPreset,

      // Output Settings (Section 4)
      aspectRatio: advancedSettings?.aspectRatio ?? '1:1',
      imageQuality: advancedSettings?.imageQuality ?? '2K',
      variantsCount: advancedSettings?.variantsCount ?? 4,

      // Model settings
      imageModel: advancedSettings?.imageModel,
      postAdjustments: advancedSettings?.postAdjustments,
    };

    return settings;
  }

  /**
   * Map old style string to new StylePreset
   */
  private mapToStylePreset(style?: string): StylePreset {
    if (!style) return 'Modern Minimalist';
    
    const styleMap: Record<string, StylePreset> = {
      'Modern Minimalist': 'Modern Minimalist',
      'Scandinavian': 'Scandinavian',
      'Industrial': 'Industrial',
      'Industrial Loft': 'Industrial',
      'Bohemian': 'Bohemian',
      'Bohemian Chic': 'Bohemian',
      'Mid-Century': 'Mid-Century',
      'Mid-Century Modern': 'Mid-Century',
      'Rustic': 'Rustic',
      'Rustic / Natural': 'Rustic',
      'Coastal': 'Coastal',
      'Coastal / Mediterranean': 'Coastal',
      'Luxurious': 'Luxurious',
      'Luxury / Premium': 'Luxurious',
      'Studio Clean': 'Studio Clean',
    };

    return styleMap[style] ?? 'Modern Minimalist';
  }

  /**
   * Map old lighting string to new LightingPreset
   */
  private mapToLightingPreset(lighting?: string): LightingPreset {
    if (!lighting) return 'Studio Soft Light';
    
    const lightingMap: Record<string, LightingPreset> = {
      'Natural Daylight': 'Natural Daylight',
      'Studio Soft Light': 'Studio Soft Light',
      'Golden Hour': 'Golden Hour',
      'Golden Hour / Sunset Glow': 'Golden Hour',
      'Dramatic Shadow': 'Dramatic Shadow',
      'Bright & Airy': 'Bright & Airy',
      'Bright Noon Sunlight': 'Bright & Airy',
      'Moody Low-Key': 'Moody Low-Key',
      'Cool Overcast': 'Cool Overcast',
      'Overcast Ambient': 'Cool Overcast',
    };

    return lightingMap[lighting] ?? 'Studio Soft Light';
  }

  /**
   * Build per-product settings with room assignments
   * Updated for new settings structure
   */
  buildPerProductSettings(
    productId: string,
    productName: string,
    roomAssignment: string,
    baseImageId: string,
    baseSettings: FlowGenerationSettings
  ): PerProductSettings {
    // In the new system, per-product settings are simpler
    // The Art Director handles prompt construction based on product's subject analysis
    const settings: FlowGenerationSettings = {
      ...baseSettings,
    };

    // Generate a simple prompt text for backward compatibility
    const promptText = `Professional product photography of ${productName} in a ${roomAssignment} setting, ${baseSettings.stylePreset} style, ${baseSettings.lightingPreset} lighting.`;

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
    const mergedSettings = inspirationService.mergeInspirationAnalyses(
      request.inspirationImages
    );

    // Build base settings
    const baseSettings = this.buildBaseSettings(
      mergedSettings,
      request.advancedSettings
    );

    // Build per-product settings
    const productSettings: PerProductSettings[] = [];

    for (const productId of request.productIds) {
      // Get room assignment from analysis
      const sceneType = request.productAnalysis.productRoomAssignments[productId] ?? 'Living Room';

      // Get base image ID
      const baseImageId = request.selectedBaseImages[productId] ?? '';

      // Get product name from analysis
      const productAnalysis = request.productAnalysis.products.find(p => p.productId === productId);
      const productName = productAnalysis?.productType ?? 'Product';

      const perProduct = this.buildPerProductSettings(
        productId,
        productName,
        sceneType,
        baseImageId,
        baseSettings
      );

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
