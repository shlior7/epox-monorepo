// Confirmation dialog component

'use client';

import React, { useEffect } from 'react';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { buildTestId } from '@/lib/utils/test-ids';
import styles from './ConfirmDialog.module.scss';

const ICON_MAP = {
  danger: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export const ConfirmDialog: React.FC = () => {
  const { dialog, isOpen, isProcessing, handleConfirm, handleCancel } = useConfirm();

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isProcessing, handleCancel]);

  if (!dialog) return null;

  const variant = dialog.variant || 'info';
  const Icon = ICON_MAP[variant];

  return (
    <>
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`}
        onClick={!isProcessing ? handleCancel : undefined}
        aria-hidden="true"
        data-testid={buildTestId('confirm-dialog', 'backdrop')}
      />

      <div
        className={`${styles.dialog} ${isOpen ? styles.dialogOpen : ''} ${styles[variant]}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <button
          className={styles.closeButton}
          onClick={handleCancel}
          disabled={isProcessing}
          aria-label="Close"
          data-testid={buildTestId('confirm-dialog', 'close-button')}
        >
          <X size={20} />
        </button>

        <div className={styles.iconWrapper}>
          <Icon className={styles.icon} size={32} />
        </div>

        <h2 id="confirm-title" className={styles.title}>
          {dialog.title}
        </h2>

        <p id="confirm-message" className={styles.message}>
          {dialog.message}
        </p>

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={handleCancel}
            disabled={isProcessing}
            data-testid={buildTestId('confirm-dialog', 'cancel-button')}
          >
            {dialog.cancelLabel || 'Cancel'}
          </button>
          <button
            className={`${styles.confirmButton} ${styles[`confirm${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`}
            onClick={handleConfirm}
            disabled={isProcessing}
            data-testid={buildTestId('confirm-dialog', 'confirm-button')}
            aria-busy={isProcessing}
          >
            {isProcessing ? 'Processing...' : dialog.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </>
  );
};
