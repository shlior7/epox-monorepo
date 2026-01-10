import type { ViewPlugin } from '../../core/types';
import { ProductsView } from './index';
import { PRODUCTS_LABEL, PRODUCTS_VIEW_ID } from './constants';
import { productsToolbarActions } from './actions';

export const ProductsViewPlugin: ViewPlugin = {
  id: PRODUCTS_VIEW_ID,
  title: (ctx) => {
    const client = ctx.services.data.clients.find((item) => item.id === ctx.selection.clientId);
    return client?.name ?? PRODUCTS_LABEL;
  },
  Component: ProductsView,
  toolbarActions: productsToolbarActions,
};
