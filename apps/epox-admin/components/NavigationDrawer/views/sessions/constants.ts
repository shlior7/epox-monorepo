import type { NavViewId } from '../../core/types';

export const SESSIONS_VIEW_ID: NavViewId = 'sessions';
export const SESSIONS_LABEL = 'Sessions';

export const SESSIONS_EVENTS = {
  TOGGLE_BULK_DELETE: 'sessions/toggle-bulk-delete',
  CANCEL_BULK_DELETE: 'sessions/cancel-bulk-delete',
} as const;

export const SESSIONS_TEST_IDS = {
  NEW: 'sessions:new',
  DELETE: 'sessions:delete',
  EDIT: 'sessions:edit',
};
