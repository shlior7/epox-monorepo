import { Plus, Sparkles, Trash2 } from 'lucide-react';
import type { ActionDef } from '../../core/types';
import { PRODUCTS_EVENTS } from './constants';

const ensureClientSelected = (ctx: Parameters<ActionDef['run']>[0]) => {
  if (!ctx.selection.clientId) {
    ctx.services.toast.warning('Select a client first.');
    return false;
  }
  return true;
};

export const productsToolbarActions: ActionDef[] = [
  {
    id: 'products.add',
    label: 'Add Product',
    icon: <Plus size={16} />,
    placement: ['toolbar'],
    enabled: (ctx) => Boolean(ctx.selection.clientId),
    run: (ctx) => {
      if (!ensureClientSelected(ctx)) return;
      ctx.callbacks.onAddProduct(ctx.selection.clientId!);
    },
  },
  {
    id: 'products.add-multiple',
    label: 'Add Multiple Products',
    icon: <Plus size={16} />,
    placement: ['toolbar'],
    enabled: (ctx) => Boolean(ctx.selection.clientId),
    run: (ctx) => {
      if (!ensureClientSelected(ctx)) return;
      ctx.callbacks.onAddProducts(ctx.selection.clientId!);
    },
  },
  {
    id: 'products.create-session',
    label: 'Create Studio Session',
    icon: <Sparkles size={16} />,
    placement: ['toolbar'],
    visible: (ctx) => {
      const client = ctx.services.data.clients.find((c) => c.id === ctx.selection.clientId);
      return Boolean(client && client.products.length > 0);
    },
    run: (ctx) => {
      if (!ensureClientSelected(ctx)) return;
      ctx.shell.events.emit(PRODUCTS_EVENTS.TOGGLE_SELECT);
    },
  },
  {
    id: 'products.bulk-delete',
    label: 'Delete Products',
    icon: <Trash2 size={16} />,
    variant: 'danger',
    placement: ['toolbar'],
    visible: (ctx) => {
      const client = ctx.services.data.clients.find((c) => c.id === ctx.selection.clientId);
      return Boolean(client && client.products.length > 0);
    },
    run: (ctx) => {
      if (!ensureClientSelected(ctx)) return;
      ctx.shell.events.emit(PRODUCTS_EVENTS.TOGGLE_BULK_DELETE);
    },
  },
];
