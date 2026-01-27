import type {
  NavContext,
  NavSelection,
  NavShellControls,
  NavKeyboardControls,
  NavViewId,
  ActionDef,
  ViewPlugin,
  NavCallbacks,
} from './core/types';
import type { AppRole } from '@/lib/auth/roles';

export interface NavigationDrawerProps {
  activeClientId: string | null;
  activeProductId: string | null;
  activeSessionId: string | null;
  activeClientSessionId: string | null;
  authRole?: AppRole | null;
  onSessionSelect: (clientId: string, productId: string, sessionId: string) => void;
  onAddClient: () => void;
  onAddProduct: (clientId: string) => void;
  onAddProducts: (clientId: string) => void;
  onEditProduct: (clientId: string, productId: string) => void;
  onDeleteProduct: (clientId: string, productId: string) => void;
  onEditSession: (clientId: string, productId: string, sessionId: string, sessionName: string) => void;
}

export type { NavContext, NavSelection, NavShellControls, NavKeyboardControls, NavViewId, NavCallbacks, ActionDef, ViewPlugin };
