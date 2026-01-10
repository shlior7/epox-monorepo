import type { NavViewId } from '../../core/types';

export const STUDIO_PRODUCTS_VIEW_ID: NavViewId = 'studioProducts';
export const STUDIO_PRODUCTS_LABEL = 'Products';

export const STUDIO_PRODUCTS_EVENTS = {
  TOGGLE_MULTI_SELECT: 'studio-products/toggle-multi-select',
  CANCEL_MODES: 'studio-products/cancel-modes',
} as const;

export type SortOption = 'name-asc' | 'name-desc' | 'recent' | 'category';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'category', label: 'By Category' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'recent', label: 'Recently Added' },
];
