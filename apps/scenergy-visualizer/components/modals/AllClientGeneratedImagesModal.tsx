'use client';

/**
 * AllClientGeneratedImagesModal
 *
 * Shows all generated images across all products and sessions for a client.
 */

import React, { useState, useMemo } from 'react';
import { X, Download, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { colors } from '@/lib/styles/common-styles';
import * as S3Service from '@/lib/services/s3/browser';
import type { Client, ImageMessagePart } from '@/lib/types/app-types';
import { parseSize } from 'visualizer-ai/client';
import { SafeNextImage } from '../common/SafeImage';
import { ImageModal } from './ImageModal';
import { ImageProps } from 'next/image';
import { buildTestId } from '@/lib/utils/test-ids';

interface AllClientGeneratedImagesModalProps {
  isOpen: boolean;
  client: Client;
  onClose: () => void;
  onToggleFavorite?: (productId: string, imageId: string, sessionId: string) => void;
}

interface GroupedImage {
  imageId: string;
  sessionId: string;
  productId: string;
  productName: string;
  imageUrl: string;
  isFavorite: boolean;
  createdAt?: string;
}

type SortOption = 'newest' | 'oldest' | 'product';
type FilterOption = 'all' | 'favorites';

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
    maxWidth: '1400px',
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
    alignItems: 'flex-start',
    gap: '16px',
  },
  headerLeft: {
    flex: 1,
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
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  select: {
    padding: '8px 12px',
    backgroundColor: colors.slate[700],
    color: colors.slate[200],
    border: `1px solid ${colors.slate[600]}`,
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
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
    border: 'none',
    flexShrink: 0,
  },
  body: {
    padding: '24px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  productSection: {
    marginBottom: '24px',
  },
  productHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: colors.slate[800],
    borderRadius: '8px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  productName: {
    fontSize: '16px',
    fontWeight: 500,
    color: colors.slate[100],
    flex: 1,
  },
  productCount: {
    fontSize: '14px',
    color: colors.slate[400],
  },
  gallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
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
  imageContainerFavorite: {
    borderColor: colors.amber[500],
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  },
  imageOverlay: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    left: 0,
    padding: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    opacity: 0,
    transition: 'opacity 0.2s',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
  },
  actionButton: {
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: colors.slate[100],
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
    border: 'none',
  },
  favoriteButton: {
    color: colors.amber[500],
  },
  productLabel: {
    position: 'absolute' as const,
    bottom: '8px',
    left: '8px',
    right: '8px',
    padding: '6px 10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: colors.slate[100],
    fontSize: '12px',
    borderRadius: '4px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: colors.slate[400],
  },
};

