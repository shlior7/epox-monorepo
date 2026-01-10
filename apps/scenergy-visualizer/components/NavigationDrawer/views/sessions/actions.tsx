import { Plus, Settings, Trash2 } from 'lucide-react';
import type { Session } from '@/lib/types/app-types';
import type { ActionDef } from '../../core/types';
import { SESSIONS_EVENTS } from './constants';

export const sessionsToolbarActions: ActionDef[] = [
  {
    id: 'sessions.new',
    label: 'New Session',
    icon: <Plus size={16} />,
    placement: ['toolbar'],
    visible: (ctx) => Boolean(ctx.selection.clientId && ctx.selection.productId),
    run: async (ctx) => {
      const { clientId, productId } = ctx.selection;
      if (!clientId || !productId) {
        ctx.services.toast.warning('Select a client and product first.');
        return;
      }

      try {
        const session = await ctx.services.data.addSession(clientId, productId);
        ctx.callbacks.onSessionSelect(clientId, productId, session.id);
        ctx.services.toast.success('Session created successfully');
        ctx.shell.closeDrawer();
      } catch (error) {
        console.error('Failed to create session', error);
        ctx.services.toast.error('Failed to create session. Please try again.');
      }
    },
  },
  {
    id: 'sessions.bulk-delete',
    label: 'Delete Sessions',
    icon: <Trash2 size={16} />,
    variant: 'danger',
    placement: ['toolbar'],
    visible: (ctx) => {
      const client = ctx.services.data.clients.find((c) => c.id === ctx.selection.clientId);
      const product = client?.products.find((p) => p.id === ctx.selection.productId);
      return Boolean(product && product.sessions.length > 0);
    },
    run: (ctx) => {
      ctx.shell.events.emit(SESSIONS_EVENTS.TOGGLE_BULK_DELETE);
    },
  },
];

export function createSessionRowActions(session: Session): ActionDef[] {
  return [
    {
      id: `sessions.edit.${session.id}`,
      label: 'Edit Session',
      icon: <Settings size={16} />,
      placement: ['row'],
      run: (ctx) => {
        console.log('Edit session action run for session:', session.id);
        const { clientId, productId } = ctx.selection;
        if (!clientId || !productId) {
          ctx.services.toast.warning('Select a client and product first.');
          return;
        }
        ctx.callbacks.onEditSession(clientId, productId, session.id, session.name);
      },
    },
    {
      id: `sessions.delete.${session.id}`,
      label: 'Delete Session',
      icon: <Trash2 size={16} />,
      placement: ['row'],
      variant: 'danger',
      run: async (ctx) => {
        const { clientId, productId } = ctx.selection;
        if (!clientId || !productId) {
          ctx.services.toast.warning('Select a client and product first.');
          return;
        }

        await ctx.services.confirm.confirm({
          title: 'Delete Session?',
          message: 'Are you sure you want to delete this session? This action cannot be undone.',
          confirmLabel: 'Delete',
          cancelLabel: 'Cancel',
          variant: 'danger',
          onConfirm: async () => {
            try {
              if (ctx.selection.sessionId === session.id) {
                ctx.shell.setSelection({ sessionId: null });
                ctx.services.router.toProductSettings(clientId, productId);
              }

              await new Promise((resolve) => setTimeout(resolve, 600));

              await ctx.services.data.deleteSession(clientId, productId, session.id);

              ctx.services.toast.success('Session deleted successfully');
            } catch (error) {
              console.error('Failed to delete session', error);
              ctx.services.toast.error('Failed to delete session. Please try again.');
            }
          },
        });
      },
    },
  ];
}
