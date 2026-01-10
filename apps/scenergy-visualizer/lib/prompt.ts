export interface VisualizerState {
  productName: string;
  location: string;
  style: string;
  lighting: string;
  camera: string;
  cameraNotes: string;
  props: string;
  moodNotes: string;
  aspectRatio: string;
  resolution: string;
  variants: number;
  magnify: boolean;
}

export function buildPrompt(state: VisualizerState) {
  const { productName, location, style, lighting, camera, cameraNotes, props, moodNotes, aspectRatio, resolution, variants, magnify } =
    state;

  // Enhanced prompt with guidelines to preserve product integrity
  const product = productName || 'the uploaded product';

  const parts = [
    `IMPORTANT: Generate a photorealistic render of the uploaded product image.`,
    ``,
    `CRITICAL PRODUCT CONSISTENCY:`,
    `- Use the product from the reference image EXACTLY as shown`,
    `- Keep product design, dimensions, materials, colors, and proportions identical precisely`,
    `- DO NOT modify or change any aspect of the product itself`,
    ``,
    `WHAT CAN CHANGE:`,
    `- Only environment, background, props, and scene composition`,
    `- Lighting setup, and depth of field`,
    ``,
    ...(location ? [`Location: ${prefixed(location)}`] : []),
    ...(style ? [`Style: ${style.toLowerCase()} aesthetic`] : []),
    ...(lighting ? [`Lighting: ${lighting.toLowerCase()}`] : []),
    ...(camera ? [`Camera: ${camera.toLowerCase()}${cameraNotes ? ` (${cameraNotes})` : ''}`] : []),
    ...(props ? [`Props: ${props.toLowerCase()}`] : []),
    ...(moodNotes ? [`Mood: ${moodNotes}`] : []),
    ``,
    `Rendering: ${aspectRatio || 'default'} aspect ratio at ${resolution || 'standard'} resolution`,
    `Variants: ${variants || 1} ${variants === 1 ? 'variant' : 'variants'} with environmental changes only`,
  ];

  return parts.filter(Boolean).join('\n');
}

function prefixed(value: string) {
  if (!value.trim()) {
    return value;
  }

  const lower = value.toLowerCase();
  if (lower.startsWith('a ') || lower.startsWith('an ') || lower.startsWith('the ')) {
    return value;
  }

  const vowel = ['a', 'e', 'i', 'o', 'u'].includes(lower[0]);
  return `${vowel ? 'an' : 'a'} ${value}`;
}
