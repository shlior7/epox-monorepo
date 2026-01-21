'use client';

import React, { useState } from 'react';
import { commonStyles, colors } from '@/lib/styles/common-styles';
import { X, Loader2 } from 'lucide-react';
import { FileUploadSection, type FileUploadResult } from '../shared/FileUploadSection';
import { buildTestId } from '@/lib/utils/test-ids';

interface AddBaseImagesModalProps {
  isOpen: boolean;
  clientId: string;
  productId: string;
  onClose: () => void;
  onImagesAdded: (imageFiles: File[], jpegPreviews?: string[]) => Promise<void>;
}

const styles = {
  overlay: {
    ...commonStyles.modal.overlay,
  },
  content: {
    ...commonStyles.modal.content,
    maxWidth: '800px',
  },
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
    color: '#ffffff',
  },
  body: {
    padding: '24px',
    maxHeight: '70vh',
    overflowY: 'auto' as const,
  },
  footer: {
    padding: '20px',
    borderTop: `1px solid ${colors.slate[700]}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
};

export function AddBaseImagesModal({ isOpen, clientId, productId, onClose, onImagesAdded }: AddBaseImagesModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadResult, setUploadResult] = useState<FileUploadResult | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!isSubmitting) {
      setUploadResult(null);
      onClose();
    }
  };

  const handleFilesReady = (result: FileUploadResult) => {
    setUploadResult(result);
  };

  const handleSubmit = async () => {
    if (!uploadResult || uploadResult.files.length === 0) {
      alert('No images to upload');
      return;
    }

    try {
      setIsSubmitting(true);
      await onImagesAdded(uploadResult.files, uploadResult.jpegPreviews);
      handleClose();
    } catch (error) {
      console.error('Failed to add images:', error);
      alert('Failed to add images. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasFiles = uploadResult && uploadResult.files.length > 0;

  return (
    <div style={styles.overlay} onClick={handleClose} data-testid={buildTestId('add-base-images-modal', 'overlay')}>
      <div style={styles.content} onClick={(e) => e.stopPropagation()} data-testid={buildTestId('add-base-images-modal', 'content')}>
        <div style={styles.header}>
          <h2 style={styles.title}>Add Base Images</h2>
          <button
            style={commonStyles.button.icon}
            onClick={handleClose}
            disabled={isSubmitting}
            data-testid={buildTestId('add-base-images-modal', 'close-button')}
          >
            <X size={20} />
          </button>
        </div>

        <div style={styles.body}>
          <FileUploadSection onFilesReady={handleFilesReady} />
        </div>

        <div style={styles.footer}>
          <button
            style={commonStyles.button.secondary}
            onClick={handleClose}
            disabled={isSubmitting}
            data-testid={buildTestId('add-base-images-modal', 'cancel-button')}
          >
            Cancel
          </button>
          <button
            style={commonStyles.button.primary}
            onClick={handleSubmit}
            disabled={!hasFiles || isSubmitting}
            data-testid={buildTestId('add-base-images-modal', 'submit-button')}
          >
            {isSubmitting && <Loader2 size={16} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />}
            {isSubmitting ? 'Adding Images...' : 'Add Images'}
          </button>
        </div>
      </div>
    </div>
  );
}
