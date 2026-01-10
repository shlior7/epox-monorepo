'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useData } from '@/lib/contexts/DataContext';
import { apiClient } from '@/lib/api-client';
import { colors, Z_INDEX } from '@/lib/styles/common-styles';
import { Portal } from '../common/Portal';
import { FileUploadSection, type FileUploadResult } from '../shared/FileUploadSection';
import { buildTestId } from '@/lib/utils/test-ids';
import { ROOM_TYPES } from '@/components/SceneStudioView/constants';

interface AddProductModalProps {
  isOpen: boolean;
  clientId: string | null;
  onClose: () => void;
  onProductAdded?: (productId: string) => void;
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
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
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
  },
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    overflowY: 'auto' as const,
    flex: 1,
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
  uploadZone: {
    width: '100%',
    border: `2px dashed ${colors.slate[600]}`,
    borderRadius: '8px',
    padding: '32px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    backgroundColor: colors.slate[900],
  },
  uploadContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    color: colors.slate[400],
  },
  previewContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    marginTop: '12px',
  },
  previewItem: {
    position: 'relative' as const,
    width: '80px',
    height: '80px',
  },
  preview: {
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
    color: colors.slate[100],
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
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
  select: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: colors.slate[900],
    border: `1px solid ${colors.slate[600]}`,
    borderRadius: '8px',
    color: colors.slate[100],
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 10px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '20px',
    paddingRight: '36px',
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
  },
  cancelButton: {
    backgroundColor: colors.slate[700],
    color: colors.slate[100],
    border: 'none',
  },
  submitButton: {
    backgroundColor: colors.indigo[600],
    color: colors.slate[100],
    border: 'none',
  },
};

export function AddProductModal({ isOpen, clientId, onClose, onProductAdded }: AddProductModalProps) {
  const { addProduct, updateProduct, getClient } = useData();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [roomTypes, setRoomTypes] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<FileUploadResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const client = clientId ? getClient(clientId) : null;

  if (!isOpen) return null;

  const handleFilesReady = (result: FileUploadResult) => {
    console.log('📋 AddProductModal - Files ready:', {
      mode: result.mode,
      filesCount: result.files.length,
      fileNames: result.files.map((f) => f.name),
      hasGlbFile: !!result.glbFile,
      previewsCount: result.jpegPreviews?.length || 0,
    });
    setUploadResult(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔍 AddProductModal - Submit called with uploadResult:', {
      hasResult: !!uploadResult,
      mode: uploadResult?.mode,
      filesCount: uploadResult?.files.length,
      fileNames: uploadResult?.files.map((f) => f.name),
      hasGlbFile: !!uploadResult?.glbFile,
      previewsCount: uploadResult?.jpegPreviews?.length || 0,
    });

    if (!name.trim()) {
      alert('Please enter a product name');
      return;
    }

    if (!uploadResult || uploadResult.files.length === 0) {
      alert('Please upload at least one product image or GLB file');
      return;
    }

    if (!clientId) {
      alert('No client selected');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🚀 AddProductModal - Starting product creation');
      console.log(
        '   Files being uploaded:',
        uploadResult.files.map((f) => ({ name: f.name, size: f.size }))
      );

      if (uploadResult.files.length === 0) {
        console.error('❌ CRITICAL: No files in uploadResult.files array!');
        console.error('   uploadResult:', uploadResult);
        alert('Error: No image files to upload. Please process the GLB file first.');
        setIsSubmitting(false);
        return;
      }

      // Use the standard image upload workflow (works for both regular images and GLB-generated images)
      const product = await addProduct(
        clientId,
        name.trim(),
        description.trim() || undefined,
        uploadResult.files,
        category.trim() || undefined,
        roomTypes.length > 0 ? roomTypes : undefined
      );

      console.log('✅ AddProductModal - Product created:', {
        productId: product.id,
        productImageIds: product.productImageIds,
        imageCount: product.productImageIds.length,
      });

      // Upload GLB model if provided
      if (uploadResult.glbFile) {
        const glbFilename = `${product.id}.glb`;
        console.log(`📦 Uploading GLB model to S3 as ${glbFilename}`);
        await apiClient.uploadProductModel(clientId, product.id, glbFilename, uploadResult.glbFile);

        // Update product metadata with model filename
        await updateProduct(
          clientId,
          product.id,
          {
            modelFilename: glbFilename,
            productImageIds: product.productImageIds,
          },
          null
        );
        console.log('✅ GLB model uploaded and product metadata updated');
      }

      // Upload JPEG previews if we have them (from GLB processing)
      if (uploadResult.jpegPreviews && uploadResult.jpegPreviews.length > 0 && product.productImageIds) {
        console.log(`📤 Uploading ${uploadResult.jpegPreviews.length} JPEG previews to S3...`);

        // Upload each JPEG preview to the preview/ folder
        await Promise.all(
          product.productImageIds.map(async (imageId, index) => {
            if (uploadResult.jpegPreviews && uploadResult.jpegPreviews[index]) {
              await apiClient.uploadProductImagePreview(clientId, product.id, imageId, uploadResult.jpegPreviews[index]);
              console.log(`   ✅ Uploaded preview for ${imageId}`);
            }
          })
        );

        console.log(`✅ All JPEG previews uploaded successfully`);
      }

      if (onProductAdded) {
        onProductAdded(product.id);
      }

      setName('');
      setDescription('');
      setCategory('');
      setRoomTypes([]);
      setUploadResult(null);

      onClose();
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('Failed to add product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setDescription('');
      setCategory('');
      setRoomTypes([]);
      setUploadResult(null);
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
      <div style={styles.overlay} onClick={handleOverlayClick} data-testid={buildTestId('add-product-modal', 'overlay')}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h2 style={styles.title}>Add New Product</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              style={styles.closeButton}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              data-testid={buildTestId('add-product-modal', 'close-button')}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Upload Section */}
            <div style={styles.formGroup}>
              <label htmlFor="productName" style={styles.label}>
                Product Name *
              </label>
              <input
                id="productName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., White Lounge Chair"
                required
                style={styles.input}
                onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                data-testid={buildTestId('add-product-modal', 'name-input')}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="productCategory" style={styles.label}>
                Category
              </label>
              <input
                id="productCategory"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value.toLowerCase())}
                placeholder="e.g., sofa"
                list="product-category-options"
                style={styles.input}
                onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                data-testid={buildTestId('add-product-modal', 'category-input')}
              />
              <datalist id="product-category-options">
                {(client?.categories || []).map((existingCategory) => (
                  <option key={existingCategory} value={existingCategory} />
                ))}
              </datalist>
            </div>

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
                onFocus={(e) => (e.currentTarget.style.borderColor = colors.indigo[500])}
                onBlur={(e) => (e.currentTarget.style.borderColor = colors.slate[600])}
                data-testid={buildTestId('add-product-modal', 'room-types-select')}
              >
                {ROOM_TYPES.map((roomType) => (
                  <option key={roomType} value={roomType}>
                    {roomType}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Product Images or 3D Model *</label>
              <FileUploadSection onFilesReady={handleFilesReady} />
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                style={{ ...styles.button, ...styles.cancelButton }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[600])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
                data-testid={buildTestId('add-product-modal', 'cancel-button')}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ ...styles.button, ...styles.submitButton }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.indigo[700])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.indigo[600])}
                data-testid={buildTestId('add-product-modal', 'submit-button')}
              >
                {isSubmitting ? 'Adding...' : 'Add Product & Start'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
