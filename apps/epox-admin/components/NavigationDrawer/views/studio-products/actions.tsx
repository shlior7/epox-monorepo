import { MousePointerClick } from 'lucide-react';
import type { ActionDef } from '../../core/types';
import { STUDIO_PRODUCTS_EVENTS } from './constants';

export const studioProductsToolbarActions: ActionDef[] = [
  {
    id: 'studioProducts.multiSelect',
    label: 'Multi-Select',
    icon: <MousePointerClick size={16} />,
    placement: ['toolbar'],
    visible: (ctx) => {
      const client = ctx.services.data.clients.find((c) => c.id === ctx.selection.clientId);
      return Boolean(client?.products?.length);
    },
    run: (ctx) => {
      ctx.shell.events.emit(STUDIO_PRODUCTS_EVENTS.TOGGLE_MULTI_SELECT);
    },
  },
];
