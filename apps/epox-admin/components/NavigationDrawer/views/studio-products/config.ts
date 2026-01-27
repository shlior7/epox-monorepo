import type { ViewPlugin } from '../../core/types';
import { StudioProductsView } from './index';
import { STUDIO_PRODUCTS_LABEL, STUDIO_PRODUCTS_VIEW_ID } from './constants';
import { studioProductsToolbarActions } from './actions';

export const StudioProductsViewPlugin: ViewPlugin = {
  id: STUDIO_PRODUCTS_VIEW_ID,
  title: (ctx) => {
    const client = ctx.services.data.clients.find((item) => item.id === ctx.selection.clientId);
    return client?.name ? `${client.name} - Products` : STUDIO_PRODUCTS_LABEL;
  },
  Component: StudioProductsView,
  toolbarActions: studioProductsToolbarActions,
};
