export {
  AI_MODELS,
  AVAILABLE_IMAGE_MODELS,
  AVAILABLE_TEXT_MODELS,
  DEFAULT_AI_MODEL_CONFIG,
  OPTIMIZATION_DEFAULTS,
  ERROR_MESSAGES,
  COST_ESTIMATES,
  MATERIAL_KEYWORDS,
  COLOR_KEYWORDS,
  STYLE_MAP,
  getModelsForTask,
  getModelsWithReferenceSupport,
  getModelsWithEditingSupport,
  getModelsForGeneration,
  selectBestModel,
  getUpgradeRecommendation,
  getModelById,
  modelSupportsCapability,
} from './constants';

export type {
  ModelTask,
  ModelApiType,
  ModelTier,
  ModelCapabilities,
  AIModelOption,
  TextModelOption,
  ModelSelectionContext,
  AIModelConfig,
} from './constants';

export type { AdjustmentHint } from './types';

export function parseSize(size: string | number): number {
  if (typeof size === 'number') return size;
  const parsed = parseInt(size.replace('px', '').trim(), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
