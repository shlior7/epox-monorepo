'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { commonStyles, colors } from '@/lib/styles/common-styles';
import { useData } from '@/lib/contexts/DataContext';
import { Portal } from '../common/Portal';
import { buildTestId } from '@/lib/utils/test-ids';
import type { Product } from '@/lib/types/app-types';
import { ROOM_TYPES } from '@/components/SceneStudioView/constants';

interface EditProductSettingsModalProps {
  isOpen: boolean;
  product: Product;
  onClose: () => void;
  onSave: (updates: Partial<Product>) => Promise<void> | void;
}

const styles = {
  overlay: {
    ...commonStyles.modal.overlay,
  } as React.CSSProperties,
  content: {
    ...commonStyles.modal.content,
    maxWidth: '520px',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
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
    gap: '20px',
    maxHeight: '60vh',
    overflowY: 'auto' as const,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.slate[300],
  },
  input: {
    ...commonStyles.input.base,
    width: '100%',
  } as React.CSSProperties,
  textarea: {
    ...commonStyles.input.base,
    width: '100%',
    minHeight: '100px',
    resize: 'vertical' as const,
    lineHeight: 1.5,
    fontFamily: 'inherit',
  } as React.CSSProperties,
  select: {
    ...commonStyles.input.base,
    width: '100%',
    cursor: 'pointer',
  } as React.CSSProperties,
  footer: {
    padding: '16px 20px',
    borderTop: `1px solid ${colors.slate[700]}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  errorText: {
    color: colors.red[500],
    fontSize: '13px',
    marginTop: '4px',
  },
  helperText: {
    color: colors.slate[500],
    fontSize: '12px',
    marginTop: '2px',
  },
};

export function EditProductSettingsModal({ isOpen, product, onClose, onSave }: EditProductSettingsModalProps) {
  const { getClient } = useData();
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || '');
  const [category, setCategory] = useState(product.category || '');
  const [roomTypes, setRoomTypes] = useState<string[]>(product.roomTypes || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = getClient(product.clientId);

  useEffect(() => {
    if (isOpen) {
      setName(product.name);
      setDescription(product.description || '');
      setCategory(product.category || '');
      setRoomTypes(product.roomTypes || []);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const updates: Partial<Product> = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        roomTypes: roomTypes.length > 0 ? roomTypes : undefined,
      };

      await onSave(updates);
      onClose();
    } catch (err) {
      console.error('Failed to update product:', err);
      setError('Failed to update product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    name.trim() !== product.name ||
    (description.trim() || '') !== (product.description || '') ||
    (category.trim() || '') !== (product.category || '') ||
    JSON.stringify([...roomTypes].sort()) !== JSON.stringify([...(product.roomTypes || [])].sort());

  return (
    <Portal>
      <div style={styles.overlay} onClick={onClose} data-testid={buildTestId('edit-product-settings-modal', 'overlay')}>
        <div style={styles.content} onClick={(e) => e.stopPropagation()} data-testid={buildTestId('edit-product-settings-modal', 'content')}>
          <form onSubmit={handleSubmit}>
            <div style={styles.header}>
              <h2 style={styles.title}>Edit Product Settings</h2>
              <button
                type="button"
                onClick={onClose}
                style={{ ...commonStyles.button.icon, color: colors.slate[400] }}
                data-testid={buildTestId('edit-product-settings-modal', 'close-button')}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={styles.body}>
              {/* Product Name */}
              <div style={styles.formGroup}>
                <label htmlFor="productName" style={styles.label}>
                  Product Name *
                </label>
                <input
                  id="productName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                  placeholder="Enter product name"
                  required
                  data-testid={buildTestId('edit-product-settings-modal', 'name-input')}
                />
              </div>

              {/* Category */}
              <div style={styles.formGroup}>
                <label htmlFor="productCategory" style={styles.label}>
                  Category
                </label>
                <input
                  id="productCategory"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value.toLowerCase())}
                  style={styles.input}
                  placeholder="e.g., sofa"
                  list="edit-product-category-options"
                  data-testid={buildTestId('edit-product-settings-modal', 'category-input')}
                />
                <datalist id="edit-product-category-options">
                  {(client?.categories || []).map((existingCategory) => (
                    <option key={existingCategory} value={existingCategory} />
                  ))}
                </datalist>
                <span style={styles.helperText}>Helps organize products in the navigation panel</span>
              </div>

              {/* Room Types */}
              <div style={styles.formGroup}>
                <label htmlFor="productRoomTypes" style={styles.label}>
                  Room Types
                </label>
                <select
                  id="productRoomTypes"
                  multiple
                  value={roomTypes}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((option) => option.value);
                    setRoomTypes(selected);
                  }}
                  style={{ ...styles.select, height: '120px' }}
                  data-testid={buildTestId('edit-product-settings-modal', 'room-types-select')}
                >
                  {ROOM_TYPES.map((roomType) => (
                    <option key={roomType} value={roomType}>
                      {roomType}
                    </option>
                  ))}
                </select>
                <span style={styles.helperText}>Select one or more room types for this product</span>
              </div>

              {/* Description */}
              <div style={styles.formGroup}>
                <label htmlFor="productDescription" style={styles.label}>
                  Description
                </label>
                <textarea
                  id="productDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={styles.textarea}
                  placeholder="Enter product description (optional)"
                  rows={4}
                  data-testid={buildTestId('edit-product-settings-modal', 'description-input')}
                />
                <span style={styles.helperText}>A brief description of the product for reference</span>
              </div>

              {error && <span style={styles.errorText}>{error}</span>}
            </div>

            <div style={styles.footer}>
              <button
                type="button"
                onClick={onClose}
                style={commonStyles.button.secondary}
                data-testid={buildTestId('edit-product-settings-modal', 'cancel-button')}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={commonStyles.button.primary}
                disabled={isSaving || !hasChanges}
                data-testid={buildTestId('edit-product-settings-modal', 'save-button')}
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
