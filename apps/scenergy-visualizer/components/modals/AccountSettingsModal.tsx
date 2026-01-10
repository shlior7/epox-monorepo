'use client';

import React from 'react';
import { LogOut, Settings, X } from 'lucide-react';
import { colors } from '@/lib/styles/common-styles';
import { Portal, Z_INDEX } from '../common/Portal';
import { buildTestId } from '@/lib/utils/test-ids';
import type { AppRole } from '@/lib/auth/roles';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  name?: string | null;
  email?: string | null;
  role?: AppRole | null;
  organizationId?: string | null;
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
    maxWidth: '520px',
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
    fontSize: '18px',
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
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  infoCard: {
    backgroundColor: colors.slate[900],
    borderRadius: '10px',
    border: `1px solid ${colors.slate[700]}`,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  infoRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: colors.slate[400],
  },
  infoValue: {
    fontSize: '14px',
    color: colors.slate[100],
    wordBreak: 'break-all' as const,
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  button: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  closeButtonSecondary: {
    backgroundColor: colors.slate[700],
    color: colors.slate[100],
  },
  signOutButton: {
    backgroundColor: colors.red[600],
    color: '#ffffff',
  },
  emptyText: {
    color: colors.slate[400],
    fontSize: '13px',
  },
};

export function AccountSettingsModal({
  isOpen,
  onClose,
  onSignOut,
  name,
  email,
  role,
  organizationId,
}: AccountSettingsModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <Portal>
      <div style={styles.overlay} onClick={handleOverlayClick} data-testid={buildTestId('account-settings-modal', 'overlay')}>
        <div style={styles.modal} onClick={(event) => event.stopPropagation()} data-testid={buildTestId('account-settings-modal', 'content')}>
          <div style={styles.header}>
            <h2 style={styles.title}>
              <Settings size={18} />
              Account Settings
            </h2>
            <button style={styles.closeButton} onClick={onClose} aria-label="Close" type="button" data-testid={buildTestId('account-settings-modal', 'close-button')}>
              <X size={18} />
            </button>
          </div>

          <div style={styles.content}>
            <div style={styles.infoCard}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Name</span>
                <span style={styles.infoValue}>{name || email || 'Unknown user'}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Email</span>
                <span style={styles.infoValue}>{email || 'Not available'}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Role</span>
                <span style={styles.infoValue}>{role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Organization</span>
                <span style={styles.infoValue}>{organizationId || <span style={styles.emptyText}>Not set</span>}</span>
              </div>
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                style={{ ...styles.button, ...styles.closeButtonSecondary }}
                onClick={onClose}
                data-testid={buildTestId('account-settings-modal', 'close-action')}
              >
                Close
              </button>
              <button
                type="button"
                style={{ ...styles.button, ...styles.signOutButton }}
                onClick={onSignOut}
                data-testid={buildTestId('account-settings-modal', 'sign-out-button')}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
