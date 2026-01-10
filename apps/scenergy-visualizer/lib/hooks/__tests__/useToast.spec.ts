// Build toast notification system with auto-dismiss and undo actions

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset zustand store between tests
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toasts.forEach((toast: { id: string }) => result.current.dismiss(toast.id));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display success toast with auto-dismiss', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Client created');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: 'success',
      message: 'Client created',
      duration: 3000,
    });

    // Auto-dismiss after duration
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should display error toast with retry action', () => {
    const { result } = renderHook(() => useToast());
    const onRetry = vi.fn();

    act(() => {
      result.current.error('Upload failed', { action: { label: 'Retry', onClick: onRetry } });
    });

    expect(result.current.toasts[0].action).toBeDefined();

    act(() => {
      result.current.toasts[0].action!.onClick();
    });

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('should support undo for destructive actions', () => {
    const { result } = renderHook(() => useToast());
    const onUndo = vi.fn();

    act(() => {
      result.current.warning('Client deleted', {
        action: { label: 'Undo', onClick: onUndo },
        duration: 8000,
      });
    });

    expect(result.current.toasts[0].duration).toBe(8000);
    expect(result.current.toasts[0].action?.label).toBe('Undo');
  });

  it('should dismiss toast manually', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.info('Some info');
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should stack multiple toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('First');
      result.current.info('Second');
      result.current.warning('Third');
    });

    expect(result.current.toasts).toHaveLength(3);
  });

  it('should limit toast stack to 5 items', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      for (let i = 0; i < 7; i++) {
        result.current.info(`Toast ${i}`);
      }
    });

    expect(result.current.toasts).toHaveLength(5);
  });
});
