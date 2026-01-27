'use client';

import React, { useState } from 'react';
import { X, LogIn } from 'lucide-react';
import { authClient } from 'visualizer-auth/client';
import { colors } from '@/lib/styles/common-styles';
import { Portal, Z_INDEX } from '../common/Portal';
import { buildTestId } from '@/lib/utils/test-ids';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
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
    maxWidth: '420px',
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
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.slate[300],
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: colors.slate[900],
    border: `1px solid ${colors.slate[600]}`,
    borderRadius: '8px',
    color: colors.slate[100],
    fontSize: '14px',
    outline: 'none',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: colors.slate[300],
    fontSize: '13px',
  },
  checkbox: {
    accentColor: colors.indigo[500],
  },
  errorMessage: {
    color: colors.red[400],
    fontSize: '13px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: `1px solid ${colors.red[600]}`,
    padding: '8px 10px',
    borderRadius: '8px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    paddingTop: '8px',
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
  },
  cancelButton: {
    backgroundColor: colors.slate[700],
    color: colors.slate[100],
  },
  submitButton: {
    backgroundColor: colors.indigo[600],
    color: '#ffffff',
  },
  helperText: {
    fontSize: '12px',
    color: colors.slate[400],
  },
};

export function SignInModal({ isOpen, onClose, onSignedIn }: SignInModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = (force = false) => {
    if (isSubmitting && !force) return;
    setEmail('');
    setPassword('');
    setRememberMe(true);
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const signIn = (
        authClient as typeof authClient & {
          signIn?: { email?: (payload: { email: string; password: string; rememberMe?: boolean }) => Promise<any> };
        }
      ).signIn?.email;

      if (!signIn) {
        throw new Error('Auth client is not configured for email sign-in.');
      }

      const response = await signIn({ email: trimmedEmail, password, rememberMe });
      if (response?.error) {
        setErrorMessage(response.error?.message ?? 'Sign in failed. Please try again.');
        return;
      }

      onSignedIn?.();
      handleClose(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  return (
    <Portal>
      <div style={styles.overlay} onClick={handleOverlayClick} data-testid={buildTestId('sign-in-modal', 'overlay')}>
        <div style={styles.modal} onClick={(event) => event.stopPropagation()} data-testid={buildTestId('sign-in-modal', 'content')}>
          <div style={styles.header}>
            <h2 style={styles.title}>
              <LogIn size={18} />
              Sign In
            </h2>
            <button
              style={styles.closeButton}
              onClick={() => handleClose()}
              aria-label="Close"
              type="button"
              data-testid={buildTestId('sign-in-modal', 'close-button')}
            >
              <X size={18} />
            </button>
          </div>

          <form style={styles.form} onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="sign-in-email">
                Email
              </label>
              <input
                id="sign-in-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={styles.input}
                placeholder="you@example.com"
                data-testid={buildTestId('sign-in-modal', 'email-input')}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="sign-in-password">
                Password
              </label>
              <input
                id="sign-in-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={styles.input}
                placeholder="Enter your password"
                data-testid={buildTestId('sign-in-modal', 'password-input')}
              />
            </div>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                style={styles.checkbox}
                data-testid={buildTestId('sign-in-modal', 'remember-me')}
              />
              Keep me signed in
            </label>

            {errorMessage && (
              <div style={styles.errorMessage} data-testid={buildTestId('sign-in-modal', 'error')}>
                {errorMessage}
              </div>
            )}

            <p style={styles.helperText}>Need access? Ask your admin to invite you.</p>

            <div style={styles.actions}>
              <button
                type="button"
                style={{ ...styles.button, ...styles.cancelButton }}
                onClick={() => handleClose()}
                disabled={isSubmitting}
                data-testid={buildTestId('sign-in-modal', 'cancel-button')}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ ...styles.button, ...styles.submitButton }}
                disabled={isSubmitting}
                data-testid={buildTestId('sign-in-modal', 'submit-button')}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
