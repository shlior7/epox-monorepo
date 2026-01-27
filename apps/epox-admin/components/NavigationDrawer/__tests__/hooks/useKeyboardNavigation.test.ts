import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  const mockSetIsOpen = vi.fn();

  beforeEach(() => {
    mockSetIsOpen.mockReset();
  });

  const createKeyboardEvent = (key: string) => {
    const event = new KeyboardEvent('keydown', { key });
    Object.defineProperty(event, 'preventDefault', {
      value: vi.fn(),
      writable: false,
    });
    return event as KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> };
  };

  it('initializes with focusedIndex 0', () => {
    const { result } = renderHook(() => useKeyboardNavigation(false, mockSetIsOpen));

    expect(result.current.focusedIndex).toBe(0);
  });

  it('handles ArrowDown key', () => {
    const { result } = renderHook(() => useKeyboardNavigation(false, mockSetIsOpen));
    const event = createKeyboardEvent('ArrowDown');

    act(() => {
      result.current.handleKeyDown(event, 5);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.focusedIndex).toBe(1);
  });

  it('handles ArrowUp key', () => {
    const { result } = renderHook(() => useKeyboardNavigation(false, mockSetIsOpen));

    act(() => {
      result.current.setFocusedIndex(2);
    });

    const event = createKeyboardEvent('ArrowUp');

    act(() => {
      result.current.handleKeyDown(event, 5);
    });

    expect(result.current.focusedIndex).toBe(1);
  });

  it('handles Home key', () => {
    const { result } = renderHook(() => useKeyboardNavigation(false, mockSetIsOpen));

    act(() => {
      result.current.setFocusedIndex(3);
    });

    const event = createKeyboardEvent('Home');

    act(() => {
      result.current.handleKeyDown(event, 5);
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  it('handles End key', () => {
    const { result } = renderHook(() => useKeyboardNavigation(false, mockSetIsOpen));
    const event = createKeyboardEvent('End');

    act(() => {
      result.current.handleKeyDown(event, 5);
    });

    expect(result.current.focusedIndex).toBe(4);
  });

  it('closes drawer on Escape key when mobile', () => {
    const { result } = renderHook(() => useKeyboardNavigation(true, mockSetIsOpen));
    const event = createKeyboardEvent('Escape');

    act(() => {
      result.current.handleKeyDown(event, 5);
    });

    expect(mockSetIsOpen).toHaveBeenCalledWith(false);
  });

  it('does not exceed bounds when navigating down', () => {
    const { result } = renderHook(() => useKeyboardNavigation(false, mockSetIsOpen));

    act(() => {
      result.current.setFocusedIndex(4);
    });

    const event = createKeyboardEvent('ArrowDown');

    act(() => {
      result.current.handleKeyDown(event, 5);
    });

    expect(result.current.focusedIndex).toBe(4);
  });

  it('does not go below 0 when navigating up', () => {
    const { result } = renderHook(() => useKeyboardNavigation(false, mockSetIsOpen));
    const event = createKeyboardEvent('ArrowUp');

    act(() => {
      result.current.handleKeyDown(event, 5);
    });

    expect(result.current.focusedIndex).toBe(0);
  });
});
