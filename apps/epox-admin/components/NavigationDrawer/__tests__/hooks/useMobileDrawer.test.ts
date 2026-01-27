import { renderHook, act } from '@testing-library/react';
import { useMobileDrawer } from '../../hooks/useMobileDrawer';

describe('useMobileDrawer', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('initializes with closed drawer', () => {
    const { result } = renderHook(() => useMobileDrawer());

    expect(result.current.isOpen).toBe(false);
  });

  it('detects desktop viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
    });

    const { result } = renderHook(() => useMobileDrawer());

    expect(result.current.isMobile).toBe(false);
  });

  it('detects mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useMobileDrawer());

    expect(result.current.isMobile).toBe(true);
  });

  it('toggles drawer open state', () => {
    const { result } = renderHook(() => useMobileDrawer());

    act(() => {
      result.current.setIsOpen(true);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.setIsOpen(false);
    });

    expect(result.current.isOpen).toBe(false);
  });
});
