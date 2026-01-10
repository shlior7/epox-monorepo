// ===== AI MODEL CONSTANTS =====
export const AI_MODELS = {
  IMAGE: 'gemini-2.5-flash-image',
  TEXT: 'gemini-2.5-flash-lite',
  FALLBACK_TEXT: 'gemini-2.0-flash-lite',
} as const;

export const OPTIMIZATION_DEFAULTS = {
  MAX_PROMPT_TOKENS: 400,
  DEFAULT_IMAGE_COUNT: 1,
  DEFAULT_IMAGE_SIZE: '1K',
  DEFAULT_ASPECT_RATIO: '1:1',
  MAX_RETRIES: 2,
} as const;

export const COST_ESTIMATES = {
  IMAGE_GENERATION: 0.001, // Very low cost for built-in Gemini image generation
  TEXT_ANALYSIS: 0.0001, // Per request estimation
} as const;

export const ERROR_MESSAGES = {
  MISSING_API_KEY: 'Gemini API key is required. Please set GOOGLE_AI_STUDIO_API_KEY in your environment.',
  NO_IMAGE_DATA: 'No image data found in the Gemini response.',
  QUOTA_EXCEEDED: 'Quota/billing issue, using mock response to avoid charges',
} as const;

// ===== ANALYSIS KEYWORDS =====
export const MATERIAL_KEYWORDS = [
  'wood',
  'metal',
  'plastic',
  'glass',
  'fabric',
  'leather',
  'stone',
  'ceramic',
  'steel',
  'aluminum',
] as const;

export const COLOR_KEYWORDS = [
  'white',
  'black',
  'gray',
  'brown',
  'blue',
  'red',
  'green',
  'yellow',
  'orange',
  'purple',
  'pink',
  'beige',
  'silver',
  'gold',
] as const;

export const STYLE_MAP = {
  modern: 'modern',
  contemporary: 'contemporary',
  vintage: 'vintage',
  industrial: 'industrial',
  minimalist: 'minimalist',
  classic: 'classic',
  rustic: 'rustic',
  scandinavian: 'scandinavian',
} as const;

// ===== UI PRESETS =====
export const locationGroups: Record<string, string[]> = {
  'Indoor Spaces': ['Office', 'Living Room', 'Bedroom', 'Studio Set', 'Kitchen', 'Retail Store', 'Café'],
  'Outdoor Spaces': ['Beachfront Patio', 'Rooftop Terrace', 'Garden', 'Poolside Deck', 'Mountain Cabin', 'Urban Balcony'],
  'Professional Environments': ['Corporate Office', 'Photography Studio', 'Showroom', 'Hotel Suite', 'Restaurant Lounge'],
};

export const stylePresets = [
  'Modern Minimalist',
  'Luxury / Premium',
  'Rustic / Natural',
  'Scandinavian',
  'Industrial Loft',
  'Futuristic / Tech',
  'Bohemian Chic',
  'Coastal / Mediterranean',
  'Vintage / Retro',
  'Artistic Conceptual',
];

export const styleTagsByPreset: Record<string, string[]> = {
  'Modern Minimalist': ['clean lines', 'neutral palette', 'soft shadows'],
  'Luxury / Premium': ['opulent', 'high-contrast lighting', 'polished metals'],
  'Rustic / Natural': ['organic textures', 'earthy hues', 'sun-dappled'],
  Scandinavian: ['light woods', 'airy', 'muted tones'],
  'Industrial Loft': ['exposed materials', 'moody contrast', 'metal accents'],
  'Futuristic / Tech': ['neon accents', 'sleek surfaces', 'volumetric light'],
  'Bohemian Chic': ['layered textiles', 'vibrant colors', 'eclectic props'],
  'Coastal / Mediterranean': ['breezy', 'sun-washed', 'sea-glass palette'],
  'Vintage / Retro': ['film grain', 'warm tint', 'nostalgic details'],
  'Artistic Conceptual': ['bold shapes', 'surreal lighting', 'experimental framing'],
};

export const lightingPresets = [
  'Natural Daylight',
  'Golden Hour / Sunset Glow',
  'Studio Soft Light',
  'Bright Noon Sunlight',
  'Overcast Ambient',
  'Neon / LED Accent',
  'Candlelight / Warm Interior',
  'HDRI Environmental Light',
];

export const cameraPresets = [
  'Eye-Level Product Shot',
  'Low Angle (Hero Perspective)',
  'Top-Down (Flat Lay)',
  '¾ Perspective',
  'Close-Up / Macro Focus',
  'Wide Room View',
];

export const propPresets = [
  'Office Decor: laptop, desk lamp, notebooks',
  'Outdoor Patio: plants, cushions, coffee table',
  'Bedroom: rug, nightstand, art on wall',
  'Poolside: towel, umbrella, drink tray',
  'Café: coffee cup, books, pastries',
  'Minimal Scene: no props, focus on product',
];

export const aspectRatios = ['1:1', '3:2', '16:9', 'Portrait', 'Custom'];
export const resolutions = ['Standard', '2K', '4K', '8K'];
