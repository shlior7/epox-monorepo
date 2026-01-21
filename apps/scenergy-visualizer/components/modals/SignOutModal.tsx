'use client';

import React, { useState } from 'react';
import { LogOut, X } from 'lucide-react';
import { colors } from '@/lib/styles/common-styles';
import { Portal, Z_INDEX } from '../common/Portal';
import { buildTestId } from '@/lib/utils/test-ids';

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignedOut?: () => void;
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX.MODAL,
    padding: '16px',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: colors.slate[800],
    borderRadius: '12px',
    width: '100%',
    maxWidth: '360px',
    border: `1px solid ${colors.slate[700]}`,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: `1px solid ${colors.slate[700]}`,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.slate[100],
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  closeButton: {
    padding: '6px',
    backgroundColor: 'transparent',
    color: colors.slate[300],
    borderRadius: '6px',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
  },
  content: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  message: {
    fontSize: '14px',
    color: colors.slate[300],
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  button: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
  },
  cancelButton: {
    backgroundColor: colors.slate[700],
    color: colors.slate[100],
  },
  signOutButton: {
    backgroundColor: colors.red[600],
    color: '#ffffff',
  },
};

export function SignOutModal({ isOpen, onClose, onSignedOut }: SignOutModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? 'Failed to sign out.');
      }
      onSignedOut?.();
      onClose();
    } catch (error) {
      console.error('Failed to sign out:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <Portal>
      <div style={styles.overlay} onClick={handleOverlayClick} data-testid={buildTestId('sign-out-modal', 'overlay')}>
        <div style={styles.modal} onClick={(event) => event.stopPropagation()} data-testid={buildTestId('sign-out-modal', 'content')}>
          <div style={styles.header}>
            <h2 style={styles.title}>
              <LogOut size={16} />
              Sign Out
            </h2>
            <button
              style={styles.closeButton}
              onClick={onClose}
              aria-label="Close"
              type="button"
              data-testid={buildTestId('sign-out-modal', 'close-button')}
            >
              <X size={16} />
            </button>
          </div>
          <div style={styles.content}>
            <p style={styles.message}>Are you sure you want to sign out?</p>
            <div style={styles.actions}>
              <button
                type="button"
                style={{ ...styles.button, ...styles.cancelButton }}
                onClick={onClose}
                disabled={isSubmitting}
                data-testid={buildTestId('sign-out-modal', 'cancel-button')}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ ...styles.button, ...styles.signOutButton }}
                onClick={handleSignOut}
                disabled={isSubmitting}
                data-testid={buildTestId('sign-out-modal', 'confirm-button')}
              >
                {isSubmitting ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
