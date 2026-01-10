'use client';

import { useMemo, useEffect } from 'react';
import clsx from 'clsx';
import { Menu } from 'lucide-react';
import type { Client } from '@/lib/types/app-types';
import type { NavigationDrawerProps, NavContext, NavSelection, NavViewId } from './types';
import { DrawerHeader } from './core/components/DrawerHeader';
import { ActionMenu } from './core/components/ActionMenu';
import { getView } from './core/registry';
import { filterActions } from './core/actions';
import { useNavShell } from './core/useNavShell';
import { useRouterService } from './core/router';
import { useDataService } from './services/data.service';
import { useToastService } from './services/toast.service';
import { useConfirmService } from './services/confirm.service';
import styles from './NavigationDrawer.module.scss';
import { buildTestId } from '@/lib/utils/test-ids';

// Custom event name for opening nav drawer from other components
export const OPEN_NAV_DRAWER_EVENT = 'scenergy:openNavDrawer';

function computeCounts(view: NavViewId, clients: Client[], selection: NavSelection) {
  if (view === 'clients') {
    return { items: clients.length };
  }

  const client = clients.find((item) => item.id === selection.clientId);

  if (view === 'products') {
    const products = client?.products ?? [];
    return { items: products.length };
  }

  if (view === 'sessions') {
    const product = client?.products.find((item) => item.id === selection.productId);
    const sessions = product?.sessions ?? [];
    return { items: sessions.length };
  }

  if (view === 'clientSessions') {
    const sessions = client?.clientSessions ?? [];
    return { items: sessions.length };
  }

  return { items: 0 };
}

export function NavigationDrawer(props: NavigationDrawerProps) {
  const data = useDataService();
  const toast = useToastService();
  const confirm = useConfirmService();
  const router = useRouterService();
  const navShell = useNavShell(props);

  // Listen for custom event to open drawer from other components
  useEffect(() => {
    const handleOpenDrawer = () => {
      navShell.openDrawer();
    };
    window.addEventListener(OPEN_NAV_DRAWER_EVENT, handleOpenDrawer);
    return () => window.removeEventListener(OPEN_NAV_DRAWER_EVENT, handleOpenDrawer);
  }, [navShell]);

  const counts = useMemo(
    () => computeCounts(navShell.view, data.clients, navShell.selection),
    [navShell.view, data.clients, navShell.selection]
  );

  const callbacks = useMemo(
    () => ({
      onSessionSelect: props.onSessionSelect,
      onAddClient: props.onAddClient,
      onAddProduct: props.onAddProduct,
      onAddProducts: props.onAddProducts,
      onEditProduct: props.onEditProduct,
      onDeleteProduct: props.onDeleteProduct,
      onEditSession: props.onEditSession,
    }),
    [
      props.onSessionSelect,
      props.onAddClient,
      props.onAddProduct,
      props.onAddProducts,
      props.onEditProduct,
      props.onDeleteProduct,
      props.onEditSession,
    ]
  );

  const ctx: NavContext = useMemo(
    () => ({
      view: navShell.view,
      selection: navShell.selection,
      counts,
      keyboard: navShell.keyboard,
      auth: {
        role: props.authRole ?? null,
      },
      services: { data, toast, confirm, router },
      callbacks,
      shell: navShell.shell,
    }),
    [navShell.view, navShell.selection, counts, navShell.keyboard, data, toast, confirm, router, callbacks, navShell.shell, props.authRole]
  );

  const view = getView(navShell.view);
  const toolbarActions = useMemo(() => filterActions(view.toolbarActions, ctx), [view, ctx]);
  const title = view.title(ctx);

  return (
    <>
      {navShell.isMobile && !navShell.isOpen && (
        <button
          className={styles.hamburger}
          onClick={navShell.openDrawer}
          aria-label="Open navigation"
          type="button"
          data-testid={buildTestId('navigation-drawer', 'open-button')}
        >
          <Menu size={24} color="white" />
        </button>
      )}

      {navShell.isOpen && navShell.isMobile && (
        <div
          className={styles.backdrop}
          onClick={navShell.closeDrawer}
          aria-hidden
          data-testid={buildTestId('navigation-drawer', 'backdrop')}
        />
      )}

      <aside
        className={clsx(styles.drawer, {
          [styles.drawerOpen]: navShell.isOpen,
          [styles.drawerDesktop]: !navShell.isMobile,
        })}
      >
        <DrawerHeader
          title={title}
          canGoBack={navShell.shell.canGoBack}
          onBack={navShell.goBack}
          rightActions={
            toolbarActions.length > 0 ? (close) => <ActionMenu actions={toolbarActions} ctx={ctx} onAction={close} /> : undefined
          }
        />

        <div
          className={styles.content}
          role="tree"
          aria-label="Navigation tree"
          onKeyDown={(event) => navShell.keyboard.handleKeyDown(event, ctx.counts.items)}
        >
          <view.Component ctx={ctx} />
        </div>

        <div className={styles.footer}>
          <div className={styles.footerText}>Epox Visualizer</div>
        </div>
      </aside>
    </>
  );
}
