/**
 * Prompt Builder
 * Builds generation prompts from settings and tags
 */

import type { PromptTags } from 'visualizer-types';
import type { PromptBuilderContext } from './types';

/**
 * Build a prompt from PromptTags
 */
export function buildPromptFromTags(tags: PromptTags): string {
  const parts: string[] = [];

  if (tags.sceneType.length > 0) {
    parts.push(...tags.sceneType);
  }

  if (tags.mood.length > 0) {
    parts.push(...tags.mood);
  }

  if (tags.lighting.length > 0) {
    parts.push(...tags.lighting.map((l) => `${l} lighting`));
  }

  if (tags.style.length > 0) {
    parts.push(...tags.style.map((s) => `${s} style`));
  }

  if (tags.custom.length > 0) {
    parts.push(...tags.custom);
  }

  return parts.filter(Boolean).join(', ');
}

/**
 * Build a full generation prompt from context
 */
export function buildPromptFromContext(context: PromptBuilderContext): string {
  // If custom prompt is provided, use it directly
  if (context.customPrompt) {
    return context.customPrompt;
  }

  // If promptTags are provided, use them
  if (context.promptTags) {
    const tagsPrompt = buildPromptFromTags(context.promptTags);
    if (tagsPrompt) {
      // Prepend product name if not in tags
      return `${context.productName} in ${tagsPrompt}`;
    }
  }

  // Build from individual settings
  const parts: string[] = [
    `Professional ${context.sceneType.toLowerCase()}`,
    `featuring ${context.productName} as the focal point`,
    `${context.style.toLowerCase()} style`,
    `${context.lighting.toLowerCase()} lighting`,
    `${context.colorScheme.toLowerCase()} color scheme`,
  ];

  if (context.surroundings && context.surroundings !== 'Minimal (No Props)') {
    parts.push(`with ${context.surroundings.toLowerCase()} surroundings`);
  }

  if (context.props.length > 0) {
    parts.push(`props include ${context.props.join(', ')}`);
  }

  return parts.join(', ');
}

/**
 * Generate prompt variations for variety
 */
export function generatePromptVariations(basePrompt: string, varietyLevel: number, count: number = 3): string[] {
  // If variety level is low, return the same prompt
  if (varietyLevel < 30) {
    return Array(count).fill(basePrompt);
  }

  // Add subtle variations
  const variations = [basePrompt];

  const modifiers = [
    ['from a slightly different angle', 'from an alternative viewpoint'],
    ['with varied lighting', 'with subtle lighting adjustments'],
    ['featuring alternative arrangement', 'with different spatial composition'],
  ];

  for (let i = 1; i < count; i++) {
    const modifierSet = modifiers[i % modifiers.length];
    const modifier = modifierSet[Math.floor(Math.random() * modifierSet.length)];
    variations.push(`${basePrompt}, ${modifier}`);
  }

  return variations.slice(0, count);
}
