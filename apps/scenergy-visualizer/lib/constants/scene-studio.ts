/**
 * Scene Studio Constants
 * Based on SceneGen Studio specification
 */

import { Scene, SceneGenerationSettings, SlotStatus } from '../types/app-types';

// Room Types
export const ROOM_TYPES = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Dining Room',
  'Office',
  'Bathroom',
  'Outdoor',
  'Studio Set',
  'Patio',
  'Entryway',
  'Home Gym',
  'Kids Room',
];

// Style Options
export const STYLE_OPTIONS = [
  'Modern',
  'Minimalist',
  'Industrial',
  'Scandinavian',
  'Bohemian',
  'Mid-Century',
  'Traditional',
  'Contemporary',
  'Rustic',
  'Coastal',
  'Art Deco',
  'Farmhouse',
];

// Lighting Options
export const LIGHTING_OPTIONS = [
  'Natural Light',
  'Warm Ambient',
  'Cool Daylight',
  'Dramatic',
  'Soft Diffused',
  'Golden Hour',
  'Studio Light',
  'Moody',
  'Bright & Airy',
  'Sunset',
  'Blue Hour',
];

// Camera Angles
export const CAMERA_ANGLES = [
  'Eye Level',
  'Low Angle',
  'High Angle',
  '45° Angle',
  'Overhead',
  'Close-up',
  'Wide Shot',
  'Three-Quarter View',
];

// Props/Staging Elements
export const PROP_TAGS = [
  'Plants',
  'Books',
  'Vases',
  'Cushions',
  'Throw Blankets',
  'Candles',
  'Artwork',
  'Lamps',
  'Rugs',
  'Mirrors',
  'Decorative Bowls',
  'Picture Frames',
  'Sculptures',
  'Coffee Table Books',
  'Pottery',
];

// Aspect Ratios
export const ASPECT_RATIOS = ['1:1', '4:3', '16:9', '3:4', '9:16'];

// Surrounding Options
export const SURROUNDING_OPTIONS = ['Minimal', 'Moderate', 'Full Scene'];

// Color Schemes
export const COLOR_SCHEMES = [
  'Neutral Tones',
  'Warm Palette',
  'Cool Palette',
  'Vibrant',
  'Monochrome',
  'Pastel',
  'Earth Tones',
  'Bold Contrast',
];

// Stock Scenes (placeholder - you can add actual image URLs)
export const STOCK_SCENES: Scene[] = [
  {
    id: 'stock-living-room-1',
    name: 'Modern Living Room',
    imageUrl: '/scenes/living-room-modern.jpg',
    category: 'Living Room',
    isStock: true,
  },
  {
    id: 'stock-bedroom-1',
    name: 'Minimalist Bedroom',
    imageUrl: '/scenes/bedroom-minimalist.jpg',
    category: 'Bedroom',
    isStock: true,
  },
  {
    id: 'stock-kitchen-1',
    name: 'Contemporary Kitchen',
    imageUrl: '/scenes/kitchen-contemporary.jpg',
    category: 'Kitchen',
    isStock: true,
  },
  {
    id: 'stock-studio-1',
    name: 'Clean Studio Set',
    imageUrl: '/scenes/studio-clean.jpg',
    category: 'Studio Set',
    isStock: true,
  },
  {
    id: 'stock-outdoor-1',
    name: 'Garden Patio',
    imageUrl: '/scenes/outdoor-patio.jpg',
    category: 'Outdoor',
    isStock: true,
  },
];

// Default Scene
export const DEFAULT_SCENE: Scene = STOCK_SCENES[0];

// Default Generation Settings
export const DEFAULT_SCENE_SETTINGS: SceneGenerationSettings = {
  scene: DEFAULT_SCENE,
  roomType: 'Living Room',
  style: 'Modern',
  lighting: 'Natural Light',
  cameraAngle: 'Eye Level',
  aspectRatio: '1:1',
  varietyLevel: 5,
  surroundings: 'Moderate',
  colorScheme: 'Neutral Tones',
  props: [],
  colorTheme: false,
  accessories: false,
  promptText: '',
};

/**
 * Create a deep clone of default settings
 */
export function cloneDefaultSceneSettings(): SceneGenerationSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SCENE_SETTINGS)) as SceneGenerationSettings;
}
