// ===== VISUALIZATION SERVICE UTILITIES =====

import type { VisualizationRequest, ProductAnalysis } from '../types';

/**
 * Build cost-optimized prompt (replaces buildPrompt with token efficiency)
 */
export function buildCostOptimizedPrompt(request: VisualizationRequest, productAnalysis?: ProductAnalysis): string {
  // If custom prompt is provided, use it directly
  if (request.customPrompt) {
    return request.customPrompt;
  }

  const productDescriptor = request.productName || 'hero product';
  const locationDescriptor = request.location || 'refined studio environment';
  const styleDescriptor = request.style || 'premium minimalist aesthetic';
  const lightingDescriptor = request.lighting || 'soft studio lighting';
  const cameraDescriptor = request.camera || 'eye-level composition';
  const propsDescriptor = request.props || 'tasteful supporting props';
  const moodDescriptor = request.moodNotes || 'inviting and aspirational atmosphere';

  const materialDescriptor = productAnalysis?.materials?.length
    ? `Highlight ${productAnalysis.materials.slice(0, 2).join(' and ')} textures.`
    : '';

  // Enhanced prompt with stronger product consistency instructions
  const prompt = [
    `IMPORTANT: Generate a photorealistic scene using the reference product image.`,
    ``,
    `CRITICAL PRODUCT CONSISTENCY REQUIREMENTS:`,
    `- Copy the product from the reference image EXACTLY as shown`,
    `- Maintain identical product design, dimensions, materials, colors, and proportions`,
    `- Preserve all product details, features, and textures precisely`,
    `- DO NOT modify, redesign, or change any aspect of the product itself`,
    ``,
    `WHAT CAN BE CHANGED:`,
    `- Only the environment, background, setting, and props around the product`,
    `- Lighting, and composition of the scene`,
    `- Depth of field and atmospheric effects`,
    ``,
    `Scene requirements:`,
    `- Location: ${locationDescriptor}`,
    `- Style: ${styleDescriptor.toLowerCase()}`,
    `- Lighting: ${lightingDescriptor}`,
    `- Camera: ${cameraDescriptor.toLowerCase()}`,
    `- Props: ${propsDescriptor.toLowerCase()}`,
    ``,
    materialDescriptor,
    ``,
    `Mood: ${moodDescriptor.toLowerCase()}`,
    ``,
    `Output: Ultra high resolution, cinematic quality, sharp focus, natural materials, realistic reflections.`,
  ]
    .filter(Boolean)
    .join('\n');

  return prompt;
}

/**
 * Generate cost-optimized variants with minimal token differences
 * Each variant ONLY changes the environment/camera, NEVER the product itself
 */
export function generateCostOptimizedVariants(basePrompt: string, variantCount: number): string[] {
  // Each variant focuses on different environmental aspects while keeping product identical
  const variationDescriptors = [
    '\n\nVARIANT 1 - Soft natural lighting:\nEnvironment adjustment: Soft window light with gentle shadow falloff. Product remains unchanged.',
    '\n\nVARIANT 2 - Dramatic wide angle:\nEnvironment adjustment: Wide-angle perspective with enhanced depth-of-field. Product identical to reference.',
    '\n\nVARIANT 3 - Cinematic lighting:\nEnvironment adjustment: Moody cinematic lighting with controlled ambient glow. Product unchanged.',
    '\n\nVARIANT 4 - Macro focus:\nEnvironment adjustment: Close-up material detail emphasis with reflective highlights. Product consistent with reference.',
    '\n\nVARIANT 5 - Lifestyle setting:\nEnvironment adjustment: Subtle motion blur and warm atmosphere. Product stays exactly as shown in reference image.',
  ];

  const variants = [basePrompt];

  for (let i = 1; i < variantCount; i++) {
    const descriptor = variationDescriptors[(i - 1) % variationDescriptors.length];
    // Append to the base prompt without repeating product consistency instructions
    variants.push(`${basePrompt}${descriptor}`);
  }

  return variants;
}
