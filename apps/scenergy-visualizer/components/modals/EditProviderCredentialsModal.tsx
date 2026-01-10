'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import { commonStyles, colors } from '@/lib/styles/common-styles';
import { buildTestId } from '@/lib/utils/test-ids';
import type { CommerceProvider } from '@/lib/types/app-types';

interface EditProviderCredentialsModalProps {
  isOpen: boolean;
  clientId: string;
  currentProvider?: CommerceProvider;
  currentBaseUrl?: string;
  onClose: () => void;
  onSave: () => void;
}

const styles = {
  ...commonStyles.modal,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: `1px solid ${colors.slate[700]}`,
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.slate[100],
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  body: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
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
    padding: '12px 14px',
    backgroundColor: colors.slate[900],
    border: `1px solid ${colors.slate[600]}`,
    borderRadius: '8px',
    color: colors.slate[100],
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '12px 14px',
    backgroundColor: colors.slate[900],
    border: `1px solid ${colors.slate[600]}`,
    borderRadius: '8px',
    color: colors.slate[100],
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  hint: {
    fontSize: '12px',
    color: colors.slate[400],
    marginTop: '4px',
  },
  statusBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  successBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: `1px solid ${colors.green[700]}`,
    color: colors.green[400],
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: `1px solid ${colors.red[700]}`,
    color: colors.red[400],
  },
  footer: {
    padding: '20px',
    borderTop: `1px solid ${colors.slate[700]}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
};

export function EditProviderCredentialsModal({
  isOpen,
  clientId,
  currentProvider,
  currentBaseUrl,
  onClose,
  onSave,
}: EditProviderCredentialsModalProps) {
  const [provider, setProvider] = useState<CommerceProvider>(currentProvider || 'woocommerce');
  const [baseUrl, setBaseUrl] = useState(currentBaseUrl || '');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProvider(currentProvider || 'woocommerce');
      setBaseUrl(currentBaseUrl || '');
      setConsumerKey('');
      setConsumerSecret('');
      setTestResult(null);
    }
  }, [isOpen, currentProvider, currentBaseUrl]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!baseUrl || !consumerKey || !consumerSecret) {
      setTestResult({ success: false, message: 'Please fill in all credential fields' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/provider/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          credentials: {
            baseUrl,
            consumerKey,
            consumerSecret,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({ success: true, message: 'Connection successful! Credentials are valid.' });
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to test connection' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!baseUrl || !consumerKey || !consumerSecret) {
      setTestResult({ success: false, message: 'Please fill in all credential fields' });
      return;
    }

    setIsSaving(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/provider/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          provider,
          credentials: {
            baseUrl,
            consumerKey,
            consumerSecret,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({ success: true, message: 'Credentials saved successfully!' });
        setTimeout(() => {
          onSave();
          onClose();
        }, 1000);
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to save credentials' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to save credentials' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      data-testid={buildTestId('edit-credentials-modal', 'overlay')}
    >
      <div
        style={{ ...styles.content, maxWidth: '500px' }}
        onClick={(e) => e.stopPropagation()}
        data-testid={buildTestId('edit-credentials-modal', 'content')}
      >
        <div style={styles.header}>
          <div style={styles.title}>
            <ShoppingCart style={{ width: '24px', height: '24px', color: colors.indigo[400] }} />
            Commerce Provider Settings
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            style={{ ...commonStyles.button.icon, color: colors.slate[400] }}
            data-testid={buildTestId('edit-credentials-modal', 'close-button')}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as CommerceProvider)}
              style={styles.select}
              disabled={isSaving}
              data-testid={buildTestId('edit-credentials-modal', 'provider-select')}
            >
              <option value="woocommerce">WooCommerce</option>
            </select>
          </div>

          {provider === 'woocommerce' && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>Store URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://yourstore.com"
                  style={styles.input}
                  disabled={isSaving}
                  onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                  onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                  data-testid={buildTestId('edit-credentials-modal', 'base-url-input')}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Consumer Key</label>
                <input
                  type="text"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  style={styles.input}
                  disabled={isSaving}
                  onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                  onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                  data-testid={buildTestId('edit-credentials-modal', 'consumer-key-input')}
                />
                <p style={styles.hint}>Found in WooCommerce → Settings → Advanced → REST API</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Consumer Secret</label>
                <input
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  style={styles.input}
                  disabled={isSaving}
                  onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                  onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                  data-testid={buildTestId('edit-credentials-modal', 'consumer-secret-input')}
                />
              </div>
            </>
          )}

          {testResult && (
            <div
              style={{
                ...styles.statusBanner,
                ...(testResult.success ? styles.successBanner : styles.errorBanner),
              }}
            >
              {testResult.success ? (
                <CheckCircle style={{ width: '20px', height: '20px' }} />
              ) : (
                <AlertCircle style={{ width: '20px', height: '20px' }} />
              )}
              {testResult.message}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            onClick={handleTestConnection}
            disabled={isTesting || isSaving || !baseUrl || !consumerKey || !consumerSecret}
            style={{
              ...commonStyles.button.secondary,
              opacity: isTesting || !baseUrl || !consumerKey || !consumerSecret ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            data-testid={buildTestId('edit-credentials-modal', 'test-button')}
          >
            {isTesting && <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />}
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleClose}
            disabled={isSaving}
            style={commonStyles.button.secondary}
            data-testid={buildTestId('edit-credentials-modal', 'cancel-button')}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !baseUrl || !consumerKey || !consumerSecret}
            style={{
              ...commonStyles.button.primary,
              opacity: isSaving || !baseUrl || !consumerKey || !consumerSecret ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            data-testid={buildTestId('edit-credentials-modal', 'save-button')}
          >
            {isSaving && <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />}
            {isSaving ? 'Saving...' : 'Save Credentials'}
          </button>
        </div>
      </div>
    </div>
  );
}
