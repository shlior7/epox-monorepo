import type { FlowGenerationSettings } from '@/lib/types/app-types';

type PromptSettingsLike = Partial<FlowGenerationSettings> & { customPrompt?: string };

export function buildSystemImageGenerationPrompt(userPrompt: string, settings?: PromptSettingsLike): string {
  const parts = [
    'You are an AI assistant that generates photorealistic product visualizations.',
    'Generate a high-quality, photorealistic image based on the following specifications:',
    '',
  ];

  if (userPrompt && userPrompt.trim()) {
    parts.push(userPrompt.trim());
    parts.push('');
  }

  if (settings) {
    const scene = settings.scene === 'Custom' ? settings.customScene : settings.scene;
    const style = settings.style === 'Custom' ? settings.customStyle : settings.style;
    const lighting = settings.lighting === 'Custom' ? settings.customLighting : settings.lighting;
    const surroundings = settings.surroundings === 'Custom' ? settings.customSurroundings : settings.surroundings;
    const roomType = settings.roomType;
    const cameraAngle = settings.cameraAngle;
    const colorScheme = settings.colorScheme;
    const props = Array.isArray(settings.props) ? settings.props : null;

    if (scene) parts.push(`Scene: ${scene}`);
    if (style) parts.push(`Style: ${style}`);
    if (lighting) parts.push(`Lighting: ${lighting}`);
    if (surroundings) parts.push(`Surroundings: ${surroundings}`);
    if (roomType) parts.push(`Room Type: ${roomType}`);
    if (cameraAngle) parts.push(`Camera Angle: ${cameraAngle}`);
    if (colorScheme) parts.push(`Color Scheme: ${colorScheme}`);
    if (props && props.length > 0) parts.push(`Props: ${props.join(', ')}`);
    if (typeof settings.varietyLevel === 'number') {
      const clamped = Math.min(10, Math.max(1, settings.varietyLevel));
      const interpretation =
        clamped <= 3
          ? 'Follow the backdrop closely with minimal creative deviation.'
          : clamped <= 7
          ? 'Balance fidelity to the backdrop with tasteful creativity.'
          : 'Use the backdrop as loose inspiration with more creative freedom.';
      parts.push(`Interpretation: ${clamped}/10. ${interpretation}`);
    }
    if (settings.matchProductColors) parts.push('Match the color palette to the product colors.');
    if (settings.includeAccessories) parts.push('Include complementary accessories.');
    if (settings.imageQuality) parts.push(`Image Quality: ${settings.imageQuality}`);
    if (settings.promptText) parts.push(`Additional instructions: ${settings.promptText}`);

    if (
      scene ||
      style ||
      lighting ||
      surroundings ||
      roomType ||
      cameraAngle ||
      colorScheme ||
      (props && props.length > 0) ||
      typeof settings.varietyLevel === 'number' ||
      settings.matchProductColors ||
      settings.includeAccessories ||
      settings.imageQuality ||
      settings.promptText
    ) {
      parts.push('');
    }
  }

  parts.push('IMPORTANT GUIDELINES:');
  parts.push('- Maintain the exact product design, dimensions, materials, colors, and proportions from the reference images');
  parts.push('- DO NOT modify or change any aspect of the product itself');
  parts.push('- Only change the environment, background, props, lighting, and scene composition');
  parts.push('- Ensure professional, commercial-grade quality suitable for marketing materials');
  parts.push('- Focus on realistic lighting, shadows, and reflections');
  parts.push('- Create a visually appealing composition that highlights the product');

  return parts.join('\n');
}

export function buildImageGenerationPrompt(userPrompt: string, settings?: PromptSettingsLike): string {
  const customPrompt = settings?.customPrompt?.trim();
  if (customPrompt) {
    return customPrompt;
  }

  return buildSystemImageGenerationPrompt(userPrompt, settings);
}
