import { renderHook, act } from '@testing-library/react';
import { useNavigationState } from '../../hooks/useNavigationState';

describe('useNavigationState', () => {
  it('initializes with clients view when no active IDs', () => {
    const { result } = renderHook(() => useNavigationState(null, null, null, null));

    expect(result.current.view).toBe('clients');
    expect(result.current.selectedClientId).toBeNull();
    expect(result.current.selectedProductId).toBeNull();
  });

  it('sets view to products when activeClientId is provided', () => {
    const { result } = renderHook(() => useNavigationState('client-1', null, null, null));

    expect(result.current.view).toBe('products');
    expect(result.current.selectedClientId).toBe('client-1');
  });

  it('sets view to sessions when activeProductId and activeSessionId are provided', () => {
    const { result } = renderHook(() => useNavigationState('client-1', 'product-1', 'session-1', null));

    expect(result.current.view).toBe('sessions');
    expect(result.current.selectedClientId).toBe('client-1');
    expect(result.current.selectedProductId).toBe('product-1');
  });

  it('sets view to clientSessions when activeClientSessionId is provided', () => {
    const { result } = renderHook(() => useNavigationState('client-1', null, null, 'client-session-1'));

    expect(result.current.view).toBe('clientSessions');
  });

  it('resets bulk delete mode when view changes', () => {
    const { result, rerender } = renderHook(({ clientId }) => useNavigationState(clientId, null, null, null), {
      initialProps: { clientId: null as string | null },
    });

    act(() => {
      result.current.setIsBulkDeleteMode(true);
      result.current.setSelectedForDelete(new Set(['item-1']));
    });

    rerender({ clientId: 'client-1' });

    expect(result.current.isBulkDeleteMode).toBe(false);
    expect(result.current.selectedForDelete.size).toBe(0);
  });

  it('resets all selection states', () => {
    const { result } = renderHook(() => useNavigationState(null, null, null, null));

    act(() => {
      result.current.setIsBulkDeleteMode(true);
      result.current.setSelectedForDelete(new Set(['item-1']));
      result.current.setIsSelectingProducts(true);
      result.current.setSelectedProducts(new Set(['product-1']));
    });

    act(() => {
      result.current.resetSelectionStates();
    });

    expect(result.current.isBulkDeleteMode).toBe(false);
    expect(result.current.selectedForDelete.size).toBe(0);
    expect(result.current.isSelectingProducts).toBe(false);
    expect(result.current.selectedProducts.size).toBe(0);
  });
});
