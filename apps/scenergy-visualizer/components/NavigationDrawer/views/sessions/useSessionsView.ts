import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NavContext } from '../../core/types';
import { toggleInSet } from '../../services/selection.service';
import { SESSIONS_EVENTS } from './constants';
import type { SessionsViewModel } from './types';

export function useSessionsView(ctx: NavContext) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  const client = useMemo(
    () => ctx.services.data.clients.find((item) => item.id === ctx.selection.clientId) ?? null,
    [ctx.services.data.clients, ctx.selection.clientId]
  );
  const product = useMemo(
    () => client?.products.find((item) => item.id === ctx.selection.productId) ?? null,
    [client, ctx.selection.productId]
  );

  useEffect(() => {
    setIsBulkDeleteMode(false);
    setSelectedForDelete(new Set());
    setMenuOpen(null);
  }, [ctx.selection.productId]);

  useEffect(() => {
    const unsubscribeToggle = ctx.shell.events.subscribe(SESSIONS_EVENTS.TOGGLE_BULK_DELETE, () => {
      setIsBulkDeleteMode((prev) => {
        const next = !prev;
        if (!next) {
          setSelectedForDelete(new Set());
        }
        setMenuOpen(null);
        return next;
      });
    });

    const unsubscribeCancel = ctx.shell.events.subscribe(SESSIONS_EVENTS.CANCEL_BULK_DELETE, () => {
      setIsBulkDeleteMode(false);
      setSelectedForDelete(new Set());
    });

    return () => {
      unsubscribeToggle();
      unsubscribeCancel();
    };
  }, [ctx.shell.events]);

  const toggleDeleteSelection = useCallback((sessionId: string) => {
    setSelectedForDelete((prev) => toggleInSet(prev, sessionId));
  }, []);

  const cancelBulkDelete = useCallback(() => {
    setIsBulkDeleteMode(false);
    setSelectedForDelete(new Set());
    ctx.shell.events.emit(SESSIONS_EVENTS.CANCEL_BULK_DELETE);
  }, [ctx.shell.events]);

  const setMenu = useCallback((sessionId: string | null) => {
    setMenuOpen(sessionId);
  }, []);

  const bulkDeleteSessions = useCallback(async () => {
    if (!client || !product) {
      ctx.services.toast.warning('Select a client and product first.');
      return;
    }

    const sessionIds = Array.from(selectedForDelete);
    if (sessionIds.length === 0) {
      ctx.services.toast.warning('Select sessions to delete.');
      return;
    }

    await ctx.services.confirm.confirm({
      title: `Delete ${sessionIds.length} session${sessionIds.length > 1 ? 's' : ''}?`,
      message: 'Are you sure you want to delete the selected sessions? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(
            sessionIds.map((sessionId) => ctx.services.data.deleteSession(client.id, product.id, sessionId))
          );

          if (ctx.selection.sessionId && sessionIds.includes(ctx.selection.sessionId)) {
            ctx.shell.setSelection({ sessionId: null });
            ctx.services.router.toProductSettings(client.id, product.id);
          }

          ctx.services.toast.success(
            sessionIds.length === 1 ? 'Session deleted successfully' : `${sessionIds.length} sessions deleted successfully`
          );

          ctx.shell.events.emit(SESSIONS_EVENTS.CANCEL_BULK_DELETE);
        } catch (error) {
          console.error('Failed to delete sessions', error);
          ctx.services.toast.error('Failed to delete sessions. Please try again.');
        }
      },
    });
  }, [
    client,
    product,
    selectedForDelete,
    ctx.services.confirm,
    ctx.services.data,
    ctx.services.router,
    ctx.services.toast,
    ctx.shell,
    ctx.selection.sessionId,
  ]);

  const model: SessionsViewModel = useMemo(
    () => ({
      product,
      sessions: product?.sessions ?? [],
      isBulkDeleteMode,
      selectedForDelete,
      menuOpen,
    }),
    [product, isBulkDeleteMode, selectedForDelete, menuOpen]
  );

  return {
    model,
    toggleDeleteSelection,
    cancelBulkDelete,
    bulkDeleteSessions,
    setMenu,
  };
}
