import type { NavViewId } from '../../core/types';

export const CLIENTS_VIEW_ID: NavViewId = 'clients';
export const CLIENTS_LABEL = 'Clients';

export const CLIENTS_EVENTS = {
  TOGGLE_BULK_DELETE: 'clients/toggle-bulk-delete',
  CANCEL_BULK_DELETE: 'clients/cancel-bulk-delete',
} as const;
