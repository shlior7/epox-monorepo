import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NavContext } from '../../core/types';
import { toggleInSet } from '../../services/selection.service';
import { PRODUCTS_EVENTS } from './constants';
import type { ProductsViewModel } from './types';

export function useProductsView(ctx: NavContext) {
  const [isSelectingProducts, setIsSelectingProducts] = useState(false);
  const [selectedForSession, setSelectedForSession] = useState<Set<string>>(new Set());
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  const client = useMemo(
    () => ctx.services.data.clients.find((item) => item.id === ctx.selection.clientId) ?? null,
    [ctx.services.data.clients, ctx.selection.clientId]
  );

  useEffect(() => {
    setIsSelectingProducts(false);
    setSelectedForSession(new Set());
    setIsBulkDeleteMode(false);
    setSelectedForDelete(new Set());
  }, [ctx.selection.clientId]);

  useEffect(() => {
    const unsubscribeSelect = ctx.shell.events.subscribe(PRODUCTS_EVENTS.TOGGLE_SELECT, () => {
      setIsSelectingProducts((prev) => {
        const next = !prev;
        if (!next) {
          setSelectedForSession(new Set());
        }
        setIsBulkDeleteMode(false);
        setSelectedForDelete(new Set());
        return next;
      });
    });

    const unsubscribeBulkDelete = ctx.shell.events.subscribe(PRODUCTS_EVENTS.TOGGLE_BULK_DELETE, () => {
      setIsBulkDeleteMode((prev) => {
        const next = !prev;
        if (!next) {
          setSelectedForDelete(new Set());
        }
        setIsSelectingProducts(false);
        setSelectedForSession(new Set());
        return next;
      });
    });

    const unsubscribeCancel = ctx.shell.events.subscribe(PRODUCTS_EVENTS.CANCEL_MODES, () => {
      setIsSelectingProducts(false);
      setIsBulkDeleteMode(false);
      setSelectedForSession(new Set());
      setSelectedForDelete(new Set());
    });

    return () => {
      unsubscribeSelect();
      unsubscribeBulkDelete();
      unsubscribeCancel();
    };
  }, [ctx.shell.events]);

  const toggleSessionSelection = useCallback((productId: string) => {
    setSelectedForSession((prev) => toggleInSet(prev, productId));
  }, []);

  const toggleDeleteSelection = useCallback((productId: string) => {
    setSelectedForDelete((prev) => toggleInSet(prev, productId));
  }, []);

  const cancelSelection = useCallback(() => {
    setIsSelectingProducts(false);
    setSelectedForSession(new Set());
    ctx.shell.events.emit(PRODUCTS_EVENTS.CANCEL_MODES);
  }, [ctx.shell.events]);

  const cancelBulkDelete = useCallback(() => {
    setIsBulkDeleteMode(false);
    setSelectedForDelete(new Set());
    ctx.shell.events.emit(PRODUCTS_EVENTS.CANCEL_MODES);
  }, [ctx.shell.events]);

  const handleProductClick = useCallback(
    (productId: string) => {
      if (!client) {
        ctx.services.toast.warning('Select a client first.');
        return;
      }

      if (isSelectingProducts) {
        toggleSessionSelection(productId);
        return;
      }

      if (isBulkDeleteMode) {
        toggleDeleteSelection(productId);
        return;
      }

      ctx.shell.setSelection({
        productId,
        sessionId: null,
        clientSessionId: null,
      });
      ctx.shell.setView('sessions');
      ctx.services.router.toProductSettings(client.id, productId);
      ctx.shell.closeDrawer();
      ctx.shell.events.emit(PRODUCTS_EVENTS.CANCEL_MODES);
    },
    [
      client,
      ctx.services.router,
      ctx.services.toast,
      ctx.shell,
      isSelectingProducts,
      isBulkDeleteMode,
      toggleDeleteSelection,
      toggleSessionSelection,
    ]
  );

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
      ctx.shell.events.emit(PRODUCTS_EVENTS.CANCEL_MODES);
    } catch (error) {
      console.error('Failed to create studio session', error);
      ctx.services.toast.error('Failed to create studio session. Please try again.');
    }
  }, [client, ctx.services.data, ctx.services.router, ctx.services.toast, ctx.shell]);

  const bulkDeleteProducts = useCallback(async () => {
    if (!client) {
      ctx.services.toast.warning('Select a client first.');
      return;
    }

    const productIds = Array.from(selectedForDelete);
    if (productIds.length === 0) {
      ctx.services.toast.warning('Select products to delete.');
      return;
    }

    await ctx.services.confirm.confirm({
      title: `Delete ${productIds.length} product${productIds.length > 1 ? 's' : ''}?`,
      message: 'Are you sure you want to delete the selected products? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(productIds.map((productId) => ctx.services.data.deleteProduct(client.id, productId)));

          if (ctx.selection.productId && productIds.includes(ctx.selection.productId)) {
            ctx.shell.setSelection({
              productId: null,
              sessionId: null,
            });
            ctx.services.router.toClientSettings(client.id);
          }

          ctx.services.toast.success(
            productIds.length === 1 ? 'Product deleted successfully' : `${productIds.length} products deleted successfully`
          );

          ctx.shell.events.emit(PRODUCTS_EVENTS.CANCEL_MODES);
        } catch (error) {
          console.error('Failed to delete products', error);
          ctx.services.toast.error('Failed to delete products. Please try again.');
        }
      },
    });
  }, [
    client,
    ctx.selection.productId,
    ctx.services.confirm,
    ctx.services.data,
    ctx.services.router,
    ctx.services.toast,
    ctx.shell,
    selectedForDelete,
  ]);

  const model: ProductsViewModel = useMemo(
    () => ({
      client,
      products: client?.products ?? [],
      isSelectingProducts,
      isBulkDeleteMode,
      selectedForSession,
      selectedForDelete,
    }),
    [client, isSelectingProducts, isBulkDeleteMode, selectedForSession, selectedForDelete]
  );

  return {
    model,
    handleProductClick,
    cancelSelection,
    cancelBulkDelete,
    createClientSession,
    bulkDeleteProducts,
  };
}
