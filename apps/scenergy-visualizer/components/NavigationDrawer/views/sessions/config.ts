import type { Session } from '@/lib/types/app-types';
import type { ViewPlugin } from '../../core/types';
import { SessionsView } from './index';
import { SESSIONS_LABEL, SESSIONS_VIEW_ID } from './constants';
import { sessionsToolbarActions, createSessionRowActions } from './actions';

export const SessionsViewPlugin: ViewPlugin = {
  id: SESSIONS_VIEW_ID,
  title: (ctx) => {
    const client = ctx.services.data.clients.find((c) => c.id === ctx.selection.clientId);
    const product = client?.products.find((p) => p.id === ctx.selection.productId);
    return product?.name ?? SESSIONS_LABEL;
  },
  Component: SessionsView,
  toolbarActions: sessionsToolbarActions,
  rowActions: (session) => createSessionRowActions(session as Session),
};
