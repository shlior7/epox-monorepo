// Toast notification system with auto-dismiss and action buttons

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  action?: ToastAction;
}

interface ToastStore {
  toasts: Toast[];
  success: (message: string, options?: { duration?: number; action?: ToastAction }) => void;
  error: (message: string, options?: { action?: ToastAction; duration?: number }) => void;
  warning: (message: string, options?: { action?: ToastAction; duration?: number }) => void;
  info: (message: string, options?: { duration?: number; action?: ToastAction }) => void;
  dismiss: (id: string) => void;
}

const MAX_TOASTS = 5;

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],

  success: (message, { duration = 3000, action } = {}) => {
    const id = crypto.randomUUID();
    set((state) => {
      const newToasts: Toast[] = [...state.toasts, { id, type: 'success' as ToastType, message, duration, action }];
      return { toasts: newToasts.slice(-MAX_TOASTS) };
    });
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  error: (message, { action, duration = 5000 } = {}) => {
    const id = crypto.randomUUID();
    set((state) => {
      const newToasts: Toast[] = [...state.toasts, { id, type: 'error' as ToastType, message, duration, action }];
      return { toasts: newToasts.slice(-MAX_TOASTS) };
    });
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  warning: (message, { action, duration = 5000 } = {}) => {
    const id = crypto.randomUUID();
    set((state) => {
      const newToasts: Toast[] = [...state.toasts, { id, type: 'warning' as ToastType, message, duration, action }];
      return { toasts: newToasts.slice(-MAX_TOASTS) };
    });
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  info: (message, { duration = 4000, action } = {}) => {
    const id = crypto.randomUUID();
    set((state) => {
      const newToasts: Toast[] = [...state.toasts, { id, type: 'info' as ToastType, message, duration, action }];
      return { toasts: newToasts.slice(-MAX_TOASTS) };
    });
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
