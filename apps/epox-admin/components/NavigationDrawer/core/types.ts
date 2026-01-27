import type { MutableRefObject, ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { DataService } from '../services/data.service';
import type { ToastService } from '../services/toast.service';
import type { ConfirmService } from '../services/confirm.service';
import type { RouterService } from './router';
import type { AppRole } from '@/lib/auth/roles';

export type NavViewId = 'clients' | 'products' | 'sessions' | 'clientSessions' | 'studioProducts';

export interface NavSelection {
  clientId?: string | null;
  productId?: string | null;
  sessionId?: string | null;
  clientSessionId?: string | null;
}

export interface NavCounts {
  items: number;
  [key: string]: number;
}

export interface NavShellEvents {
  emit: (event: string, payload?: unknown) => void;
  subscribe: (event: string, listener: (payload?: unknown) => void) => () => void;
}

export interface NavShellControls {
  closeDrawer: () => void;
  openDrawer: () => void;
  setView: (view: NavViewId) => void;
  setSelection: (selection: Partial<NavSelection>) => void;
  resetSelections: () => void;
  goBack: () => void;
  canGoBack: boolean;
  events: NavShellEvents;
}

export interface NavKeyboardControls {
  focusedIndex: number;
  listItemRefs: MutableRefObject<(HTMLElement | null)[]>;
  handleKeyDown: (event: ReactKeyboardEvent, totalItems: number) => void;
}

export interface NavContext {
  view: NavViewId;
  selection: NavSelection;
  counts: NavCounts;
  keyboard: NavKeyboardControls;
  auth: {
    role: AppRole | null;
  };
  services: {
    data: DataService;
    toast: ToastService;
    confirm: ConfirmService;
    router: RouterService;
  };
  callbacks: NavCallbacks;
  shell: NavShellControls;
}

export type ActionVisibility = (ctx: NavContext) => boolean;
export type ActionEnabled = (ctx: NavContext) => boolean;

export interface ActionDef {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'danger';
  placement: Array<'toolbar' | 'row'>;
  visible?: ActionVisibility;
  enabled?: ActionEnabled;
  run: (ctx: NavContext, payload?: unknown) => Promise<void> | void;
}

export interface RowActionFactory<Row> {
  (row: Row, ctx: NavContext): ActionDef[];
}

export interface ViewPlugin<Row = unknown> {
  id: NavViewId;
  title: (ctx: NavContext) => string;
  Component: React.ComponentType<{ ctx: NavContext }>;
  toolbarActions: ActionDef[];
  rowActions?: RowActionFactory<Row>;
  keymap?: (event: ReactKeyboardEvent, ctx: NavContext) => void;
}

export interface NavCallbacks {
  onSessionSelect: (clientId: string, productId: string, sessionId: string) => void;
  onAddClient: () => void;
  onAddProduct: (clientId: string) => void;
  onAddProducts: (clientId: string) => void;
  onEditProduct: (clientId: string, productId: string) => void;
  onDeleteProduct: (clientId: string, productId: string) => void;
  onEditSession: (clientId: string, productId: string, sessionId: string, sessionName: string) => void;
}
