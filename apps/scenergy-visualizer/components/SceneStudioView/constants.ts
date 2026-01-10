/**
 * Scene Studio Constants
 * Options for flow generation settings
 */

export const STYLE_OPTIONS = [
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
  'Custom',
];

export const ROOM_TYPES = [
  'Studio Set',
  'Office',
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Outdoor Patio',
  'Rooftop Terrace',
  'Garden',
  'Poolside Deck',
  'Beach',
  'Custom',
];

export const LIGHTING_OPTIONS = [
  'Natural Daylight',
  'Golden Hour / Sunset Glow',
  'Studio Soft Light',
  'Bright Noon Sunlight',
  'Overcast Ambient',
  'Neon / LED Accent',
  'Candlelight / Warm Interior',
  'HDRI Environmental Light',
  'Custom',
];

export const SURROUNDING_OPTIONS = [
  'Minimal (No Props)',
  'Office Decor',
  'Outdoor Patio Props',
  'Bedroom Setup',
  'Poolside Accessories',
  'Cafe Ambiance',
  'With Many Props',
  'Custom',
];

export const COLOR_SCHEMES = [
  'Neutral',
  'Monochromatic Neutral',
  'Warm Earth Tones',
  'Cool Slate & Blues',
  'Vibrant Pop Colors',
  'Deep Emerald & Gold',
  'Soft Pastel Mix',
  'High Contrast B&W',
  'Scandinavian Whites',
  'Industrial Grays',
  'Custom',
];

export const PROP_TAGS = [
  'Lush Greenery',
  'Minimalist Plants',
  'Modern Wall Art',
  'Abstract Decor',
  'Designer Rugs',
  'Coffee Table Books',
  'Ceramic Vases',
  'Ambient Lamps',
  'Textured Cushions',
  'Tech Gadgets',
  'Mirrors',
  'Sculptures',
];

export const CAMERA_ANGLES = ['Front', '3/4 View', 'Side', 'Top-Down', 'Eye-Level'];

export const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];

export const IMAGE_QUALITY_OPTIONS = [
  { id: '1k', label: '1K', resolution: '1024x1024', description: 'Fast, lower quality' },
  { id: '2k', label: '2K', resolution: '2048x2048', description: 'Balanced quality' },
  { id: '4k', label: '4K', resolution: '4096x4096', description: 'Highest quality' },
];

export interface StockScene {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  roomType: string;
}

export const STOCK_SCENES: StockScene[] = [
  {
    id: 's1',
    name: 'Modern Loft',
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    category: 'Interior',
    roomType: 'Living Room',
  },
  {
    id: 's2',
    name: 'Scandi Office',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
    category: 'Interior',
    roomType: 'Office',
  },
  {
    id: 's3',
    name: 'Cozy Bedroom',
    imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800',
    category: 'Interior',
    roomType: 'Bedroom',
  },
  {
    id: 's4',
    name: 'Minimalist Kitchen',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800',
    category: 'Interior',
    roomType: 'Kitchen',
  },
  {
    id: 's5',
    name: 'Outdoor Terrace',
    imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    category: 'Outdoor',
    roomType: 'Outdoor Patio',
  },
  {
    id: 's6',
    name: 'Beach View',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    category: 'Outdoor',
    roomType: 'Beach',
  },
  {
    id: 's7',
    name: 'Garden Setting',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    category: 'Outdoor',
    roomType: 'Garden',
  },
  {
    id: 's8',
    name: 'Studio White',
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800',
    category: 'Studio',
    roomType: 'Studio Set',
  },
];