export function AllClientGeneratedImagesModal({
  isOpen,
  client,
  onClose,
  onToggleFavorite,
}: AllClientGeneratedImagesModalProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<ImageProps['src'] | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('product');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set());

  // Collect all generated images from all products' sessions
  const allImages = useMemo(() => {
    const images: GroupedImage[] = [];

    for (const product of client.products) {
      // TODO: Implement using pinned field on generated_asset
      const favoriteSet = new Set<string>();

      for (const session of product.sessions) {
        for (const message of session.messages) {
          // Check message parts for images
          for (const part of message.parts) {
            if (part.type === 'image') {
              const imagePart = part as ImageMessagePart;
              if (imagePart.imageIds && imagePart.imageIds.length > 0) {
                for (const imageId of imagePart.imageIds) {
                  const imageUrl = S3Service.getImageUrl(
                    S3Service.S3Paths.getMediaFilePath(client.id, product.id, session.id, imageId)
                  );
                  images.push({
                    imageId,
                    sessionId: session.id,
                    productId: product.id,
                    productName: product.name,
                    imageUrl,
                    isFavorite: favoriteSet.has(`${imageId}-${session.id}`),
                    createdAt: message.timestamp,
                  });
                }
              }
            }
          }
        }
      }
    }

    return images;
  }, [client]);

  // Filter images
  const filteredImages = useMemo(() => {
    if (filterBy === 'favorites') {
      return allImages.filter(img => img.isFavorite);
    }
    return allImages;
  }, [allImages, filterBy]);

  // Sort and group images
  const sortedImages = useMemo(() => {
    const sorted = [...filteredImages];

    if (sortBy === 'newest') {
      sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    }

    return sorted;
  }, [filteredImages, sortBy]);

  // Group by product when sorting by product
  const groupedByProduct = useMemo(() => {
    if (sortBy !== 'product') return null;

    const groups: Record<string, GroupedImage[]> = {};
    for (const img of sortedImages) {
      if (!groups[img.productId]) {
        groups[img.productId] = [];
      }
      groups[img.productId].push(img);
    }
    return groups;
  }, [sortedImages, sortBy]);

  if (!isOpen) return null;

  const handleDownload = async (img: GroupedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const proxyUrl = `/api/download-image?url=${encodeURIComponent(img.imageUrl)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${img.productName}-${img.imageId}`;
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

  const toggleProductCollapse = (productId: string) => {
    setCollapsedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const renderImageCard = (img: GroupedImage, showProductLabel: boolean = false) => (
    <div
      key={`${img.productId}-${img.sessionId}-${img.imageId}`}
      style={{
        ...styles.imageContainer,
        ...(img.isFavorite ? styles.imageContainerFavorite : {}),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)';
        const overlay = e.currentTarget.querySelector('[data-overlay]') as HTMLElement;
        if (overlay) overlay.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
        const overlay = e.currentTarget.querySelector('[data-overlay]') as HTMLElement;
        if (overlay) overlay.style.opacity = '0';
      }}
      data-testid={buildTestId('all-images-modal', 'image-card', img.imageId)}
    >
      <SafeNextImage
        src={img.imageUrl}
        alt={`Generated for ${img.productName}`}
        onSafeClick={(url) => setSelectedImageUrl(url)}
        width={parseSize(styles.image.width)}
        height={parseSize(styles.image.height)}
        loading="lazy"
        style={styles.image}
      />
      <div style={styles.imageOverlay} data-overlay>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(img.productId, img.imageId, img.sessionId);
          }}
          style={{
            ...styles.actionButton,
            ...(img.isFavorite ? styles.favoriteButton : {}),
          }}
          aria-label={img.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          data-testid={buildTestId('all-images-modal', 'favorite-button', img.imageId)}
        >
          <Star
            size={18}
            fill={img.isFavorite ? 'currentColor' : 'none'}
          />
        </button>
        <button
          onClick={(e) => handleDownload(img, e)}
          style={styles.actionButton}
          aria-label="Download image"
          data-testid={buildTestId('all-images-modal', 'download-button', img.imageId)}
        >
          <Download size={18} />
        </button>
      </div>
      {showProductLabel && (
        <div style={styles.productLabel}>
          {img.productName}
        </div>
      )}
    </div>
  );

  const totalFavorites = allImages.filter(img => img.isFavorite).length;

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      data-testid={buildTestId('all-images-modal', 'overlay')}
    >
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        data-testid={buildTestId('all-images-modal', 'content')}
      >
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.title}>All Generated Images</div>
            <div style={styles.subtitle}>
              {client.name} • {allImages.length} total image{allImages.length !== 1 ? 's' : ''} • {totalFavorites} favorite{totalFavorites !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={styles.controls}>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              style={styles.select}
              aria-label="Filter images"
            >
              <option value="all">All Images</option>
              <option value="favorites">Favorites Only</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={styles.select}
              aria-label="Sort images"
            >
              <option value="product">By Product</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          <button
            onClick={onClose}
            style={styles.closeButton}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[600])}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
            aria-label="Close"
            data-testid={buildTestId('all-images-modal', 'close-button')}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={styles.body}>
          {sortedImages.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No generated images yet.</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                Generate images in a session to see them here.
              </p>
            </div>
          ) : sortBy === 'product' && groupedByProduct ? (
            // Grouped by product view
            Object.entries(groupedByProduct).map(([productId, images]) => {
              const product = client.products.find(p => p.id === productId);
              const isCollapsed = collapsedProducts.has(productId);

              return (
                <div key={productId} style={styles.productSection}>
                  <div
                    style={styles.productHeader}
                    onClick={() => toggleProductCollapse(productId)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.slate[700])}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.slate[800])}
                  >
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    <span style={styles.productName}>{product?.name || 'Unknown Product'}</span>
                    <span style={styles.productCount}>{images.length} images</span>
                  </div>
                  {!isCollapsed && (
                    <div style={styles.gallery}>
                      {images.map(img => renderImageCard(img, false))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Flat list view (sorted by date)
            <div style={styles.gallery}>
              {sortedImages.map(img => renderImageCard(img, true))}
            </div>
          )}
        </div>
      </div>

      {/* Full-size Image Modal */}
      <ImageModal
        isOpen={selectedImageUrl !== null}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}
