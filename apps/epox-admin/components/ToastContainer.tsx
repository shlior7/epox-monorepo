// Toast container component displays all active toasts

'use client';

import React from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import styles from './ToastContainer.module.scss';
import { buildTestId } from '@/lib/utils/test-ids';

const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div className={styles.container} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.type];

        return (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`} role="alert">
            <Icon className={styles.icon} size={20} />
            <span className={styles.message}>{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  dismiss(toast.id);
                }}
                className={styles.actionButton}
                data-testid={buildTestId('toast', toast.id, 'action')}
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(toast.id)}
              className={styles.closeButton}
              aria-label="Dismiss"
              data-testid={buildTestId('toast', toast.id, 'dismiss')}
            >
              <X size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
