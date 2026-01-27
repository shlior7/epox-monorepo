import type { ViewPlugin } from '../../core/types';
import { ClientSessionsView } from './index';
import { CLIENT_SESSIONS_LABEL, CLIENT_SESSIONS_VIEW_ID } from './constants';
import { clientSessionsToolbarActions } from './actions';

export const ClientSessionsViewPlugin: ViewPlugin = {
  id: CLIENT_SESSIONS_VIEW_ID,
  title: (ctx) => {
    const client = ctx.services.data.clients.find((item) => item.id === ctx.selection.clientId);
    return client?.name ?? CLIENT_SESSIONS_LABEL;
  },
  Component: ClientSessionsView,
  toolbarActions: clientSessionsToolbarActions,
};
