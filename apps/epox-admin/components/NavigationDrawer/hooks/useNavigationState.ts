import { useEffect, useState } from 'react';
import type { NavigationView, MenuState } from '@/lib/types/app-types';

export interface NavigationState {
  view: NavigationView;
  setView: (view: NavigationView) => void;
  selectedClientId: string | null;
  setSelectedClientId: (clientId: string | null) => void;
  selectedProductId: string | null;
  setSelectedProductId: (productId: string | null) => void;
  menuOpen: MenuState | null;
  setMenuOpen: (menuState: MenuState | null | ((current: MenuState | null) => MenuState | null)) => void;
  isSelectingProducts: boolean;
  setIsSelectingProducts: (isSelecting: boolean) => void;
  selectedProducts: Set<string>;
  setSelectedProducts: (products: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  isBulkDeleteMode: boolean;
  setIsBulkDeleteMode: (isBulkDelete: boolean) => void;
  selectedForDelete: Set<string>;
  setSelectedForDelete: (items: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  actionMenuOpen: boolean;
  setActionMenuOpen: (isOpen: boolean) => void;
  resetSelectionStates: () => void;
}

export function useNavigationState(
  activeClientId: string | null,
  activeProductId: string | null,
  activeSessionId: string | null,
  activeClientSessionId: string | null
): NavigationState {
  const [view, setView] = useState<NavigationView>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<MenuState | null>(null);
  const [isSelectingProducts, setIsSelectingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  useEffect(() => {
    if (activeClientId) {
      setSelectedClientId(activeClientId);

      if (activeClientSessionId) {
        setView('clientSessions');
      } else if (activeProductId) {
        setSelectedProductId(activeProductId);
        setView(activeSessionId ? 'sessions' : 'products');
      } else {
        setView('products');
      }
    } else {
      setSelectedClientId(null);
      setSelectedProductId(null);
      setView('clients');
    }

    setIsBulkDeleteMode(false);
    setSelectedForDelete(new Set());
  }, [activeClientId, activeProductId, activeSessionId, activeClientSessionId]);

  const resetSelectionStates = () => {
    setIsBulkDeleteMode(false);
    setSelectedForDelete(new Set());
    setIsSelectingProducts(false);
    setSelectedProducts(new Set());
  };

  return {
    view,
    setView,
    selectedClientId,
    setSelectedClientId,
    selectedProductId,
    setSelectedProductId,
    menuOpen,
    setMenuOpen,
    isSelectingProducts,
    setIsSelectingProducts,
    selectedProducts,
    setSelectedProducts,
    isBulkDeleteMode,
    setIsBulkDeleteMode,
    selectedForDelete,
    setSelectedForDelete,
    actionMenuOpen,
    setActionMenuOpen,
    resetSelectionStates,
  };
}
