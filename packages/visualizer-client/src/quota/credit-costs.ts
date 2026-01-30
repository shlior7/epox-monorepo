/**
 * Credit Cost Configuration
 * Defines credit exchange rates for each generation operation type
 */

export const CREDIT_COSTS = {
  // Image generation
  'nano-banana': {
    credits: 10,
    label: 'Fast Draft (1K)',
  },
  'nano-banana-pro-std': {
    credits: 12,
    label: 'Pro Scene (2K)',
  },
  'nano-banana-pro-ultra': {
    credits: 8,
    label: 'Pro Scene Ultra (4K)',
  },
  'imagen-product': {
    credits: 30,
    label: 'Product Background (1K)',
  },
  'imagen-upscale': {
    credits: 55,
    label: 'Image Upscale (2K/4K)',
  },
  // Video generation
  'veo-fast-4s': {
    credits: 110,
    label: 'Video Lite (720p 4s)',
  },
  'veo-fast-8s': {
    credits: 220,
    label: 'Video Lite (720p 8s)',
  },
  'veo-standard-4s': {
    credits: 240,
    label: 'Video HD (1080p 4s)',
  },
  'veo-standard-8s': {
    credits: 470,
    label: 'Video HD (1080p 8s)',
  },
  'veo-cinema-4s': {
    credits: 380,
    label: 'Video 4K (4s)',
  },
  'veo-cinema-8s': {
    credits: 760,
    label: 'Video 4K (8s)',
  },
} as const;

export type CreditOperationType = keyof typeof CREDIT_COSTS;

export function getCreditCost(operation: CreditOperationType): number {
  return CREDIT_COSTS[operation].credits;
}
