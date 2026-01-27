import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NavContext } from '../../core/types';
import { toggleInSet } from '../../services/selection.service';
import { CLIENTS_EVENTS } from './constants';
import type { ClientsViewModel } from './types';

export function useClientsView(ctx: NavContext) {
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  const clients = ctx.services.data.clients;

  useEffect(() => {
    const unsubscribeToggle = ctx.shell.events.subscribe(CLIENTS_EVENTS.TOGGLE_BULK_DELETE, () => {
      setIsBulkDeleteMode((prev) => {
        const next = !prev;
        if (!next) {
          setSelectedForDelete(new Set());
        }
        return next;
      });
    });

    const unsubscribeCancel = ctx.shell.events.subscribe(CLIENTS_EVENTS.CANCEL_BULK_DELETE, () => {
      setIsBulkDeleteMode(false);
      setSelectedForDelete(new Set());
    });

    return () => {
      unsubscribeToggle();
      unsubscribeCancel();
    };
  }, [ctx.shell.events]);

  const handleClientClick = useCallback(
    (clientId: string) => {
      ctx.shell.setSelection({
        clientId,
        productId: null,
        sessionId: null,
        clientSessionId: null,
      });
      ctx.shell.setView('clientSessions');
      ctx.services.router.toClientSettings(clientId);
      ctx.shell.closeDrawer();
      ctx.shell.events.emit(CLIENTS_EVENTS.CANCEL_BULK_DELETE);
    },
    [ctx]
  );

  const toggleDeleteSelection = useCallback((clientId: string) => {
    setSelectedForDelete((prev) => toggleInSet(prev, clientId));
  }, []);

  const resetBulkState = useCallback(() => {
    setIsBulkDeleteMode(false);
    setSelectedForDelete(new Set());
  }, []);

  const cancelBulkDelete = useCallback(() => {
    resetBulkState();
    ctx.shell.events.emit(CLIENTS_EVENTS.CANCEL_BULK_DELETE);
  }, [resetBulkState, ctx.shell.events]);

  const bulkDelete = useCallback(async () => {
    const ids = Array.from(selectedForDelete);
    if (ids.length === 0) {
      ctx.services.toast.warning('Select clients to delete.');
      return;
    }

    await ctx.services.confirm.confirm({
      title: `Delete ${ids.length} client${ids.length > 1 ? 's' : ''}?`,
      message: 'Are you sure you want to delete the selected clients? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(ids.map((id) => ctx.services.data.deleteClient(id)));

          if (ctx.selection.clientId && ids.includes(ctx.selection.clientId)) {
            ctx.services.router.home();
            ctx.shell.resetSelections();
          }

          ctx.services.toast.success(ids.length === 1 ? 'Client deleted successfully' : `${ids.length} clients deleted successfully`);

          resetBulkState();
        } catch (error) {
          console.error('Failed to delete clients', error);
          ctx.services.toast.error('Failed to delete clients. Please try again.');
        }
      },
    });
  }, [
    selectedForDelete,
    ctx.services.confirm,
    ctx.services.data,
    ctx.services.router,
    ctx.services.toast,
    ctx.selection.clientId,
    ctx.shell,
    resetBulkState,
  ]);

  const model: ClientsViewModel = useMemo(
    () => ({
      rows: clients,
      isBulkDeleteMode,
      selectedForDelete,
    }),
    [clients, isBulkDeleteMode, selectedForDelete]
  );

  return {
    model,
    handleClientClick,
    toggleDeleteSelection,
    cancelBulkDelete,
    bulkDelete,
  };
}
