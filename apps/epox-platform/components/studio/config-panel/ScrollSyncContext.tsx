'use client';

import { createContext, useContext, type ReactNode, type RefObject } from 'react';

// ===== CONTEXT TYPE =====

export interface ScrollSyncContextValue {
  /**
   * Currently active (most visible) scene type
   */
  activeSceneType: string | null;
  /**
   * Scroll to a specific scene type in the main view
   */
  scrollToSceneType: (sceneType: string) => void;
  /**
   * Whether we're currently scrolling programmatically
   */
  isScrolling: boolean;
  /**
   * Ref to attach to the scrollable container
   */
  containerRef: RefObject<HTMLElement>;
}

// ===== CONTEXT =====

const ScrollSyncContext = createContext<ScrollSyncContextValue | null>(null);

// ===== PROVIDER =====

export interface ScrollSyncProviderProps {
  children: ReactNode;
  value: ScrollSyncContextValue;
}

export function ScrollSyncProvider({ children, value }: ScrollSyncProviderProps) {
  return (
    <ScrollSyncContext.Provider value={value}>
      {children}
    </ScrollSyncContext.Provider>
  );
}

// ===== HOOKS =====

export function useScrollSyncContext(): ScrollSyncContextValue {
  const context = useContext(ScrollSyncContext);
  if (!context) {
    throw new Error('useScrollSyncContext must be used within a ScrollSyncProvider');
  }
  return context;
}

export function useScrollSyncContextOptional(): ScrollSyncContextValue | null {
  return useContext(ScrollSyncContext);
}
