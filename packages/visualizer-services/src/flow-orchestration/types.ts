/**
 * Flow Orchestration Service Types
 */

import type { FlowGenerationSettings, PromptTags } from 'visualizer-types';
import type { InspirationImage } from '../inspiration/types';
import type { BatchAnalysisResult } from '../product-analysis/types';

export interface CreateFlowRequest {
  clientId: string;
  sessionId: string;
  productIds: string[];
  selectedBaseImages: Record<string, string>;
  inspirationImages: InspirationImage[];
  productAnalysis: BatchAnalysisResult;
  promptTags?: PromptTags;
  advancedSettings?: Partial<FlowGenerationSettings>;
}

export interface FlowCreationResult {
  flowId: string;
  imageCount: number;
  pendingAssetIds: string[];
  estimatedDurationSeconds: number;
}

export interface PerProductSettings {
  productId: string;
  sceneType: string;
  baseImageId: string;
  settings: FlowGenerationSettings;
  promptText: string;
}

export interface PromptBuilderContext {
  productName: string;
  sceneType: string;
  style: string;
  lighting: string;
  colorScheme: string;
  surroundings: string;
  props: string[];
  promptTags?: PromptTags;
  customPrompt?: string;
}



