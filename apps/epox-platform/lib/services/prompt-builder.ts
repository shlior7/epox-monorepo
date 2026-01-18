/**
 * Prompt Builder Service
 * Builds AI generation prompts from prompt tags (room type, style, mood, lighting, custom)
 */

import type { PromptTags } from '@/lib/types';

/**
 * Build a generation prompt from prompt tags
 * Following the plan's Prompt Tags Q&A approach
 */
export function buildPromptFromTags(tags: PromptTags): string {
  const parts: string[] = [];

  // Room type
  if (tags.sceneType.length > 0) {
    parts.push(tags.sceneType.join(', '));
  }

  // Style
  if (tags.style.length > 0) {
    parts.push(tags.style.map((s) => `${s.toLowerCase()} style`).join(', '));
  }

  // Mood
  if (tags.mood.length > 0) {
    parts.push(tags.mood.map((m) => m.toLowerCase()).join(', '));
  }

  // Lighting
  if (tags.lighting.length > 0) {
    parts.push(tags.lighting.map((l) => `${l.toLowerCase()} lighting`).join(', '));
  }

  // Custom tags
  if (tags.custom.length > 0) {
    parts.push(tags.custom.join(', '));
  }

  return parts.join(', ');
}

/**
 * Build a full generation prompt with product context
 */
export function buildFullGenerationPrompt(
  productName: string,
  tags: PromptTags,
  inspirationAnalysis?: string
): string {
  const tagsPrompt = buildPromptFromTags(tags);

  const prompt = [
    `CRITICAL PRODUCT CONSISTENCY REQUIREMENTS:`,
    `- Copy the product from the reference image EXACTLY as shown`,
    `- Maintain identical product design, dimensions, materials, colors, and proportions`,
    `- Preserve all product details, features, and textures precisely`,
    `- DO NOT modify, redesign, or change any aspect of the product itself`,
    ``,
    `WHAT CAN BE CHANGED:`,
    `- Only the environment, background, setting, and props around the product`,
    `- Lighting and composition of the scene`,
    `- Depth of field and atmospheric effects`,
    ``,
    `Product: ${productName}`,
    ``,
    `Scene requirements: ${tagsPrompt}`,
    ``,
    inspirationAnalysis ? `Style reference: ${inspirationAnalysis}` : '',
    ``,
    `Output: Ultra high resolution, photorealistic, cinematic quality, sharp focus on product, realistic reflections and shadows.`,
  ]
    .filter(Boolean)
    .join('\n');

  return prompt;
}

/**
 * Analyze prompt tags to estimate generation complexity
 */
export function estimateGenerationComplexity(tags: PromptTags): 'simple' | 'moderate' | 'complex' {
  const totalTags = Object.values(tags).flat().length;

  if (totalTags <= 3) return 'simple';
  if (totalTags <= 7) return 'moderate';
  return 'complex';
}

/**
 * Get AI-suggested tags based on product analysis
 */
export function getAISuggestedTags(productAnalysis: {
  productType?: string;
  materials?: string[];
  colors?: string[];
  style?: string;
  sceneTypes?: string[];
}): Partial<PromptTags> {
  const suggestions: Partial<PromptTags> = {};

  // Room types from analysis
  if (productAnalysis.sceneTypes && productAnalysis.sceneTypes.length > 0) {
    suggestions.sceneType = productAnalysis.sceneTypes.slice(0, 2);
  }

  // Style from analysis
  if (productAnalysis.style) {
    suggestions.style = [productAnalysis.style];
  }

  // Default mood and lighting based on style
  const styleToMood: Record<string, string> = {
    Modern: 'Elegant',
    Contemporary: 'Elegant',
    Minimalist: 'Serene',
    Scandinavian: 'Cozy',
    Industrial: 'Professional',
    Bohemian: 'Relaxed',
    Rustic: 'Cozy',
    Traditional: 'Luxurious',
  };

  if (productAnalysis.style && styleToMood[productAnalysis.style]) {
    suggestions.mood = [styleToMood[productAnalysis.style]];
  }

  // Default lighting
  suggestions.lighting = ['Natural'];

  return suggestions;
}

/**
 * Merge AI suggestions with user selections
 */
export function mergeTagSuggestions(
  aiSuggestions: Partial<PromptTags>,
  userSelections: PromptTags
): PromptTags {
  return {
    sceneType:
      userSelections.sceneType.length > 0
        ? userSelections.sceneType
        : aiSuggestions.sceneType || [],
    style: userSelections.style.length > 0 ? userSelections.style : aiSuggestions.style || [],
    mood: userSelections.mood.length > 0 ? userSelections.mood : aiSuggestions.mood || [],
    lighting:
      userSelections.lighting.length > 0 ? userSelections.lighting : aiSuggestions.lighting || [],
    custom: userSelections.custom,
  };
}
