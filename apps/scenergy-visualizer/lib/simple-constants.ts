import { Option } from '../components/DropdownSelector';

export const SCENE_OPTIONS: Option[] = [
  { value: 'Office', label: 'Office' },
  { value: 'Living Room', label: 'Living Room' },
  { value: 'Studio Set', label: 'Studio Set' },
  { value: 'Kitchen', label: 'Kitchen' },
  { value: 'Beachfront Patio', label: 'Beachfront Patio' },
  { value: 'Rooftop Terrace', label: 'Rooftop Terrace' },
  { value: 'Mountain Cabin', label: 'Mountain Cabin' },
  { value: 'Custom', label: 'Custom...' },
];

export const STYLE_OPTIONS: Option[] = [
  { value: 'Modern Minimalist', label: 'Modern Minimalist' },
  { value: 'Luxury / Premium', label: 'Luxury / Premium' },
  { value: 'Rustic / Natural', label: 'Rustic / Natural' },
  { value: 'Scandinavian', label: 'Scandinavian' },
  { value: 'Industrial Loft', label: 'Industrial Loft' },
  { value: 'Futuristic / Tech', label: 'Futuristic / Tech' },
  { value: 'Vintage / Retro', label: 'Vintage / Retro' },
  { value: 'Custom', label: 'Custom...' },
];

export const LIGHTING_OPTIONS: Option[] = [
  { value: 'Natural Daylight', label: 'Natural Daylight' },
  { value: 'Golden Hour / Sunset Glow', label: 'Golden Hour' },
  { value: 'Studio Soft Light', label: 'Studio Soft Light' },
  { value: 'Bright Noon Sunlight', label: 'Bright Noon Sunlight' },
  { value: 'Neon / LED Accent', label: 'Neon / LED Accent' },
  { value: 'Candlelight / Warm Interior', label: 'Warm Interior' },
  { value: 'Custom', label: 'Custom...' },
];

export const CAMERA_ANGLE_OPTIONS: Option[] = [
  { value: 'Eye-Level Product Shot', label: 'Eye-Level' },
  { value: 'Low Angle (Hero Perspective)', label: 'Low Angle (Hero)' },
  { value: 'Top-Down (Flat Lay)', label: 'Top-Down (Flat Lay)' },
  { value: '¾ Perspective', label: '¾ Perspective' },
  { value: 'Close-Up / Macro Focus', label: 'Close-Up / Macro' },
  { value: 'Custom', label: 'Custom...' },
];

export const SURROUNDINGS_OPTIONS: Option[] = [
  { value: 'Office Decor: laptop, desk lamp, notebooks', label: 'Office Decor' },
  { value: 'Outdoor Patio: plants, cushions, coffee table', label: 'Patio Decor' },
  { value: 'Poolside: towel, umbrella, drink tray', label: 'Poolside Props' },
  { value: 'Minimal Scene: no props, focus on product', label: 'Minimal (No Props)' },
  { value: 'Custom', label: 'Custom...' },
];

export const ASPECT_RATIO_OPTIONS: Option[] = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '4:3', label: 'Standard (4:3)' },
  { value: '3:2', label: 'Classic (3:2)' },
];
