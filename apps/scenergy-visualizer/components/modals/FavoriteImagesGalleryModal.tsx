'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Download, MoreVertical, Pencil, Star, Layers, Trash2 } from 'lucide-react';
import { colors } from '@/lib/styles/common-styles';
import * as S3Service from '@/lib/services/s3/browser';
import type { Session } from '@/lib/types/app-types';
import { parseSize } from 'visualizer-ai/client';
import { SafeNextImage } from '../common/SafeImage';
import { ImageModal } from './ImageModal';
import { ImageProps } from 'next/image';
import { buildTestId } from '@/lib/utils/test-ids';

interface FavoriteImagesGalleryModalProps {
  isOpen: boolean;
  clientId: string;
  productId: string;
  favoriteImages: { imageId: string; sessionId: string }[];
  productName: string;
  sessions: Session[];
  onClose: () => void;
  onEditImage?: (imageUrl: string, imageId: string, sessionId: string) => void;
  onRemoveFavorite?: (imageId: string, sessionId: string) => void;
  onToggleScene?: (imageId: string, sessionId: string) => void;
  isScene?: (imageId: string) => boolean;
  onDeleteImage?: (imageId: string, sessionId: string) => void;
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '16px',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: colors.slate[800],
    borderRadius: '12px',
    maxWidth: '1200px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    border: `1px solid ${colors.slate[700]}`,
  },
  header: {
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.slate[700]}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.slate[100],
  },
  subtitle: {
    fontSize: '14px',
    color: colors.slate[400],
    marginTop: '4px',
  },
  closeButton: {
    padding: '8px',
    backgroundColor: colors.slate[700],
    color: colors.slate[200],
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '24px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  gallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
  },
  imageContainer: {
    position: 'relative' as const,
    aspectRatio: '1',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: `2px solid ${colors.slate[700]}`,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  },
  downloadButton: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    padding: '8px',
    backgroundColor: colors.indigo[600],
    color: colors.slate[100],
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s, background-color 0.2s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    border: 'none',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: colors.slate[400],
  },
  menuButton: {
    position: 'absolute' as const,
    top: '8px',
    right: '44px',
    padding: '8px',
    backgroundColor: colors.slate[700],
    color: colors.slate[200],
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s, background-color 0.2s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    border: 'none',
  },
  menu: {
    position: 'absolute' as const,
    top: '44px',
    right: '8px',
    backgroundColor: colors.slate[800],
    border: `1px solid ${colors.slate[600]}`,
    borderRadius: '8px',
    padding: '4px',
    minWidth: '180px',
    zIndex: 20,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: colors.slate[200],
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    textAlign: 'left' as const,
  },
  menuItemDanger: {
    color: colors.red[400],
  },
  deleteConfirmOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  deleteConfirmModal: {
    backgroundColor: colors.slate[800],
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    border: `1px solid ${colors.slate[600]}`,
  },
  deleteConfirmTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.slate[100],
    marginBottom: '12px',
  },
  deleteConfirmText: {
    fontSize: '14px',
    color: colors.slate[300],
    marginBottom: '20px',
  },
  deleteConfirmActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '10px 16px',
    backgroundColor: colors.slate[700],
    color: colors.slate[200],
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmDeleteButton: {
    padding: '10px 16px',
    backgroundColor: colors.red[600],
    color: colors.slate[100],
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export function FavoriteImagesGalleryModal({
  isOpen,
  clientId,
  productId,
  favoriteImages,
  productName,
  sessions,
  onClose,
  onEditImage,
  onRemoveFavorite,
  onToggleScene,
  isScene,
  onDeleteImage,
}: FavoriteImagesGalleryModalProps) {
  const [productImageModalUrl, setProductImageModalUrl] = useState<ImageProps['src'] | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<ImageProps['src'] | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ imageId: string; sessionId: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  if (!isOpen) return null;

  const handleDownload = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const imageUrl = S3Service.getImageUrl(S3Service.S3Paths.getMediaFilePath(clientId, productId, '', imageId));

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
      a.download = `${productName}-${imageId}`;
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

  return (
    <div style={styles.overlay} onClick={handleOverlayClick} data-testid={buildTestId('favorite-gallery-modal', 'overlay')}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} data-testid={buildTestId('favorite-gallery-modal', 'content')}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Favorite Generated Images</div>
            <div style={styles.subtitle}>
              {productName} • {favoriteImages.length} image{favoriteImages.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={styles.closeButton}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[600])}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
            aria-label="Close"
            data-testid={buildTestId('favorite-gallery-modal', 'close-button')}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={styles.body}>
          {favoriteImages.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No favorite images yet.</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Hover over generated images in chat and click the star to favorite them.</p>
            </div>
          ) : (
            <div style={styles.gallery}>
              {favoriteImages.map(({ imageId, sessionId }) => {
                const imageUrl = S3Service.getImageUrl(S3Service.S3Paths.getMediaFilePath(clientId, productId, sessionId, imageId));
                const clientSessionImageUrl = S3Service.getImageUrl(
                  S3Service.S3Paths.getClientSessionMediaFilePath(clientId, sessionId, imageId)
                );

                const imageIsScene = isScene ? isScene(imageId) : false;

                return (
                  <div
                    key={imageId}
                    style={styles.imageContainer}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = `0 8px 16px rgba(0, 0, 0, 0.3)`;
                      const buttons = e.currentTarget.querySelectorAll('[data-hover-button]') as NodeListOf<HTMLElement>;
                      buttons.forEach((button) => (button.style.opacity = '1'));
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      const buttons = e.currentTarget.querySelectorAll('[data-hover-button]') as NodeListOf<HTMLElement>;
                      buttons.forEach((button) => (button.style.opacity = '0'));
                    }}
                    data-testid={buildTestId('favorite-gallery-modal', 'image-card', imageId)}
                  >
                    <SafeNextImage
                      src={imageUrl}
                      fallbackSrc={clientSessionImageUrl}
                      alt={'Favorite'}
                      onSafeClick={(url) => {
                        // Use a smaller optimized version as preview while full image loads
                        // Construct Next.js optimized URL for preview (smaller size)
                        const previewSrc = typeof url === 'string'
                          ? `/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`
                          : url;
                        setPreviewImageUrl(previewSrc);
                        setProductImageModalUrl(url);
                      }}
                      width={parseSize(styles.image.width)}
                      height={parseSize(styles.image.height)}
                      loading="eager"
                      style={styles.image}
                    />

                    {/* Menu Button */}
                    <div ref={activeMenuId === imageId ? menuRef : null}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === imageId ? null : imageId);
                        }}
                        style={styles.menuButton}
                        data-hover-button
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[600])}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
                        aria-label="Image actions"
                        data-testid={buildTestId('favorite-gallery-modal', 'menu-button', imageId)}
                      >
                        <MoreVertical style={{ width: '18px', height: '18px' }} />
                      </button>

                      {/* Menu Dropdown */}
                      {activeMenuId === imageId && (
                        <div style={styles.menu}>
                          {onEditImage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                onEditImage(imageUrl, imageId, sessionId);
                              }}
                              style={styles.menuItem}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Pencil style={{ width: '16px', height: '16px' }} />
                              <span>Edit</span>
                            </button>
                          )}
                          {onRemoveFavorite && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                onRemoveFavorite(imageId, sessionId);
                              }}
                              style={styles.menuItem}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Star style={{ width: '16px', height: '16px' }} fill="currentColor" />
                              <span>Remove from Favorites</span>
                            </button>
                          )}
                          {onToggleScene && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                onToggleScene(imageId, sessionId);
                              }}
                              style={styles.menuItem}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Layers style={{ width: '16px', height: '16px' }} />
                              <span>{imageIsScene ? 'Remove from Scenes' : 'Add to Scenes'}</span>
                            </button>
                          )}
                          {onDeleteImage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                setDeleteConfirmId({ imageId, sessionId });
                              }}
                              style={{ ...styles.menuItem, ...styles.menuItemDanger }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Trash2 style={{ width: '16px', height: '16px' }} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Download Button */}
                    <button
                      onClick={(e) => handleDownload(imageId, e)}
                      style={styles.downloadButton}
                      data-hover-button
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.indigo[700])}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.indigo[600])}
                      aria-label="Download image"
                      data-testid={buildTestId('favorite-gallery-modal', 'download-button', imageId)}
                    >
                      <Download style={{ width: '20px', height: '20px' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Product Image Modal */}
      <ImageModal
        isOpen={productImageModalUrl !== null}
        imageUrl={productImageModalUrl}
        previewUrl={previewImageUrl}
        onClose={() => {
          setProductImageModalUrl(null);
          setPreviewImageUrl(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          style={styles.deleteConfirmOverlay}
          onClick={(e) => {
            e.stopPropagation();
            setDeleteConfirmId(null);
          }}
        >
          <div
            style={styles.deleteConfirmModal}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={styles.deleteConfirmTitle}>Delete Image</h3>
            <p style={styles.deleteConfirmText}>
              Are you sure you want to delete this image? This action cannot be undone.
            </p>
            <div style={styles.deleteConfirmActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setDeleteConfirmId(null)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[600])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
              >
                Cancel
              </button>
              <button
                style={styles.confirmDeleteButton}
                onClick={() => {
                  if (onDeleteImage && deleteConfirmId) {
                    onDeleteImage(deleteConfirmId.imageId, deleteConfirmId.sessionId);
                  }
                  setDeleteConfirmId(null);
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.red[700])}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.red[600])}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
