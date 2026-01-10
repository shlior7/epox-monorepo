'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useData } from '@/lib/contexts/DataContext';
import { colors } from '@/lib/styles/common-styles';
import { Portal, Z_INDEX } from '../common/Portal';
import { buildTestId } from '@/lib/utils/test-ids';
import type { CommerceProvider, CreateClientPayload } from '@/lib/types/app-types';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded?: (clientId: string) => void;
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
    maxWidth: '480px',
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
    fontSize: '20px',
    fontWeight: 600,
    color: colors.slate[100],
    margin: 0,
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
    fontSize: '14px',
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
  textarea: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: colors.slate[900],
    border: `1px solid ${colors.slate[600]}`,
    borderRadius: '8px',
    color: colors.slate[100],
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    minHeight: '80px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    paddingTop: '16px',
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
};

export function AddClientModal({ isOpen, onClose, onClientAdded }: AddClientModalProps) {
  const { addClient } = useData();
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<CommerceProvider>('none');
  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedClientId = clientId.trim().toLowerCase();
    if (!normalizedClientId) {
      alert('Please enter a client ID');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(normalizedClientId)) {
      alert('Client ID must be lowercase letters, numbers, and dashes only.');
      return;
    }

    if (!name.trim()) {
      alert('Please enter a client name');
      return;
    }

    if (provider === 'woocommerce') {
      if (!storeUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()) {
        alert('Please enter the WooCommerce store URL, consumer key, and consumer secret');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: CreateClientPayload = {
        clientId: normalizedClientId,
        name: name.trim(),
        description: description.trim() || undefined,
        commerce:
          provider === 'woocommerce'
            ? {
              provider,
              baseUrl: storeUrl.trim(),
              credentials: {
                consumerKey: consumerKey.trim(),
                consumerSecret: consumerSecret.trim(),
              },
            }
            : undefined,
      };

      const { client: createdClient, credentials } = await addClient(payload);

      if (credentials) {
        alert(`Client user created.\nLogin: ${credentials.email}\nPassword: ${credentials.password}`);
      }

      onClientAdded?.(createdClient.id);

      setClientId('');
      setName('');
      setDescription('');
      setStoreUrl('');
      setConsumerKey('');
      setConsumerSecret('');
      onClose();
    } catch (error) {
      console.error('Failed to add client:', error);
      alert('Failed to add client. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setClientId('');
      setName('');
      setDescription('');
      setStoreUrl('');
      setConsumerKey('');
      setConsumerSecret('');
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <Portal>
      <div style={styles.overlay} onClick={handleOverlayClick} data-testid={buildTestId('add-client-modal', 'overlay')}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h2 style={styles.title}>Add New Client</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              style={styles.closeButton}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              data-testid={buildTestId('add-client-modal', 'close-button')}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label htmlFor="clientId" style={styles.label}>
                Client ID *
              </label>
              <input
                id="clientId"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g., acme-co"
                required
                style={styles.input}
                onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                data-testid={buildTestId('add-client-modal', 'client-id-input')}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="clientName" style={styles.label}>
                Client Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Example Client"
                required
                style={styles.input}
                onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                data-testid={buildTestId('add-client-modal', 'name-input')}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="clientDescription" style={styles.label}>
                Description (Optional)
              </label>
              <textarea
                id="clientDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                rows={3}
                style={styles.textarea}
                onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                data-testid={buildTestId('add-client-modal', 'description-input')}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="clientProvider" style={styles.label}>
                Commerce Provider
              </label>
              <select
                id="clientProvider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as CommerceProvider)}
                style={styles.input}
                data-testid={buildTestId('add-client-modal', 'provider-select')}
              >
                <option value="none">--------</option>
                <option value="woocommerce">WooCommerce</option>
              </select>
            </div>

            {provider === 'woocommerce' && (
              <>
                <div style={styles.formGroup}>
                  <label htmlFor="woocommerceUrl" style={styles.label}>
                    Store URL *
                  </label>
                  <input
                    id="woocommerceUrl"
                    type="url"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="https://yourstore.com"
                    required
                    style={styles.input}
                    onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                    onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                    data-testid={buildTestId('add-client-modal', 'woocommerce-url-input')}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label htmlFor="woocommerceConsumerKey" style={styles.label}>
                    Consumer Key *
                  </label>
                  <input
                    id="woocommerceConsumerKey"
                    type="text"
                    value={consumerKey}
                    onChange={(e) => setConsumerKey(e.target.value)}
                    placeholder="ck_..."
                    required
                    style={styles.input}
                    onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                    onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                    data-testid={buildTestId('add-client-modal', 'woocommerce-consumer-key-input')}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label htmlFor="woocommerceConsumerSecret" style={styles.label}>
                    Consumer Secret *
                  </label>
                  <input
                    id="woocommerceConsumerSecret"
                    type="password"
                    value={consumerSecret}
                    onChange={(e) => setConsumerSecret(e.target.value)}
                    placeholder="cs_..."
                    required
                    style={styles.input}
                    onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                    onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                    data-testid={buildTestId('add-client-modal', 'woocommerce-consumer-secret-input')}
                  />
                </div>
              </>
            )}

            <div style={styles.actions}>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                style={{ ...styles.button, ...styles.cancelButton }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[600])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
                data-testid={buildTestId('add-client-modal', 'cancel-button')}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ ...styles.button, ...styles.submitButton }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.indigo[700])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.indigo[600])}
                data-testid={buildTestId('add-client-modal', 'submit-button')}
              >
                {isSubmitting ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
