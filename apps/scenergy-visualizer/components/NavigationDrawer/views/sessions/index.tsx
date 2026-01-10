import { useCallback, useRef } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { MoreVertical } from 'lucide-react';
import type { NavContext } from '../../core/types';
import { ActionMenu } from '../../core/components/ActionMenu';
import { BulkBar } from '../../core/components/BulkBar';
import { Checkbox } from '../../components/Checkbox';
import { EmptyState } from '../../components/EmptyState';
import { ItemMeta } from '../../components/ItemMeta';
import { ItemTitle } from '../../components/ItemTitle';
import { useClickOutside } from '../../hooks/useClickOutside';
import styles from '../../NavigationDrawer.module.scss';
import { sessionsToolbarActions, createSessionRowActions } from './actions';
import { sessionsRoutes } from './routes';
import { useSessionsView } from './useSessionsView';
import { stringToUrlObject } from '../../../../lib/utils/stringToUrlObject';
import { buildTestId } from '@/lib/utils/test-ids';

export function SessionsView({ ctx }: { ctx: NavContext }) {
  const { model, toggleDeleteSelection, cancelBulkDelete, bulkDeleteSessions, setMenu } = useSessionsView(ctx);
  const { focusedIndex, listItemRefs } = ctx.keyboard;
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeMenu = useCallback(() => setMenu(null), [setMenu]);

  useClickOutside([menuRef], [closeMenu]);

  listItemRefs.current = listItemRefs.current.slice(0, model.sessions.length);

  const clientId = ctx.selection.clientId;
  const productId = ctx.selection.productId;

  if (!model.product || !clientId || !productId) {
    return (
      <EmptyState
        message="Select a product to view sessions."
        onAdd={() => {
          void sessionsToolbarActions[0].run(ctx);
        }}
        addLabel="New Session"
      />
    );
  }

  if (model.sessions.length === 0) {
    return (
      <EmptyState
        message="No sessions yet. Create your first session to start working."
        onAdd={() => {
          void sessionsToolbarActions[0].run(ctx);
        }}
        addLabel="New Session"
      />
    );
  }

  return (
    <div className={clsx(styles.buttonList, styles.sessionList)}>
      {model.isBulkDeleteMode && (
        <BulkBar
          mode="delete"
          selectedCount={model.selectedForDelete.size}
          onConfirm={bulkDeleteSessions}
          onCancel={cancelBulkDelete}
          confirmLabel="Delete"
        />
      )}

      {model.sessions.map((session, index) => {
        const isSelected = model.selectedForDelete.has(session.id);
        const isActive = ctx.selection.sessionId === session.id && !model.isBulkDeleteMode;
        const sessionDate = new Date(session.createdAt).toLocaleDateString();
        const href = sessionsRoutes.session(clientId, productId, session.id);

        if (model.isBulkDeleteMode) {
          return (
            <div key={session.id} className={styles.itemRow} role="treeitem" aria-selected={isSelected}>
              <button
                ref={(element) => {
                  if (element) listItemRefs.current[index] = element;
                }}
                className={clsx(styles.listItem, styles.listItemWithMenu, { [styles.listItemSelected]: isSelected })}
                onClick={() => toggleDeleteSelection(session.id)}
                tabIndex={index === focusedIndex ? 0 : -1}
                aria-label={`${session.name}, created ${sessionDate}`}
                type="button"
                data-testid={buildTestId('navigation-drawer', 'session-select-item', session.id)}
              >
                <div className={styles.itemInner}>
                  <Checkbox checked={isSelected} />
                  <div className={styles.sessionInfo}>
                    <ItemTitle>{session.name}</ItemTitle>
                    <ItemMeta>{sessionDate}</ItemMeta>
                  </div>
                </div>
              </button>
            </div>
          );
        }

        const rowActions = createSessionRowActions(session);
        const isMenuOpen = model.menuOpen === session.id;

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
              aria-label={`${session.name}, created ${sessionDate}`}
              data-testid={buildTestId('navigation-drawer', 'session-link', session.id)}
            >
              <ItemTitle>{session.name}</ItemTitle>
              <ItemMeta>{sessionDate}</ItemMeta>
            </Link>

            <button
              className={clsx(styles.iconButton, styles.actionMenuTrigger)}
              onClick={(event) => {
                event.stopPropagation();
                setMenu(isMenuOpen ? null : session.id);
              }}
              aria-label="More options"
              aria-expanded={isMenuOpen}
              type="button"
              data-testid={buildTestId('navigation-drawer', 'session-menu-trigger', session.id)}
            >
              <MoreVertical size={20} color="white" />
            </button>

            {isMenuOpen && (
              <div ref={menuRef}>
                <ActionMenu actions={rowActions} ctx={ctx} placement="row" onAction={closeMenu} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
