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
  'No props (clean background)',
  'Minimal accents (1-2 items)',
  'Lifestyle accents (books, ceramics)',
  'Greenery (plants + planters)',
  'Textiles (throws, rugs)',
  'Seasonal styling',
  'Studio essentials (backdrops, stands)',
];
