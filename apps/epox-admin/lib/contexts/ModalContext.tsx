'use client';

import { createContext, useContext } from 'react';

interface ModalContextType {
  openBulkAddProductsModal: (clientId: string) => void;
  openAddProductsModal: (clientId: string) => void;
  openImportFromProviderModal: (clientId: string) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModalHandlers() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalHandlers must be used within ModalProvider');
  }
  return context;
}

export function ModalProvider({ children, handlers }: { children: React.ReactNode; handlers: ModalContextType }) {
  return <ModalContext.Provider value={handlers}>{children}</ModalContext.Provider>;
}
