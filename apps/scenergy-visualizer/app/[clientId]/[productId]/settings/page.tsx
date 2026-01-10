'use client';

/**
 * Product Settings Page
 * Route: /[clientId]/[productId]/settings
 * Shows product details, base images gallery, and favorite generated images
 */

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useParams, useRouter, notFound } from 'next/navigation';
import { useData } from '@/lib/contexts/DataContext';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { Save, Download, FolderOpen, Star, Image as ImageIcon, Trash2, X, Plus, Pencil } from 'lucide-react';
import { getImageUrl, getPreviewImageUrl, S3Paths } from '@/lib/services/s3/browser';
import { FavoriteImagesGalleryModal } from '@/components/modals/FavoriteImagesGalleryModal';
import { AddBaseImagesModal } from '@/components/modals/AddBaseImagesModal';
import { EditProductSettingsModal } from '@/components/modals/EditProductSettingsModal';
import { SafeNextImage } from '@/components/common/SafeImage';
import { Accordion } from '@/components/common';
import { DangerZone } from '@/components/DangerZone';
import { buildTestId } from '@/lib/utils/test-ids';
import type { Product } from '@/lib/types/app-types';
import styles from './page.module.scss';

export default function ProductSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { clients, isLoading, updateProduct, deleteProduct } = useData();
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [productName, setProductName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFavoriteGalleryOpen, setIsFavoriteGalleryOpen] = useState(false);
  const [isAddImagesModalOpen, setIsAddImagesModalOpen] = useState(false);
  const [isEditSettingsModalOpen, setIsEditSettingsModalOpen] = useState(false);
  const [selectedBaseImageId, setSelectedBaseImageId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const clientId = params.clientId as string;
  const productId = params.productId as string;
  const client = clients.find((c) => c.id === clientId);
  const product = client?.products.find((p) => p.id === productId);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isLoading && (!client || !product)) {
      notFound();
    }
  }, [isLoading, client, product]);

  useEffect(() => {
    if (product) {
      setProductName(product.name);

      // Debug: Log product image IDs
      console.log('📸 Product Settings - Product loaded:', {
        productId: product.id,
        name: product.name,
        productImageIds: product.productImageIds,
        imageCount: product.productImageIds?.length || 0,
      });
    }
  }, [product]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading product settings...</div>
      </div>
    );
  }

  if (!client || !product) {
    return null;
  }

  const handleSaveProductInfo = async () => {
    if (!productName.trim()) {
      error('Product name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await updateProduct(
        clientId,
        productId,
        {
          name: productName.trim(),
        },
        null
      );
      success('Product information updated successfully');
    } catch (err) {
      console.error('Failed to update product info:', err);
      error('Failed to update product information');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProductSettings = async (updates: Partial<Product>) => {
    try {
      await updateProduct(clientId, productId, updates, null);
      // Sync local productName state if name was updated
      if (updates.name) {
        setProductName(updates.name);
      }
      success('Product settings updated successfully');
    } catch (err) {
      console.error('Failed to update product settings:', err);
      error('Failed to update product settings');
      throw err;
    }
  };

  const handleDownloadBaseImages = async () => {
    if (!product.productImageIds || product.productImageIds.length === 0) {
      error('No base images to download');
      return;
    }

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const imageId of product.productImageIds) {
        const imageUrl = getPreviewImageUrl(clientId, productId, imageId);
        // Use proxy to avoid CORS issues
        const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(proxyUrl);
        const blob = await response.blob();
        zip.file(`${imageId}.jpg`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${product.name}-base-images.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success('Base images downloaded successfully');
    } catch (err) {
      console.error('Failed to download base images:', err);
      error('Failed to download base images');
    }
  };

  const handleGoToProductSessions = () => {
    if (product.sessions.length > 0) {
      router.push(`/${clientId}/${productId}/${product.sessions[0].id}`);
    } else {
      router.push(`/${clientId}/${productId}`);
    }
  };

  const handleBaseImageClick = (imageId: string) => {
    setSelectedBaseImageId(imageId);
  };

  const handleDeleteBaseImage = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    await confirm({
      title: 'Delete Base Image?',
      message: 'Are you sure you want to delete this base image? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Filter out the deleted image ID
          const updatedImageIds = product.productImageIds.filter((id) => id !== imageId);

          // Update product with new image list (S3 deletion will happen on the backend)
          await updateProduct(clientId, productId, { productImageIds: updatedImageIds }, null);

          success('Base image deleted successfully');

          // Clear selection if deleted image was selected
          if (selectedBaseImageId === imageId) {
            setSelectedBaseImageId(null);
          }
        } catch (err) {
          console.error('Failed to delete base image:', err);
          error('Failed to delete base image. Please try again.');
        }
      },
    });
  };

  const handleAddBaseImages = async (imageFiles: File[], jpegPreviews?: string[]) => {
    try {
      // Upload new images via updateProduct
      await updateProduct(clientId, productId, {}, imageFiles, jpegPreviews);
      success(`${imageFiles.length} image${imageFiles.length !== 1 ? 's' : ''} added successfully`);
    } catch (err) {
      console.error('Failed to add base images:', err);
      error('Failed to add base images. Please try again.');
      throw err; // Re-throw so modal can handle it
    }
  };

  const handleDeleteProduct = async () => {
    await confirm({
      title: 'Delete Product?',
      message: `Are you sure you want to delete "${product.name}"? This will permanently delete all product data, images, and sessions. This action cannot be undone.`,
      confirmLabel: 'Delete Product',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Navigate to client page (product list) FIRST to avoid 404 error
          console.log('Navigating to client page before delete to avoid 404');
          router.push(`/${clientId}/settings`);

          // Wait a bit for navigation to start
          await new Promise((resolve) => setTimeout(resolve, 600));

          // Now delete the product
          await deleteProduct(clientId, productId);
          success('Product deleted successfully');
        } catch (err) {
          console.error('Failed to delete product:', err);
          error('Failed to delete product. Please try again.');
        }
      },
    });
  };

  const favoriteImages = product.favoriteGeneratedImages || [];
  const hasFavorites = favoriteImages.length > 0;
  const hasBaseImages = product.productImageIds && product.productImageIds.length > 0;

  const baseImagesAccordionSections = [
    {
      value: 'base-images',
      title: hasBaseImages ? `Base Images (${product.productImageIds.length})` : 'Base Images',
      defaultExpanded: true,
      headerSuffix: hasBaseImages ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={styles.addButton}
            onClick={(e) => {
              e.stopPropagation();
              setIsAddImagesModalOpen(true);
            }}
            aria-label="Add base images"
            title="Add base images"
            data-testid={buildTestId('product-settings', 'add-base-images-button')}
          >
            <Plus size={16} />
            <span className={styles.addButtonText}>Add</span>
          </button>
          <button
            type="button"
            className={styles.downloadButton}
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadBaseImages();
            }}
            aria-label="Download all base images"
            title="Download all base images"
            data-testid={buildTestId('product-settings', 'download-base-images-button')}
          >
            <Download size={16} />
            <span className={styles.downloadButtonText}>Download All</span>
          </button>
        </div>
      ) : undefined,
      children: hasBaseImages ? (
        <div className={styles.imageGallery}>
          {product.productImageIds.map((imageId, index) => {
            const imageUrl = getPreviewImageUrl(clientId, productId, imageId);
            return (
              <div
                key={imageId}
                className={clsx(styles.imageCard, selectedBaseImageId === imageId && styles.imageCardSelected)}
                onClick={() => handleBaseImageClick(imageId)}
                data-testid={buildTestId('product-settings', 'base-image-card', imageId)}
              >
                <div className={styles.imageWrapper}>
                  <img src={imageUrl} alt={`${product.name} - View ${index + 1}`} className={styles.baseImage} />
                  <button
                    className={styles.deleteImageButton}
                    onClick={(e) => handleDeleteBaseImage(imageId, e)}
                    aria-label="Delete image"
                    title="Delete image"
                    data-testid={buildTestId('product-settings', 'delete-base-image-button', imageId)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className={styles.imageLabel}>View {index + 1}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <ImageIcon size={48} className={styles.emptyStateIcon} />
          <p className={styles.emptyStateText}>No base images yet</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setIsAddImagesModalOpen(true)}
            data-testid={buildTestId('product-settings', 'empty-add-base-images-button')}
          >
            <Plus size={18} />
            <span>Add Base Images</span>
          </button>
        </div>
      ),
    },
  ];

  const favoritesAccordionSections = hasFavorites
    ? [
      {
        value: 'favorites',
        title: `Favorite Generated Images (${favoriteImages.length})`,
        defaultExpanded: true,
        headerSuffix: (
          <button
            type="button"
            className={styles.viewAllButton}
            onClick={(e) => {
              e.stopPropagation();
              setIsFavoriteGalleryOpen(true);
            }}
            aria-label="View all favorite images"
            title="View all in gallery"
            data-testid={buildTestId('product-settings', 'view-all-favorites-button')}
          >
            <Star size={16} fill="currentColor" />
            <span className={styles.viewAllButtonText}>View All</span>
          </button>
        ),
        children: (
          <div className={styles.imageGallery}>
            {favoriteImages.slice(0, 6).map((fav) => {
              const session = product.sessions.find((s) => s.id === fav.sessionId);
              const imageUrl = getImageUrl(S3Paths.getMediaFilePath(clientId, productId, fav.sessionId, fav.imageId));
              const fallbackUrl = getImageUrl(S3Paths.getClientSessionMediaFilePath(clientId, fav.sessionId, fav.imageId));

              return (
                <div
                  key={fav.imageId}
                  className={styles.imageCard}
                  onClick={() => setIsFavoriteGalleryOpen(true)}
                  data-testid={buildTestId('product-settings', 'favorite-image-card', fav.imageId)}
                >
                  <div className={styles.imageWrapper}>
                    <SafeNextImage
                      src={imageUrl}
                      fallbackSrc={fallbackUrl}
                      alt={`Favorite from ${session?.name || 'session'}`}
                      className={styles.favoriteImage}
                      width={180}
                      height={180}
                      style={{ objectFit: 'cover' }}
                    />
                    <div className={styles.favoriteIcon}>
                      <Star size={16} fill="currentColor" />
                    </div>
                  </div>
                  <div className={styles.imageLabel}>{session?.name || 'Unknown Session'}</div>
                </div>
              );
            })}
          </div>
        ),
      },
    ]
    : [];

  const sessionsCount = product.sessions.length;

  const productCategoryLabel = product.category ? product.category : null;

  return (
    <div className={styles.container} data-testid={buildTestId('product-settings-page')}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{product.name}</h1>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => setIsEditSettingsModalOpen(true)}
            aria-label="Edit product settings"
            title="Edit product settings"
            data-testid={buildTestId('product-settings', 'edit-settings-button')}
          >
            <Pencil size={18} />
          </button>
        </div>
        <p className={styles.subtitle}>
          {productCategoryLabel && <span className={styles.productType}>{productCategoryLabel}</span>}
          {productCategoryLabel && ' • '}
          {product.productImageIds.length} base image{product.productImageIds.length !== 1 ? 's' : ''} • {favoriteImages.length} favorite
          {favoriteImages.length !== 1 ? 's' : ''} • {sessionsCount} session{sessionsCount !== 1 ? 's' : ''}
        </p>
        {product.description && <p className={styles.description}>{product.description}</p>}
      </div>

      <div className={styles.content}>
        <section className={clsx(styles.section, styles.productInfoSection)}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="product-name">
                Product Name
              </label>
              <input
                id="product-name"
                type="text"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                className={styles.input}
                placeholder="Enter product name"
                data-testid={buildTestId('product-settings', 'name-input')}
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleSaveProductInfo}
              disabled={isSaving || productName === product.name}
              className={styles.saveButton}
              aria-label={isSaving ? 'Saving product information' : 'Save product information'}
              aria-busy={isSaving}
              data-testid={buildTestId('product-settings', 'save-button')}
            >
              <Save size={18} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </section>

        {baseImagesAccordionSections.length > 0 && <Accordion isMobile={isMobile} sections={baseImagesAccordionSections} />}

        {favoritesAccordionSections.length > 0 && <Accordion isMobile={isMobile} sections={favoritesAccordionSections} />}

        {!hasBaseImages && !hasFavorites && (
          <section className={styles.section}>
            <div className={styles.emptyState}>
              <ImageIcon size={48} className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>No Images Yet</h3>
              <p className={styles.emptyDescription}>Base images and favorites will appear here once they are generated.</p>
            </div>
          </section>
        )}

        <DangerZone
          title="Danger Zone"
          description="Once you delete a product, there is no going back. All product data, images, and sessions will be permanently deleted."
          buttonLabel="Delete Product"
          onDelete={handleDeleteProduct}
          ariaLabel="Delete product"
        />
      </div>

      {isFavoriteGalleryOpen && (
        <FavoriteImagesGalleryModal
          isOpen={true}
          clientId={clientId}
          productId={product.id}
          favoriteImages={favoriteImages}
          productName={product.name}
          sessions={product.sessions}
          onClose={() => setIsFavoriteGalleryOpen(false)}
        />
      )}

      <AddBaseImagesModal
        isOpen={isAddImagesModalOpen}
        clientId={clientId}
        productId={productId}
        onClose={() => setIsAddImagesModalOpen(false)}
        onImagesAdded={handleAddBaseImages}
      />

      <EditProductSettingsModal
        isOpen={isEditSettingsModalOpen}
        product={product}
        onClose={() => setIsEditSettingsModalOpen(false)}
        onSave={handleSaveProductSettings}
      />

      {selectedBaseImageId && (
        <div
          className={styles.imageModal}
          onClick={() => setSelectedBaseImageId(null)}
          data-testid={buildTestId('product-settings', 'base-image-modal-overlay')}
        >
          <div
            className={styles.imageModalContent}
            onClick={(e) => e.stopPropagation()}
            data-testid={buildTestId('product-settings', 'base-image-modal-content')}
          >
            <button
              className={styles.imageModalClose}
              onClick={() => setSelectedBaseImageId(null)}
              aria-label="Close"
              data-testid={buildTestId('product-settings', 'base-image-modal-close')}
            >
              ×
            </button>
            <img
              src={getPreviewImageUrl(clientId, productId, selectedBaseImageId)}
              alt="Base image preview"
              className={styles.imageModalImage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
