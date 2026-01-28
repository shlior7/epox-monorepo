/**
 * Flow Orchestration Types (prompt building only)
 */

import type { PromptTags } from 'visualizer-types';

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
