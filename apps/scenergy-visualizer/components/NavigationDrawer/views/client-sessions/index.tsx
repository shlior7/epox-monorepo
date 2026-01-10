import Link from 'next/link';
import clsx from 'clsx';
import type { NavContext } from '../../core/types';
import { BulkBar } from '../../core/components/BulkBar';
import { Checkbox } from '../../components/Checkbox';
import { EmptyState } from '../../components/EmptyState';
import { ItemMeta } from '../../components/ItemMeta';
import { ItemTitle } from '../../components/ItemTitle';
import styles from '../../NavigationDrawer.module.scss';
import { CLIENT_SESSIONS_EVENTS } from './constants';
import { useClientSessionsView } from './useClientSessionsView';
import { stringToUrlObject } from '../../../../lib/utils/stringToUrlObject';
import { buildTestId } from '@/lib/utils/test-ids';

export function ClientSessionsView({ ctx }: { ctx: NavContext }) {
  const {
    model,
    toggleProductSelection,
    toggleDeleteSelection,
    cancelProductSelection,
    cancelBulkDelete,
    createClientSession,
    bulkDeleteClientSessions,
    sessionLink,
  } = useClientSessionsView(ctx);
  const { focusedIndex, listItemRefs } = ctx.keyboard;

  if (!model.client) {
    return <EmptyState message="Select a client to view sessions." onAdd={ctx.callbacks.onAddClient} addLabel="Add Client" />;
  }

  listItemRefs.current = listItemRefs.current.slice(0, model.isSelectingProducts ? model.client.products.length : model.sessions.length);

  if (model.isSelectingProducts) {
    if (model.client.products.length === 0) {
      return (
        <EmptyState
          message="No products available. Please add products first."
          onAdd={() => ctx.callbacks.onAddProduct(model.client!.id)}
          addLabel="Add Product"
        />
      );
    }

    return (
      <div className={clsx(styles.buttonList, styles.sessionList)}>
        <BulkBar
          mode="select"
          selectedCount={model.selectedProducts.size}
          onConfirm={createClientSession}
          onCancel={cancelProductSelection}
          confirmLabel="Create Session"
        />

        {model.client.products.map((product, index) => {
          const isSelected = model.selectedProducts.has(product.id);

          return (
            <div key={product.id} className={styles.itemRow} role="treeitem" aria-selected={isSelected}>
              <button
                ref={(element) => {
                  if (element) listItemRefs.current[index] = element;
                }}
                className={clsx(styles.listItem, styles.listItemWithMenu, {
                  [styles.listItemSelected]: isSelected,
                })}
                onClick={() => toggleProductSelection(product.id)}
                tabIndex={index === focusedIndex ? 0 : -1}
                aria-label={`${product.name}, ${product.sessions.length} session${product.sessions.length !== 1 ? 's' : ''}`}
                type="button"
                data-testid={buildTestId('navigation-drawer', 'client-session-product', product.id)}
              >
                <div className={styles.itemInner}>
                  <Checkbox checked={isSelected} />
                  <div className={styles.productInfo}>
                    <ItemTitle>{product.name}</ItemTitle>
                    <ItemMeta>
                      {product.sessions.length} session{product.sessions.length !== 1 ? 's' : ''}
                    </ItemMeta>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  if (model.sessions.length === 0) {
    return (
      <EmptyState
        message="No studio sessions yet. Create one by selecting products to compare."
        onAdd={() => ctx.shell.events.emit(CLIENT_SESSIONS_EVENTS.TOGGLE_PRODUCT_SELECTION)}
        addLabel="Create Studio Session"
      />
    );
  }

  return (
    <div className={clsx(styles.buttonList, styles.sessionList)}>
      {model.isBulkDeleteMode && (
        <BulkBar
          mode="delete"
          selectedCount={model.selectedForDelete.size}
          onConfirm={bulkDeleteClientSessions}
          onCancel={cancelBulkDelete}
          confirmLabel="Delete"
        />
      )}

      {model.sessions.map((session, index) => {
        const isSelected = model.selectedForDelete.has(session.id);
        const isActive = ctx.selection.clientSessionId === session.id && !model.isBulkDeleteMode;
        const flowCount = session.flows?.length || 0;
        const href = sessionLink(session.id);

        if (model.isBulkDeleteMode) {
          return (
            <div key={session.id} className={styles.itemRow} role="treeitem" aria-selected={isSelected}>
              <button
                ref={(element) => {
                  if (element) listItemRefs.current[index] = element;
                }}
                className={clsx(styles.listItem, styles.listItemWithMenu, {
                  [styles.listItemSelected]: isSelected,
                })}
                onClick={() => toggleDeleteSelection(session.id)}
                tabIndex={index === focusedIndex ? 0 : -1}
                aria-label={`${session.name}, ${flowCount} flow${flowCount !== 1 ? 's' : ''}`}
                type="button"
                data-testid={buildTestId('navigation-drawer', 'client-session-select', session.id)}
              >
                <div className={styles.itemInner}>
                  <Checkbox checked={isSelected} />
                  <div className={styles.sessionInfo}>
                    <ItemTitle>{session.name}</ItemTitle>
                    <ItemMeta>
                      {flowCount} flow{flowCount !== 1 ? 's' : ''}
                    </ItemMeta>
                  </div>
                </div>
              </button>
            </div>
          );
        }

        return (
          <div key={session.id} className={styles.itemRow} role="treeitem" aria-selected={isActive}>
            <Link
              ref={(element) => {
                if (element) listItemRefs.current[index] = element as unknown as HTMLElement;
              }}
              href={stringToUrlObject(href)}
              className={clsx(styles.listItem, styles.listItemWithMenu, styles.sessionsLink, {
                [styles.listItemActive]: isActive,
              })}
              onClick={() => ctx.shell.closeDrawer()}
              prefetch
              tabIndex={index === focusedIndex ? 0 : -1}
              aria-label={`${session.name}, ${flowCount} flow${flowCount !== 1 ? 's' : ''}`}
              data-testid={buildTestId('navigation-drawer', 'client-session-link', session.id)}
            >
              <ItemTitle>{session.name}</ItemTitle>
              <ItemMeta>
                {flowCount} flow{flowCount !== 1 ? 's' : ''}
              </ItemMeta>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
