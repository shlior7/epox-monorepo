import type { NavViewId } from '../../core/types';

export const PRODUCTS_VIEW_ID: NavViewId = 'products';
export const PRODUCTS_LABEL = 'Products';

export const PRODUCTS_EVENTS = {
  TOGGLE_SELECT: 'products/toggle-select',
  TOGGLE_BULK_DELETE: 'products/toggle-bulk-delete',
  CANCEL_MODES: 'products/cancel-modes',
} as const;
