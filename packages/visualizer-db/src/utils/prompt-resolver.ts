import type { FlowGenerationSettings } from 'visualizer-types';

export function resolvePrompt(settings: FlowGenerationSettings): string {
  if (settings.useCustomPrompt && settings.customPrompt?.trim()) {
    return settings.customPrompt.trim();
  }

  return buildPromptFromSettings(settings);
}

export function buildPromptFromSettings(settings: FlowGenerationSettings): string {
  const parts: string[] = [];

  if (settings.scene) {
    parts.push(`Scene: ${settings.scene}`);
  }
  if (settings.sceneImageUrl) {
    parts.push(`Scene image: ${settings.sceneImageUrl}`);
  }
  if (settings.customScene) {
    parts.push(settings.customScene);
  }
  if (settings.roomType) {
    parts.push(`Room type: ${settings.roomType}`);
  }
  if (settings.style) {
    parts.push(`Style: ${settings.style}`);
  }
  if (settings.customStyle) {
    parts.push(settings.customStyle);
  }
  if (settings.lighting) {
    parts.push(`Lighting: ${settings.lighting}`);
  }
  if (settings.customLighting) {
    parts.push(settings.customLighting);
  }
  if (settings.cameraAngle) {
    parts.push(`Camera angle: ${settings.cameraAngle}`);
  }
  if (settings.aspectRatio) {
    parts.push(`Aspect ratio: ${settings.aspectRatio}`);
  }
  if (settings.surroundings) {
    parts.push(`Surroundings: ${settings.surroundings}`);
  }
  if (settings.customSurroundings) {
    parts.push(settings.customSurroundings);
  }
  if (settings.colorScheme) {
    parts.push(`Color scheme: ${settings.colorScheme}`);
  }
  if (settings.props?.length) {
    parts.push(`Props: ${settings.props.join(', ')}`);
  }

  return parts.join('. ');
}
