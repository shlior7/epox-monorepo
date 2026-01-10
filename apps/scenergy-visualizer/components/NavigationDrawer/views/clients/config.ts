import type { ViewPlugin } from '../../core/types';
import { ClientsView } from './index';
import { CLIENTS_LABEL, CLIENTS_VIEW_ID } from './constants';
import { clientsToolbarActions } from './actions';

export const ClientsViewPlugin: ViewPlugin = {
  id: CLIENTS_VIEW_ID,
  title: () => CLIENTS_LABEL,
  Component: ClientsView,
  toolbarActions: clientsToolbarActions,
};
