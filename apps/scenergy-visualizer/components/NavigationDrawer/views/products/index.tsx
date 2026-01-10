import clsx from 'clsx';
import type { NavContext } from '../../core/types';
import { BulkBar } from '../../core/components/BulkBar';
import { Checkbox } from '../../components/Checkbox';
import { EmptyState } from '../../components/EmptyState';
import { ItemMeta } from '../../components/ItemMeta';
import { ItemTitle } from '../../components/ItemTitle';
import styles from '../../NavigationDrawer.module.scss';
import { useProductsView } from './useProductsView';
import { buildTestId } from '@/lib/utils/test-ids';

export function ProductsView({ ctx }: { ctx: NavContext }) {
  const {
    model,
    handleProductClick,
    cancelSelection,
    cancelBulkDelete,
    createClientSession,
    bulkDeleteProducts,
  } = useProductsView(ctx);
  const { focusedIndex, listItemRefs } = ctx.keyboard;

  if (!model.client) {
    return <EmptyState message="Select a client to view products." onAdd={ctx.callbacks.onAddClient} addLabel="Add Client" />;
  }

  if (model.products.length === 0) {
    return (
      <EmptyState
        message="No products yet. Add your first product to get started."
        onAdd={() => ctx.callbacks.onAddProduct(model.client!.id)}
        addLabel="Add Product"
      />
    );
  }

  listItemRefs.current = listItemRefs.current.slice(0, model.products.length);

  const inSelectionMode = model.isSelectingProducts || model.isBulkDeleteMode;

  return (
    <div className={clsx(styles.buttonList, styles.productsList)}>
      {model.isSelectingProducts && (
        <BulkBar
          mode="select"
          selectedCount={model.selectedForSession.size}
          onConfirm={createClientSession}
          onCancel={cancelSelection}
          confirmLabel="Create Session"
        />
      )}

      {model.isBulkDeleteMode && (
        <BulkBar
          mode="delete"
          selectedCount={model.selectedForDelete.size}
          onConfirm={bulkDeleteProducts}
          onCancel={cancelBulkDelete}
          confirmLabel="Delete"
        />
      )}

      {model.products.map((product, index) => {
        const isActive = ctx.selection.productId === product.id && !inSelectionMode;
        const isSelectedForSession = model.selectedForSession.has(product.id);
        const isSelectedForDelete = model.selectedForDelete.has(product.id);

        return (
          <div
            key={product.id}
            className={styles.itemRow}
            role="treeitem"
            aria-selected={isActive || isSelectedForSession || isSelectedForDelete}
          >
            <button
              ref={(element) => {
                if (element) listItemRefs.current[index] = element;
              }}
              className={clsx(styles.listItem, {
                [styles.listItemWithMenu]: inSelectionMode,
                [styles.listItemSelected]:
                  (model.isSelectingProducts && isSelectedForSession) || (model.isBulkDeleteMode && isSelectedForDelete),
                [styles.listItemActive]: isActive,
              })}
              onClick={() => handleProductClick(product.id)}
              tabIndex={index === focusedIndex ? 0 : -1}
              aria-label={`${product.name}, ${product.sessions.length} session${product.sessions.length !== 1 ? 's' : ''}`}
              type="button"
              data-testid={buildTestId('navigation-drawer', 'product-item', product.id)}
            >
              <div className={styles.itemInner}>
                {inSelectionMode && (
                  <Checkbox checked={model.isSelectingProducts ? isSelectedForSession : isSelectedForDelete} />
                )}
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
