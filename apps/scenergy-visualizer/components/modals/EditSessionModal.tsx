'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { commonStyles, colors } from '@/lib/styles/common-styles';
import { Portal } from '../common/Portal';
import { buildTestId } from '@/lib/utils/test-ids';

interface EditSessionModalProps {
  isOpen: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void> | void;
}

const styles = {
  overlay: {
    ...commonStyles.modal.overlay,
  } as React.CSSProperties,
  content: {
    ...commonStyles.modal.content,
    maxWidth: '420px',
  } as React.CSSProperties,
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
  },
  body: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.slate[300],
  },
  footer: {
    padding: '16px',
    borderTop: `1px solid ${colors.slate[700]}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
};

export function EditSessionModal({ isOpen, initialName, onClose, onSave }: EditSessionModalProps) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('session info modal', { isOpen, initialName });
    if (isOpen) {
      setName(initialName);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Session name is required.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave(name.trim());
      onClose();
    } catch (err) {
      console.error('Failed to update session:', err);
      setError('Failed to update session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Portal>
      <div style={styles.overlay} onClick={onClose} data-testid={buildTestId('edit-session-modal', 'overlay')}>
        <div style={styles.content} onClick={(e) => e.stopPropagation()} data-testid={buildTestId('edit-session-modal', 'content')}>
          <form onSubmit={handleSubmit}>
            <div style={styles.header}>
              <h2 style={styles.title}>Edit Session</h2>
              <button
                type="button"
                onClick={onClose}
                style={{ ...commonStyles.button.icon, color: colors.slate[400] }}
                data-testid={buildTestId('edit-session-modal', 'close-button')}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={styles.body}>
              <label htmlFor="sessionName" style={styles.label}>
                Session Name
              </label>
              <input
                id="sessionName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={commonStyles.input.base}
                placeholder="Enter session name"
                required
                data-testid={buildTestId('edit-session-modal', 'name-input')}
              />
              {error && <span style={{ color: colors.red[600], fontSize: '13px' }}>{error}</span>}
            </div>

            <div style={styles.footer}>
              <button
                type="button"
                onClick={onClose}
                style={commonStyles.button.secondary}
                data-testid={buildTestId('edit-session-modal', 'cancel-button')}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={commonStyles.button.primary}
                disabled={isSaving}
                data-testid={buildTestId('edit-session-modal', 'save-button')}
              >
                {isSaving ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
