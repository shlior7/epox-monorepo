// Confirmation dialog system to replace window.confirm

import { create } from 'zustand';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialog {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmStore {
  dialog: ConfirmDialog | null;
  isOpen: boolean;
  isProcessing: boolean;
  confirm: (options: ConfirmDialog) => Promise<boolean>;
  close: () => void;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
}

export const useConfirm = create<ConfirmStore>((set, get) => ({
  dialog: null,
  isOpen: false,
  isProcessing: false,

  confirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        dialog: {
          ...options,
          onConfirm: async () => {
            await options.onConfirm();
            resolve(true);
          },
          onCancel: () => {
            options.onCancel?.();
            resolve(false);
          },
        },
        isOpen: true,
      });
    });
  },

  close: () => {
    set({ isOpen: false, isProcessing: false });
    // Clear dialog after animation
    setTimeout(() => {
      set({ dialog: null });
    }, 300);
  },

  handleConfirm: async () => {
    const { dialog, close } = get();
    if (!dialog) return;

    set({ isProcessing: true });
    try {
      await dialog.onConfirm();
      close();
    } catch (error) {
      console.error('Confirm action failed:', error);
      set({ isProcessing: false });
    }
  },

  handleCancel: () => {
    const { dialog, close } = get();
    if (!dialog) return;

    dialog.onCancel?.();
    close();
  },
}));
