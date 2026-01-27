import type { NavViewId } from '../../core/types';

export const CLIENT_SESSIONS_VIEW_ID: NavViewId = 'clientSessions';
export const CLIENT_SESSIONS_LABEL = 'Studio Sessions';

export const CLIENT_SESSIONS_EVENTS = {
  TOGGLE_PRODUCT_SELECTION: 'client-sessions/toggle-product-selection',
  TOGGLE_BULK_DELETE: 'client-sessions/toggle-bulk-delete',
  CANCEL_MODES: 'client-sessions/cancel-modes',
} as const;

export const CLIENT_SESSIONS_TEST_IDS = {
  CREATE: 'clientSessions:create',
  DELETE: 'clientSessions:delete',
};
