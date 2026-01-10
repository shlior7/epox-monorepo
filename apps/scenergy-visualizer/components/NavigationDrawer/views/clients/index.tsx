import clsx from 'clsx';
import type { NavContext } from '../../core/types';
import { BulkBar } from '../../core/components/BulkBar';
import { Checkbox } from '../../components/Checkbox';
import { EmptyState } from '../../components/EmptyState';
import { ItemMeta } from '../../components/ItemMeta';
import { ItemTitle } from '../../components/ItemTitle';
import styles from '../../NavigationDrawer.module.scss';
import { useClientsView } from './useClientsView';
import { buildTestId } from '@/lib/utils/test-ids';

export function ClientsView({ ctx }: { ctx: NavContext }) {
  const { model, handleClientClick, toggleDeleteSelection, cancelBulkDelete, bulkDelete } = useClientsView(ctx);
  const { focusedIndex, listItemRefs } = ctx.keyboard;
  const canManageClients = ctx.auth.role === 'admin';

  if (model.rows.length === 0) {
    return (
      <EmptyState
        message={canManageClients ? 'No clients yet. Add your first client to get started.' : 'No client assigned yet.'}
        onAdd={canManageClients ? ctx.callbacks.onAddClient : undefined}
        addLabel="Add Client"
      />
    );
  }

  listItemRefs.current = listItemRefs.current.slice(0, model.rows.length);

  return (
    <div className={styles.buttonList}>
      {model.isBulkDeleteMode && (
        <BulkBar
          mode="delete"
          selectedCount={model.selectedForDelete.size}
          onConfirm={bulkDelete}
          onCancel={cancelBulkDelete}
          confirmLabel="Delete"
        />
      )}

      {model.rows.map((client, index) => {
        const isSelected = model.selectedForDelete.has(client.id);
        const isActive = ctx.selection.clientId === client.id && !model.isBulkDeleteMode;

        return (
          <div key={client.id} className={styles.itemRow} role="treeitem" aria-selected={isActive || isSelected}>
            <button
              ref={(element) => {
                if (element) listItemRefs.current[index] = element;
              }}
              className={clsx(styles.listItem, {
                [styles.listItemWithMenu]: model.isBulkDeleteMode,
                [styles.listItemSelected]: model.isBulkDeleteMode && isSelected,
                [styles.listItemActive]: isActive,
              })}
              onClick={() => {
                if (model.isBulkDeleteMode) {
                  toggleDeleteSelection(client.id);
                } else {
                  handleClientClick(client.id);
                }
              }}
              tabIndex={index === focusedIndex ? 0 : -1}
              aria-label={`${client.name}, ${client.products.length} product${client.products.length !== 1 ? 's' : ''}`}
              type="button"
              data-testid={buildTestId('navigation-drawer', 'client-item', index)}
            >
              <div className={styles.itemInner}>
                {model.isBulkDeleteMode && <Checkbox checked={isSelected} />}
                <div className={styles.clientInfo}>
                  <ItemTitle>{client.name}</ItemTitle>
                  <ItemMeta>
                    {client.products.length} product{client.products.length !== 1 ? 's' : ''}
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
