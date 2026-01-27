import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject, KeyboardEvent } from 'react';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useMobileDrawer } from '../hooks/useMobileDrawer';
import type { NavigationDrawerProps } from '../types';
import type { NavSelection, NavViewId, NavShellControls } from './types';
import { useRouterService } from './router';

type EventListener = (payload?: unknown) => void;

export interface NavShellState {
  view: NavViewId;
  setView: (view: NavViewId, options?: { pushHistory?: boolean }) => void;
  selection: NavSelection;
  setSelection: (selection: Partial<NavSelection>) => void;
  resetSelections: () => void;
  goBack: () => void;
  canGoBack: boolean;
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  isMobile: boolean;
  keyboard: {
    focusedIndex: number;
    listItemRefs: MutableRefObject<(HTMLElement | null)[]>;
    handleKeyDown: (event: KeyboardEvent, totalItems: number) => void;
  };
  shell: NavShellControls;
}

export function useNavShell(props: NavigationDrawerProps): NavShellState {
  const { activeClientId, activeProductId, activeSessionId, activeClientSessionId, onSessionSelect } = props;
  const { isOpen, setIsOpen, isMobile } = useMobileDrawer();
  const keyboard = useKeyboardNavigation(isMobile, setIsOpen);
  const router = useRouterService();
  const [view, setViewState] = useState<NavViewId>('clients');
  const [history, setHistory] = useState<NavViewId[]>([]);
  const [selection, setSelectionState] = useState<NavSelection>({
    clientId: null,
    productId: null,
    sessionId: null,
    clientSessionId: null,
  });
  const listenersRef = useRef<Map<string, Set<EventListener>>>(new Map());

  useEffect(() => {
    const nextSelection: NavSelection = {
      clientId: activeClientId ?? null,
      productId: activeProductId ?? null,
      sessionId: activeSessionId ?? null,
      clientSessionId: activeClientSessionId ?? null,
    };

    setSelectionState(nextSelection);

    if (activeClientId) {
      if (activeClientSessionId) {
        // When inside a studio session, show products panel for dragging to flows
        setViewState('studioProducts');
      } else if (activeProductId) {
        // When productId is active, show sessions view
        setViewState('sessions');
      } else {
        // When only clientId is active (client settings page), show studio sessions view
        setViewState('clientSessions');
      }
    } else {
      setViewState('clients');
    }

    setHistory([]);
  }, [activeClientId, activeProductId, activeSessionId, activeClientSessionId]);

  const setView = useCallback((nextView: NavViewId, options: { pushHistory?: boolean } = {}) => {
    setViewState((current) => {
      if (current === nextView) {
        return current;
      }

      if (options.pushHistory ?? true) {
        setHistory((stack) => [...stack, current]);
      }

      return nextView;
    });
  }, []);

  const setSelection = useCallback((partial: Partial<NavSelection>) => {
    setSelectionState((prev) => ({
      ...prev,
      ...partial,
    }));
  }, []);

  const resetSelections = useCallback(() => {
    setSelectionState({
      clientId: null,
      productId: null,
      sessionId: null,
      clientSessionId: null,
    });
  }, []);

  const goBack = useCallback(() => {
    // Navigate based on current view and selection
    if (view === 'studioProducts' && selection.clientId) {
      // From studio products (in studio session) -> go to client settings page
      router.toClientSettings(selection.clientId);
    } else if (view === 'sessions' && selection.clientId && selection.productId) {
      // From sessions (on product settings) -> go to client settings page
      if (!selection.sessionId) {
        router.toClientSettings(selection.clientId);
      } else {
        router.toProductSettings(selection.clientId, selection.productId);
      }
    } else if (view === 'products' && selection.clientId) {
      // From products -> go to studio sessions view
      setView('clientSessions', { pushHistory: false });
    } else if (view === 'clientSessions' && selection.clientId) {
      // From studio sessions -> go home (clients list)
      router.home();
    } else {
      // Default: go home
      router.home();
    }

    // Update local state (history tracking)
    setHistory((stack) => {
      if (stack.length === 0) {
        return stack;
      }
      return stack.slice(0, -1);
    });
  }, [view, selection, router, setView]);

  const emit = useCallback((event: string, payload?: unknown) => {
    const listeners = listenersRef.current.get(event);
    if (!listeners) return;
    listeners.forEach((listener) => listener(payload));
  }, []);

  const subscribe = useCallback((event: string, listener: EventListener) => {
    const bucket = listenersRef.current.get(event) ?? new Set<EventListener>();
    bucket.add(listener);
    listenersRef.current.set(event, bucket);

    return () => {
      const listeners = listenersRef.current.get(event);
      if (!listeners) return;
      listeners.delete(listener);
      if (listeners.size === 0) {
        listenersRef.current.delete(event);
      }
    };
  }, []);

  const closeDrawer = useCallback(() => setIsOpen(false), [setIsOpen]);
  const openDrawer = useCallback(() => setIsOpen(true), [setIsOpen]);

  const events = useMemo(
    () => ({
      emit,
      subscribe,
    }),
    [emit, subscribe]
  );

  const shell: NavShellControls = useMemo(
    () => ({
      closeDrawer,
      openDrawer,
      setView: (nextView) => setView(nextView),
      setSelection,
      resetSelections,
      goBack,
      canGoBack: view !== 'clients' || history.length > 0,
      events,
    }),
    [closeDrawer, openDrawer, setView, setSelection, resetSelections, goBack, view, history.length, events]
  );

  return {
    view,
    setView,
    selection,
    setSelection,
    resetSelections,
    goBack,
    canGoBack: shell.canGoBack,
    isOpen,
    openDrawer,
    closeDrawer,
    isMobile,
    keyboard: {
      focusedIndex: keyboard.focusedIndex,
      listItemRefs: keyboard.listItemRefs,
      handleKeyDown: keyboard.handleKeyDown,
    },
    shell,
  };
}
