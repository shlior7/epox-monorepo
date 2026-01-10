import clsx from 'clsx';
import type { ActionDef, NavContext } from '../types';
import { filterActions, isActionEnabled, runAction } from '../actions';
import styles from '../../NavigationDrawer.module.scss';
import { buildTestId } from '@/lib/utils/test-ids';

interface ActionMenuProps {
  actions: ActionDef[];
  ctx: NavContext;
  placement?: 'toolbar' | 'row';
  onAction?: () => void;
}

export function ActionMenu({ actions, ctx, placement = 'toolbar', onAction }: ActionMenuProps) {
  const visibleActions = filterActions(
    actions.filter((action) => action.placement.includes(placement)),
    ctx
  );

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className={styles.actionMenu}>
      {visibleActions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={clsx(styles.actionMenuItem, {
            [styles.actionMenuItemDanger]: action.variant === 'danger',
          })}
          disabled={!isActionEnabled(action, ctx)}
          onClick={async () => {
            await runAction(action, ctx);
            onAction?.();
          }}
          data-testid={buildTestId('navigation-drawer', 'action', action.id)}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
