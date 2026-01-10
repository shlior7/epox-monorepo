import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NavContext } from '../../core/types';
import { toggleInSet } from '../../services/selection.service';
import { CLIENT_SESSIONS_EVENTS } from './constants';
import { clientSessionsRoutes } from './routes';
import type { ClientSessionsViewModel } from './types';

export function useClientSessionsView(ctx: NavContext) {
  const [isSelectingProducts, setIsSelectingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  const client = useMemo(
    () => ctx.services.data.clients.find((item) => item.id === ctx.selection.clientId) ?? null,
    [ctx.services.data.clients, ctx.selection.clientId]
  );

  useEffect(() => {
    setIsSelectingProducts(false);
    setSelectedProducts(new Set());
    setIsBulkDeleteMode(false);
    setSelectedForDelete(new Set());
  }, [ctx.selection.clientId]);

  useEffect(() => {
    const unsubscribeSelect = ctx.shell.events.subscribe(CLIENT_SESSIONS_EVENTS.TOGGLE_PRODUCT_SELECTION, () => {
      setIsSelectingProducts((prev) => {
        const next = !prev;
        if (!next) {
          setSelectedProducts(new Set());
        }
        setIsBulkDeleteMode(false);
        setSelectedForDelete(new Set());
        return next;
      });
    });

    const unsubscribeBulk = ctx.shell.events.subscribe(CLIENT_SESSIONS_EVENTS.TOGGLE_BULK_DELETE, () => {
      setIsBulkDeleteMode((prev) => {
        const next = !prev;
        if (!next) {
          setSelectedForDelete(new Set());
        }
        setIsSelectingProducts(false);
        setSelectedProducts(new Set());
        return next;
      });
    });

    const unsubscribeCancel = ctx.shell.events.subscribe(CLIENT_SESSIONS_EVENTS.CANCEL_MODES, () => {
      setIsSelectingProducts(false);
      setIsBulkDeleteMode(false);
      setSelectedProducts(new Set());
      setSelectedForDelete(new Set());
    });

    return () => {
      unsubscribeSelect();
      unsubscribeBulk();
      unsubscribeCancel();
    };
  }, [ctx.shell.events]);

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts((prev) => toggleInSet(prev, productId));
  }, []);

  const toggleDeleteSelection = useCallback((sessionId: string) => {
    setSelectedForDelete((prev) => toggleInSet(prev, sessionId));
  }, []);

  const cancelProductSelection = useCallback(() => {
    setIsSelectingProducts(false);
    setSelectedProducts(new Set());
    ctx.shell.events.emit(CLIENT_SESSIONS_EVENTS.CANCEL_MODES);
  }, [ctx.shell.events]);

  const cancelBulkDelete = useCallback(() => {
    setIsBulkDeleteMode(false);
    setSelectedForDelete(new Set());
    ctx.shell.events.emit(CLIENT_SESSIONS_EVENTS.CANCEL_MODES);
  }, [ctx.shell.events]);

  const createClientSession = useCallback(async () => {
    if (!client) {
      ctx.services.toast.warning('Select a client first.');
      return;
    }

    // Automatically include all products
    const productIds = client.products.map((p) => p.id);
    if (productIds.length === 0) {
      ctx.services.toast.error('No products available. Add products first.');
      return;
    }

    try {
      const session = await ctx.services.data.addClientSession(client.id, productIds);
      ctx.services.toast.success('Studio session created successfully');
      ctx.services.router.toClientSession(client.id, session.id);
      ctx.shell.closeDrawer();
      ctx.shell.events.emit(CLIENT_SESSIONS_EVENTS.CANCEL_MODES);
    } catch (error) {
      console.error('Failed to create studio session', error);
      ctx.services.toast.error('Failed to create studio session. Please try again.');
    }
  }, [client, ctx.services.data, ctx.services.router, ctx.services.toast, ctx.shell]);

  const bulkDeleteClientSessions = useCallback(async () => {
    if (!client) {
      ctx.services.toast.warning('Select a client first.');
      return;
    }

    const sessionIds = Array.from(selectedForDelete);
    if (sessionIds.length === 0) {
      ctx.services.toast.warning('Select studio sessions to delete.');
      return;
    }

    await ctx.services.confirm.confirm({
      title: `Delete ${sessionIds.length} studio session${sessionIds.length > 1 ? 's' : ''}?`,
      message: 'Are you sure you want to delete the selected studio sessions? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Navigate away first if we're on a session being deleted to prevent 404
          if (ctx.selection.clientSessionId && sessionIds.includes(ctx.selection.clientSessionId)) {
            ctx.shell.setSelection({ clientSessionId: null });
            ctx.services.router.toClientSettings(client.id);
            // Wait for navigation to start
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          await Promise.all(sessionIds.map((sessionId) => ctx.services.data.deleteClientSession(client.id, sessionId)));

          ctx.services.toast.success(
            sessionIds.length === 1
              ? 'Studio session deleted successfully'
              : `${sessionIds.length} studio sessions deleted successfully`
          );

          ctx.shell.events.emit(CLIENT_SESSIONS_EVENTS.CANCEL_MODES);
        } catch (error) {
          console.error('Failed to delete studio sessions', error);
          ctx.services.toast.error('Failed to delete studio sessions. Please try again.');
        }
      },
    });
  }, [client, selectedForDelete, ctx.services.confirm, ctx.services.data, ctx.services.router, ctx.services.toast, ctx.shell, ctx.selection.clientSessionId]);

  const model: ClientSessionsViewModel = useMemo(
    () => ({
      client,
      sessions: client?.clientSessions ?? [],
      isSelectingProducts,
      selectedProducts,
      isBulkDeleteMode,
      selectedForDelete,
    }),
    [client, isSelectingProducts, selectedProducts, isBulkDeleteMode, selectedForDelete]
  );

  const sessionLink = useCallback(
    (sessionId: string) => {
      if (!client) return '#';
      return clientSessionsRoutes.session(client.id, sessionId);
    },
    [client]
  );

  return {
    model,
    toggleProductSelection,
    toggleDeleteSelection,
    cancelProductSelection,
    cancelBulkDelete,
    createClientSession,
    bulkDeleteClientSessions,
    sessionLink,
  };
}
