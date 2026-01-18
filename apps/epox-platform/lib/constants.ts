export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  dashboard: '/dashboard',
  collections: {
    list: '/collections',
    new: '/collections/new',
    detail: (id: string) => `/collections/${id}`,
    results: (id: string, flowId: string) => `/collections/${id}/flows/${flowId}/results`,
  },
  wizard: {
    select: (id: string) => `/collections/${id}/wizard/select`,
    analyze: (id: string) => `/collections/${id}/wizard/analyze`,
    inspire: (id: string) => `/collections/${id}/wizard/inspire`,
    generate: (id: string) => `/collections/${id}/wizard/generate`,
  },
  products: {
    list: '/products',
    detail: (id: string) => `/products/${id}`,
  },
  settings: {
    profile: '/settings/profile',
    notifications: '/settings/notifications',
    defaults: '/settings/defaults',
    account: '/settings/account',
  },
} as const;

export const WIZARD_STEPS = [
  { id: 1, label: 'Select', description: 'Choose products & name', path: 'select' },
  { id: 2, label: 'Inspire', description: 'Add inspiration', path: 'inspire' },
  { id: 3, label: 'Analyze', description: 'AI analysis', path: 'analyze' },
] as const;

export const SCENE_TYPES = [
  'Living Room',
  'Bedroom',
  'Office',
  'Dining Room',
  'Kitchen',
  'Bathroom',
  'Outdoor',
  'Entryway',
] as const;

export const STYLE_OPTIONS = [
  'Modern',
  'Contemporary',
  'Minimalist',
  'Scandinavian',
  'Industrial',
  'Bohemian',
  'Mid-Century',
  'Rustic',
  'Traditional',
  'Coastal',
] as const;

export const MOOD_OPTIONS = [
  'Cozy',
  'Elegant',
  'Relaxed',
  'Energetic',
  'Serene',
  'Luxurious',
  'Casual',
  'Professional',
] as const;

export const LIGHTING_OPTIONS = [
  'Natural',
  'Warm',
  'Cool',
  'Dramatic',
  'Soft',
  'Bright',
  'Ambient',
  'Studio',
] as const;

export const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '4:3', label: 'Classic (4:3)' },
] as const;

export const MAX_INSPIRATION_IMAGES = 5;
export const MAX_PRODUCTS_PER_SESSION = 500;
export const POLLING_INTERVAL = 5000; // 5 seconds
