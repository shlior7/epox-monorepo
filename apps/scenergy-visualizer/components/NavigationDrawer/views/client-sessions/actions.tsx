import { Sparkles, Trash2 } from 'lucide-react';
import type { ActionDef } from '../../core/types';
import { CLIENT_SESSIONS_EVENTS } from './constants';

export const clientSessionsToolbarActions: ActionDef[] = [
  {
    id: 'clientSessions.create',
    label: 'Create Studio Session',
    icon: <Sparkles size={16} />,
    placement: ['toolbar'],
    visible: (ctx) => Boolean(ctx.selection.clientId),
    run: (ctx) => {
      if (!ctx.selection.clientId) {
        ctx.services.toast.warning('Select a client first.');
        return;
      }
      ctx.shell.events.emit(CLIENT_SESSIONS_EVENTS.TOGGLE_PRODUCT_SELECTION);
    },
  },
  {
    id: 'clientSessions.delete',
    label: 'Delete Studio Sessions',
    icon: <Trash2 size={16} />,
    variant: 'danger',
    placement: ['toolbar'],
    visible: (ctx) => {
      const client = ctx.services.data.clients.find((c) => c.id === ctx.selection.clientId);
      return Boolean(client?.clientSessions?.length);
    },
    run: (ctx) => {
      ctx.shell.events.emit(CLIENT_SESSIONS_EVENTS.TOGGLE_BULK_DELETE);
    },
  },
];
