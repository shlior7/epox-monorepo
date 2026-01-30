/**
 * Flow Orchestration exports
 * Prompt building utilities for AI generation
 */

// Prompt builder
export { buildPromptFromTags, buildPromptFromContext, generatePromptVariations } from './prompt-builder';
export type { PromptBuilderContext } from './types';

// Art Director prompt builder (sandwich prompts with Pure Reference Constraint)
export { buildArtDirectorPrompt, buildSimplePrompt, buildSmartPrompt, STYLE_CASCADE } from './art-director-builder';
export type { ArtDirectorInput, ArtDirectorResult, ProductContext, SmartPromptInput, SmartPromptResult } from './art-director-builder';

// Settings merger (hierarchical settings cascade)
export { mergeGenerationSettings, formatSettingsSources } from './settings-merger';
export type { MergeContext, MergedSettings, BubbleSource } from './settings-merger';
