'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useData } from '@/lib/contexts/DataContext';
import { commonStyles, colors } from '@/lib/styles/common-styles';
import { Portal } from '../common/Portal';
import { X, Loader2, Upload } from 'lucide-react';
import type { Product } from '@/lib/types/app-types';
import { getImageUrl, getPreviewImageUrl, S3Paths } from '@/lib/services/s3/browser';
import { ImageModal } from './ImageModal';
import { buildTestId } from '@/lib/utils/test-ids';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productInfo: { clientId: string; productId: string } | null;
}

const styles = {
  ...commonStyles.modal,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: `1px solid ${colors.slate[700]}`,
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.slate[100],
  },
  body: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.slate[300],
    marginBottom: '8px',
  },
  footer: {
    padding: '16px',
    borderTop: `1px solid ${colors.slate[700]}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  uploadZone: {
    width: '100%',
    border: `2px dashed ${colors.slate[600]}`,
    borderRadius: '8px',
    padding: '24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    backgroundColor: colors.slate[900],
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '12px',
    marginTop: '8px',
  },
  imageContainer: {
    position: 'relative' as const,
    width: '80px',
    height: '80px',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    borderRadius: '8px',
  },
  removeImageButton: {
    position: 'absolute' as const,
    top: '-6px',
    right: '-6px',
    padding: '4px',
    backgroundColor: colors.red[500],
    color: '#ffffff',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
  },
};

export function EditProductModal({ isOpen, onClose, productInfo }: EditProductModalProps) {
  const { clients, updateProduct } = useData();
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImages, setProductImages] = useState<Array<File | string>>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [imageModalInfo, setImageModalInfo] = useState<{ clientId: string; productId: string; imageId: string } | undefined>(undefined);

  const [product, setProduct] = useState<Product | null>(null);

  const cleanupObjectUrls = () => {
    imagePreviews.forEach((preview, index) => {
      if (productImages[index] instanceof File) {
        URL.revokeObjectURL(preview);
      }
    });
  };

  const resetFormState = () => {
    setProduct(null);
    setProductName('');
    setProductDescription('');
    setProductImages([]);
    setImagePreviews([]);
    setError(null);
  };

  const closeModal = (force = false) => {
    if (!force && isSaving) {
      return;
    }
    cleanupObjectUrls();
    resetFormState();
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !productInfo) {
      return;
    }

    const client = clients.find((c) => c.id === productInfo.clientId);
    const productData = client?.products.find((p) => p.id === productInfo.productId);
    if (productData) {
      setProduct(productData);
      setProductName(productData.name);
      setProductDescription(productData.description || '');
      setProductImages(productData.productImageIds || []);
      // Use JPEG previews for UI display (smaller file size)
      const urls = (productData.productImageIds || []).map((imageId) => {
        return getPreviewImageUrl(productInfo.clientId, productData.id, imageId);
      });
      setImagePreviews(urls);
    }
  }, [isOpen, productInfo, clients]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setProductImages((prev) => [...prev, ...files]);
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    const imageToRemove = productImages[index];
    setProductImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const newPreviews = prev.filter((_, i) => i !== index);
      if (imageToRemove instanceof File) {
        URL.revokeObjectURL(imagePreviews[index]);
      }
      return newPreviews;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productInfo || !product) return;

    if (!productName.trim()) {
      setError('Product name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedDetails: Partial<Product> = {
        name: productName,
        description: productDescription,
        productImageIds: productImages.filter((img): img is string => typeof img === 'string'),
      };

      const newImageFiles = productImages.filter((img): img is File => img instanceof File);

      await updateProduct(productInfo.clientId, productInfo.productId, updatedDetails, newImageFiles);
      closeModal(true);
    } catch (err) {
      console.error('Failed to update product:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div style={styles.overlay} onClick={() => closeModal()} data-testid={buildTestId('edit-product-modal', 'overlay')}>
        <div style={styles.content} onClick={(e) => e.stopPropagation()} data-testid={buildTestId('edit-product-modal', 'content')}>
        <form onSubmit={handleSubmit}>
          <div style={styles.header}>
            <h2 style={styles.title}>Edit Product</h2>
            <button
              type="button"
              onClick={() => closeModal()}
              style={{ ...commonStyles.button.icon, color: colors.slate[400] }}
              data-testid={buildTestId('edit-product-modal', 'close-button')}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
          <div style={styles.body}>
            <div>
              <label style={styles.label}>Product Images</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                data-testid={buildTestId('edit-product-modal', 'file-input')}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={styles.uploadZone}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                data-testid={buildTestId('edit-product-modal', 'upload-zone')}
              >
                <div style={{ color: colors.slate[400], display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Upload style={{ width: '32px', height: '32px' }} />
                  <span>Upload new images</span>
                </div>
              </div>
              {imagePreviews.length > 0 && (
                <div style={styles.imageGrid}>
                  {imagePreviews.map((preview, index) => {
                    const imageItem = productImages[index];
                    const isExistingImage = typeof imageItem === 'string';
                    return (
                      <div key={index} style={styles.imageContainer}>
                        <img
                          src={preview}
                          alt="Product Preview"
                          style={{ ...styles.imagePreview, cursor: isExistingImage ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (isExistingImage && productInfo) {
                              setImageModalUrl(preview);
                              setImageModalInfo({ clientId: productInfo.clientId, productId: productInfo.productId, imageId: imageItem });
                            }
                          }}
                          data-testid={buildTestId('edit-product-modal', 'image-preview', index)}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          style={styles.removeImageButton}
                          data-testid={buildTestId('edit-product-modal', 'remove-image-button', index)}
                        >
                          <X style={{ width: '12px', height: '12px' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="productName" style={styles.label}>
                Product Name
              </label>
              <input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                style={commonStyles.input.base}
                placeholder="e.g., Ergonomic Office Chair"
                required
                data-testid={buildTestId('edit-product-modal', 'name-input')}
              />
            </div>
            <div>
              <label htmlFor="productDescription" style={styles.label}>
                Description (Optional)
              </label>
              <textarea
                id="productDescription"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                style={commonStyles.input.textarea}
                rows={3}
                placeholder="Describe the product..."
                data-testid={buildTestId('edit-product-modal', 'description-input')}
              />
            </div>
          </div>
          <div style={styles.footer}>
            {error && <p style={{ color: colors.red[600], fontSize: '14px', marginRight: 'auto' }}>{error}</p>}
            <button
              type="button"
              onClick={() => closeModal()}
              style={commonStyles.button.secondary}
              data-testid={buildTestId('edit-product-modal', 'cancel-button')}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={commonStyles.button.primary}
              disabled={isSaving}
              data-testid={buildTestId('edit-product-modal', 'save-button')}
            >
              {isSaving ? (
                <>
                  <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>

        {/* Image Modal for viewing */}
        <ImageModal
          isOpen={imageModalUrl !== null}
          imageUrl={imageModalUrl}
          onClose={() => {
            setImageModalUrl(null);
            setImageModalInfo(undefined);
          }}
        />
      </div>
    </Portal>
  );
}
