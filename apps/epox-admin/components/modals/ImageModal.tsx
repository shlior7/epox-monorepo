'use client';

import React, { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { colors } from '@/lib/styles/common-styles';
import { ImageProps } from 'next/image';
import { SafeNextImage } from '../common/SafeImage';
import { Portal, Z_INDEX } from '../common/Portal';
import { parseSize } from 'visualizer-ai/client';
import { buildTestId } from '@/lib/utils/test-ids';

interface ImageInfo {
  width: number;
  height: number;
  size: number | null; // in bytes
}

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: ImageProps['src'] | null;
  previewUrl?: ImageProps['src'] | null; // Low-res preview to show while high-res loads
  onClose: () => void;
  cssFilter?: string; // Optional CSS filter to apply (for adjustment previews)
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX.MODAL,
    padding: '16px',
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
  },
  header: {
    position: 'absolute' as const,
    top: '16px',
    right: '16px',
    display: 'flex',
    gap: '8px',
    zIndex: Z_INDEX.MODAL + 1,
  },
  button: {
    padding: '12px',
    backgroundColor: colors.slate[800],
    color: colors.slate[100],
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
  },
  imageContainer: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'default',
  },
  imageWrapper: {
    position: 'relative' as const,
    width: '90vw',
    height: '90vh',
  },
  image: {
    objectFit: 'contain' as const,
  },
  loadingSpinner: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: colors.slate[100],
    zIndex: 102,
  },
  subtleLoadingIndicator: {
    position: 'absolute' as const,
    bottom: '16px',
    right: '16px',
    color: 'rgba(255, 255, 255, 0.6)',
    zIndex: 102,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: '6px 12px',
    borderRadius: '16px',
  },
  imageInfoContainer: {
    position: 'absolute' as const,
    bottom: '16px',
    right: '16px',
    color: 'rgba(255, 255, 255, 0.8)',
    zIndex: 102,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
    fontSize: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: '6px 12px',
    borderRadius: '8px',
    pointerEvents: 'none' as const,
  },
  previewImage: {
    objectFit: 'contain' as const,
    filter: 'blur(2px)',
    transition: 'opacity 0.3s ease-out',
  },
  fullImage: {
    objectFit: 'contain' as const,
    transition: 'opacity 0.3s ease-out',
  },
  // Filter styles are applied dynamically via inline style
};

export function ImageModal({ isOpen, imageUrl, previewUrl, onClose, cssFilter }: ImageModalProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);

  // Reset loading state when modal opens with new image
  React.useEffect(() => {
    if (isOpen && imageUrl) {
      setIsImageLoading(true);
      setIsPreviewLoaded(false);
      setImageInfo(null); // Reset image info

      // Fetch image metadata for size
      const fetchMetadata = async () => {
        if (typeof imageUrl !== 'string') return;
        try {
          // Use a HEAD request to get headers without downloading the body
          // The proxy should pass through the Content-Length header
          const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;
          const response = await fetch(proxyUrl, { method: 'HEAD' });
          if (response.ok) {
            const size = response.headers.get('Content-Length');
            setImageInfo((prev) => ({
              ...(prev || { width: 0, height: 0 }),
              size: size ? parseInt(size, 10) : null,
            }));
          }
        } catch (error) {
          console.error('Failed to fetch image metadata:', error);
        }
      };

      fetchMetadata();
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = async () => {
    try {
      if (typeof imageUrl !== 'string') {
        alert('Cannot download this image.');
        return;
      }

      // Use the API proxy to avoid CORS issues
      const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;

      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `image-${Date.now()}.jpg`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsImageLoading(false);
    setImageInfo((prev) => ({
      ...(prev || { size: null }),
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    }));
  };

  const handleImageError = () => {
    setIsImageLoading(false);
  };

  const handlePreviewLoad = () => {
    setIsPreviewLoaded(true);
  };

  // Determine what to show:
  // - If we have a preview and it's loaded, show it (blurred) while full image loads
  // - Show full loading spinner only if no preview available or preview not loaded yet
  const hasPreview = !!previewUrl;
  const showFullLoadingSpinner = isImageLoading && (!hasPreview || !isPreviewLoaded);
  const showSubtleLoadingIndicator = isImageLoading && hasPreview && isPreviewLoaded;
  const showImageInfo = !isImageLoading && imageInfo && imageInfo.width > 0;

  return (
    <Portal>
      <div style={styles.overlay} onClick={handleOverlayClick} data-testid={buildTestId('image-modal', 'overlay')}>
        <div style={styles.header}>
          <button
            onClick={handleDownload}
            style={styles.button}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.slate[800])}
            aria-label="Download image"
            data-testid={buildTestId('image-modal', 'download-button')}
          >
            <Download style={{ width: '24px', height: '24px' }} />
          </button>
          <button
            onClick={onClose}
            style={styles.button}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.slate[800])}
            aria-label="Close"
            data-testid={buildTestId('image-modal', 'close-button')}
          >
            <X style={{ width: '24px', height: '24px' }} />
          </button>
        </div>

        <div style={styles.imageContainer}>
          <div style={styles.imageWrapper}>
            {/* Full loading spinner - only show if no preview or preview not loaded */}
            {showFullLoadingSpinner && (
              <div style={styles.loadingSpinner}>
                <Loader2 style={{ width: '48px', height: '48px', animation: 'spin 1s linear infinite' }} />
              </div>
            )}

            {/* Preview image - show immediately while high-res loads */}
            {hasPreview && isImageLoading && (
              <SafeNextImage
                src={previewUrl}
                alt="Preview"
                fill
                sizes="90vw"
                style={{
                  ...styles.previewImage,
                  opacity: isPreviewLoaded ? 1 : 0,
                  filter: cssFilter ? `blur(2px) ${cssFilter}` : 'blur(2px)',
                }}
                loading="eager"
                onLoad={handlePreviewLoad}
              />
            )}

            {/* Full resolution image - use unoptimized to avoid Next.js timeout on large images */}
            <SafeNextImage
              src={imageUrl}
              alt="Full size view"
              fill
              sizes="90vw"
              style={{
                ...styles.fullImage,
                opacity: isImageLoading ? 0 : 1,
                filter: cssFilter || 'none',
              }}
              loading="eager"
              unoptimized
              onLoad={handleImageLoad}
              onError={handleImageError}
            />

            {/* Subtle loading indicator when preview is shown */}
            {showSubtleLoadingIndicator && !showImageInfo && (
              <div style={styles.subtleLoadingIndicator}>
                <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                <span>Loading full resolution...</span>
              </div>
            )}

            {/* Image Info Display */}
            {showImageInfo && (
              <div style={styles.imageInfoContainer}>
                <span>{`${imageInfo.width} × ${imageInfo.height}`}</span>
                {imageInfo.size && <span>{formatBytes(imageInfo.size)}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
