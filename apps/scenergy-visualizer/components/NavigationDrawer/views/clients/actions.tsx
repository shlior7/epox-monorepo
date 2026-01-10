import { Plus, Trash2 } from 'lucide-react';
import type { ActionDef, NavContext } from '../../core/types';
import { CLIENTS_EVENTS } from './constants';

const canManageClients = (ctx: NavContext) => ctx.auth.role === 'admin';

export const clientsToolbarActions: ActionDef[] = [
  {
    id: 'clients.add',
    label: 'Add Client',
    icon: <Plus size={16} />,
    placement: ['toolbar'],
    visible: canManageClients,
    run: (ctx) => {
      ctx.callbacks.onAddClient();
      ctx.shell.events.emit(CLIENTS_EVENTS.CANCEL_BULK_DELETE);
    },
  },
  {
    id: 'clients.bulkDelete',
    label: 'Delete Clients',
    icon: <Trash2 size={16} />,
    variant: 'danger',
    placement: ['toolbar'],
    visible: (ctx) => canManageClients(ctx) && ctx.counts.items > 0,
    run: (ctx) => {
      ctx.shell.events.emit(CLIENTS_EVENTS.TOGGLE_BULK_DELETE);
    },
  },
];
