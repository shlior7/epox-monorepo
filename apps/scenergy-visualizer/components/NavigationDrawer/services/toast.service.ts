import { useMemo } from 'react';
import { useToast, type ToastAction } from '@/lib/hooks/useToast';

export interface ToastService {
  success: (message: string, options?: { duration?: number; action?: ToastAction }) => void;
  error: (message: string, options?: { duration?: number; action?: ToastAction }) => void;
  warning: (message: string, options?: { duration?: number; action?: ToastAction }) => void;
  info: (message: string, options?: { duration?: number; action?: ToastAction }) => void;
}

export function useToastService(): ToastService {
  const { success, error, warning, info } = useToast();

  return useMemo(
    () => ({
      success,
      error,
      warning,
      info,
    }),
    [success, error, warning, info]
  );
}
