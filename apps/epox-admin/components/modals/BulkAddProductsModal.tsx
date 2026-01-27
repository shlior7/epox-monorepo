'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useData } from '@/lib/contexts/DataContext';
import { apiClient } from '@/lib/api-client';
import { commonStyles, colors } from '@/lib/styles/common-styles';
import { X, Upload, Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { BulkGLBPreview, type BulkGLBPreviewHandle } from './BulkGLBPreview';
import type { CameraSettings as ProcessorCameraSettings } from '@/lib/services/product-image-processor';
import { buildTestId } from '@/lib/utils/test-ids';

interface BulkAddProductsModalProps {
  isOpen: boolean;
  clientId: string;
  onClose: () => void;
}

interface CameraDefaults {
  radius: number;
  minRadius: number;
  maxRadius: number;
}

interface CameraSettings {
  alpha: number;
  beta: number;
  radius?: number;
  fov: number;
  defaults?: CameraDefaults;
}

interface CapturedImage {
  file: File;
  jpegPreview: string;
  cameraState: CameraSettings;
}

interface ProductProcessingState {
  name: string;
  file: File;
  status: 'pending' | 'capturing' | 'ready' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  capturedImages: CapturedImage[];
  camera: CameraSettings;
  isExpanded?: boolean;
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
  },
  body: {
    padding: '24px',
    maxHeight: '70vh',
    overflowY: 'auto' as const,
  },
  uploadZone: {
    width: '100%',
    border: `2px dashed ${colors.slate[600]}`,
    borderRadius: '12px',
    padding: '48px 24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'border-color 0.2s, background-color 0.2s',
    backgroundColor: colors.slate[900],
    marginBottom: '24px',
  },
  uploadIcon: {
    width: '48px',
    height: '48px',
    margin: '0 auto 16px',
    color: colors.slate[400],
  },
  uploadText: {
    fontSize: '16px',
    fontWeight: 500,
    color: colors.slate[300],
    marginBottom: '8px',
  },
  uploadSubtext: {
    fontSize: '14px',
    color: colors.slate[500],
  },
  productList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginTop: '24px',
  },
  productItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: colors.slate[800],
    borderRadius: '8px',
    border: `1px solid ${colors.slate[700]}`,
  },
  productName: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 500,
    color: colors.slate[100],
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    alignSelf: 'flex-start' as const,
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: colors.slate[700],
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.indigo[500],
    transition: 'width 0.3s ease',
  },
  footer: {
    padding: '20px',
    borderTop: `1px solid ${colors.slate[700]}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: '14px',
    color: colors.slate[400],
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },
};

export function BulkAddProductsModal({ isOpen, clientId, onClose }: BulkAddProductsModalProps) {
  const { addProduct, updateProduct, refreshData } = useData();
  const [products, setProducts] = useState<ProductProcessingState[]>([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<BulkGLBPreviewHandle>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) => file.name.toLowerCase().endsWith('.glb'));

    const newProducts: ProductProcessingState[] = files.map((file) => ({
      name: file.name.replace(/\.glb$/i, ''),
      file,
      status: 'pending',
      progress: 0,
      capturedImages: [],
      camera: {
        alpha: 0,
        beta: Math.PI / 3,
        fov: 0.8,
      },
      isExpanded: false,
    }));

    setProducts(newProducts);
    setCurrentProductIndex(0);
  };

  const handleCameraUpdate = useCallback(
    (index: number, cameraUpdate: { alpha: number; beta: number; radius: number; fov: number; defaults?: CameraDefaults }) => {
      setProducts((prev) =>
        prev.map((product, idx) => {
          if (idx !== index) return product;

          const prevCamera = product.camera;
          const prevDefaults = prevCamera.defaults;
          const nextDefaults = cameraUpdate.defaults ?? prevDefaults;

          const alphaChanged = Math.abs(prevCamera.alpha - cameraUpdate.alpha) > 0.0001;
          const betaChanged = Math.abs(prevCamera.beta - cameraUpdate.beta) > 0.0001;
          const radiusChanged = prevCamera.radius === undefined ? true : Math.abs((prevCamera.radius ?? 0) - cameraUpdate.radius) > 0.0001;
          const fovChanged = Math.abs(prevCamera.fov - cameraUpdate.fov) > 0.0001;
          const defaultsChanged =
            cameraUpdate.defaults !== undefined
              ? !prevDefaults ||
                Math.abs(prevDefaults.radius - cameraUpdate.defaults.radius) > 0.0001 ||
                Math.abs(prevDefaults.minRadius - cameraUpdate.defaults.minRadius) > 0.0001 ||
                Math.abs(prevDefaults.maxRadius - cameraUpdate.defaults.maxRadius) > 0.0001
              : false;

          if (!alphaChanged && !betaChanged && !radiusChanged && !fovChanged && !defaultsChanged) {
            return product;
          }

          return {
            ...product,
            camera: {
              alpha: cameraUpdate.alpha,
              beta: cameraUpdate.beta,
              radius: cameraUpdate.radius,
              fov: cameraUpdate.fov,
              defaults: nextDefaults,
            },
          };
        })
      );
    },
    []
  );

  const handleTakeScreenshot = async () => {
    const index = currentProductIndex;
    const product = products[index];
    if (!product || !previewRef.current) return;

    setProducts((prev) =>
      prev.map((p, idx) =>
        idx === index
          ? {
              ...p,
              status: 'capturing',
            }
          : p
      )
    );

    try {
      const result = await previewRef.current.captureScreenshot();

      if (!result) {
        throw new Error('Failed to capture screenshot');
      }

      console.log('📸 Screenshot captured for', product.name, {
        alpha: result.cameraState.alpha.toFixed(3),
        beta: result.cameraState.beta.toFixed(3),
        radius: result.cameraState.radius.toFixed(3),
        fov: result.cameraState.fov.toFixed(3),
      });

      // Convert data URL to File with UUID
      const { v4: uuidv4 } = await import('uuid');
      const imageId = uuidv4();
      const { dataUrlToFile } = await import('@/lib/services/glb-renderer');
      const pngFile = dataUrlToFile(result.dataUrl, `${imageId}.png`);

      const newImage: CapturedImage = {
        file: pngFile,
        jpegPreview: result.jpegPreview,
        cameraState: result.cameraState,
      };

      setProducts((prev) =>
        prev.map((p, idx) =>
          idx === index
            ? {
                ...p,
                status: 'ready', // Always set to 'ready' after successful capture
                capturedImages: [...p.capturedImages, newImage],
              }
            : p
        )
      );

      console.log(`✅ Screenshot added. Product now has ${product.capturedImages.length + 1} images`);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      setProducts((prev) =>
        prev.map((p, idx) =>
          idx === index
            ? {
                ...p,
                status: 'error',
                error: 'Failed to capture screenshot',
              }
            : p
        )
      );
    }
  };

  const handleDeleteImage = (productIndex: number, imageIndex: number) => {
    setProducts((prev) =>
      prev.map((p, idx) => {
        if (idx !== productIndex) return p;

        const newImages = p.capturedImages.filter((_, i) => i !== imageIndex);
        return {
          ...p,
          capturedImages: newImages,
          status: newImages.length === 0 ? 'pending' : p.status,
        };
      })
    );
  };

  const handleUploadProduct = (index: number) => {
    const product = products[index];
    if (!product || product.capturedImages.length === 0) {
      return;
    }

    const fileSnapshot = product.file;
    const nameSnapshot = product.name;
    const imagesSnapshot = [...product.capturedImages];

    setProducts((prev) =>
      prev.map((p, idx) =>
        idx === index
          ? {
              ...p,
              status: 'uploading',
              progress: 0,
              error: undefined,
            }
          : p
      )
    );

    // Start upload in background (non-blocking)
    (async () => {
      try {
        const imageFiles = imagesSnapshot.map((img) => img.file);
        const jpegPreviews = imagesSnapshot.map((img) => img.jpegPreview);

        console.log(`📦 Uploading product ${nameSnapshot} with ${imageFiles.length} images...`);

        setProducts((prev) => prev.map((p, idx) => (idx === index ? { ...p, progress: 10 } : p)));

        const createdProduct = await addProduct(clientId, nameSnapshot, '', imageFiles);
        console.log(`✅ Product created:`, {
          productId: createdProduct.id,
          name: createdProduct.name,
          imageIdsCount: createdProduct.productImageIds?.length || 0,
        });

        setProducts((prev) => prev.map((p, idx) => (idx === index ? { ...p, progress: 50 } : p)));

        const glbFilename = `${createdProduct.id}.glb`;
        await apiClient.uploadProductModel(clientId, createdProduct.id, glbFilename, fileSnapshot);
        await updateProduct(
          clientId,
          createdProduct.id,
          {
            modelFilename: glbFilename,
            productImageIds: createdProduct.productImageIds,
          },
          null
        );

        setProducts((prev) => prev.map((p, idx) => (idx === index ? { ...p, progress: 75 } : p)));

        if (jpegPreviews.length > 0 && createdProduct.productImageIds) {
          console.log(`📤 Uploading ${jpegPreviews.length} JPEG previews...`);

          await Promise.all(
            createdProduct.productImageIds.map(async (imageId, previewIndex) => {
              if (jpegPreviews[previewIndex]) {
                await apiClient.uploadProductImagePreview(clientId, createdProduct.id, imageId, jpegPreviews[previewIndex]);
              }
            })
          );
        }

        setProducts((prev) =>
          prev.map((p, idx) =>
            idx === index
              ? {
                  ...p,
                  status: 'completed',
                  progress: 100,
                }
              : p
          )
        );

        console.log(`✅ Product ${nameSnapshot} completed successfully`);
      } catch (error) {
        console.error(`Failed to upload product ${nameSnapshot}:`, error);
        setProducts((prev) =>
          prev.map((p, idx) =>
            idx === index
              ? {
                  ...p,
                  status: 'error',
                  progress: 0,
                  error: error instanceof Error ? error.message : 'Unknown error',
                }
              : p
          )
        );
      }
    })();
  };

  const handleUploadAndContinue = async () => {
    const index = currentProductIndex;
    const product = products[index];
    const isLast = index === products.length - 1;

    if (!product || product.capturedImages.length === 0) {
      // No images, just skip to next or finish
      if (isLast) {
        await handleClose();
      } else {
        await handleNextProduct();
      }
      return;
    }

    // Start upload in background
    handleUploadProduct(index);

    // If last product, close modal (upload continues in background)
    // Otherwise, advance to next product
    if (isLast) {
      // Give a brief moment for the upload status to show
      await new Promise((resolve) => setTimeout(resolve, 100));
      await handleClose();
    } else {
      await handleNextProduct();
    }
  };

  const handleToggleExpanded = (index: number) => {
    setProducts((prev) => prev.map((p, idx) => (idx === index ? { ...p, isExpanded: !p.isExpanded } : p)));
  };

  const handleReturnToPreview = async (index: number) => {
    if (index === currentProductIndex) {
      // Already on this product
      return;
    }

    const product = products[index];
    if (!product || !previewRef.current) return;

    // Load the product's GLB in the preview
    await previewRef.current.loadNextModel(product.file, {
      beta: product.camera.beta,
      radius: product.camera.radius,
      fov: product.camera.fov,
    });

    setCurrentProductIndex(index);
  };

  const handleNextProduct = async () => {
    if (currentProductIndex < products.length - 1) {
      const nextIndex = currentProductIndex + 1;
      const nextProduct = products[nextIndex];

      // Load next model in the same scene
      if (nextProduct && previewRef.current) {
        await previewRef.current.loadNextModel(nextProduct.file, {
          beta: nextProduct.camera.beta,
          radius: nextProduct.camera.radius,
          fov: nextProduct.camera.fov,
        });
      }

      setCurrentProductIndex(nextIndex);
    }
  };

  const handleClose = async () => {
    const hasUploading = products.some((product) => product.status === 'uploading');
    if (hasUploading) {
      if (!confirm('Some products are still uploading. Are you sure you want to close?')) {
        return;
      }
    }

    // Check if any products were successfully completed
    const hasCompleted = products.some((product) => product.status === 'completed');
    if (hasCompleted) {
      console.log('🔄 Refreshing client data after bulk upload...');
      await refreshData();
      console.log('✅ Client data refreshed');
    }

    setProducts([]);
    setCurrentProductIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  const allCompleted = products.length > 0 && products.every((p) => p.status === 'completed');
  const currentProduct = products[currentProductIndex];
  const isLastProduct = currentProductIndex === products.length - 1;
  const currentStatus = currentProduct?.status;
  const hasActiveUploading = products.some((product) => product.status === 'uploading');
  const hasImagesCaptured = currentProduct?.capturedImages.length > 0;

  let primaryAction: (() => void | Promise<void>) | undefined;
  let primaryButtonDisabled = false;
  let primaryLabel: React.ReactNode = 'Next Product';

  if (!currentProduct) {
    primaryAction = undefined;
    primaryButtonDisabled = true;
  } else if (currentStatus === 'capturing') {
    primaryAction = undefined;
    primaryButtonDisabled = true;
    primaryLabel = (
      <>
        <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
        Capturing...
      </>
    );
  } else if (currentStatus === 'uploading') {
    // Allow moving to next even while uploading
    primaryAction = handleNextProduct;
    primaryLabel = 'Next Product';
  } else if (currentStatus === 'completed') {
    if (isLastProduct && allCompleted) {
      primaryAction = handleClose;
      primaryLabel = 'Finish';
    } else {
      primaryAction = handleNextProduct;
      primaryLabel = 'Next Product';
    }
  } else if (currentStatus === 'ready' && hasImagesCaptured) {
    // Product has images, upload and continue
    primaryAction = handleUploadAndContinue;
    primaryLabel = isLastProduct ? 'Upload & Finish' : 'Upload & Continue';
  } else {
    // Status is 'pending' or 'error' or ready without images
    primaryAction = isLastProduct && allCompleted ? handleClose : handleNextProduct;
    primaryButtonDisabled = products.length === 0;
    primaryLabel = isLastProduct ? 'Finish' : 'Skip';
  }

  let infoMessage = 'Ready to capture screenshots';

  if (products.length === 0) {
    infoMessage = 'Select GLB files to begin';
  } else if (currentStatus === 'capturing') {
    infoMessage = 'Taking screenshot...';
  } else if (currentStatus === 'uploading') {
    infoMessage = `Uploading ${currentProduct?.name} in the background... ${Math.round(currentProduct?.progress || 0)}%`;
  } else if (currentStatus === 'error') {
    infoMessage = currentProduct?.error ? `Error: ${currentProduct.error}` : 'An error occurred. Adjust and try again.';
  } else if (currentStatus === 'completed') {
    infoMessage = isLastProduct && allCompleted ? 'All products uploaded successfully!' : 'Product uploaded. Continue to the next.';
  } else if (currentStatus === 'ready' && hasImagesCaptured) {
    infoMessage = `${currentProduct?.capturedImages.length} screenshot(s) captured. Click to upload and continue.`;
  } else {
    infoMessage = hasActiveUploading
      ? 'Adjust camera and take screenshots while uploads continue in the background.'
      : 'Adjust camera angle, zoom, and FOV, then take screenshots.';
  }

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      data-testid={buildTestId('bulk-add-products-modal', 'overlay')}
    >
      <div
        style={{ ...styles.content, maxWidth: '700px' }}
        onClick={(e) => e.stopPropagation()}
        data-testid={buildTestId('bulk-add-products-modal', 'content')}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>Bulk Add Products</h2>
          <button
            onClick={handleClose}
            style={{
              ...commonStyles.button.icon,
              color: colors.slate[400],
            }}
            data-testid={buildTestId('bulk-add-products-modal', 'close-button')}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={styles.body}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            data-testid={buildTestId('bulk-add-products-modal', 'file-input')}
          />

          {products.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={styles.uploadZone}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.indigo[500];
                e.currentTarget.style.backgroundColor = colors.slate[800];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.slate[600];
                e.currentTarget.style.backgroundColor = colors.slate[900];
              }}
              data-testid={buildTestId('bulk-add-products-modal', 'upload-zone')}
            >
              <Upload style={styles.uploadIcon} />
              <div style={styles.uploadText}>Click to select GLB files</div>
              <div style={styles.uploadSubtext}>Select one or more .glb files to process</div>
            </div>
          ) : currentProduct ? (
            <>
              <div
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={styles.infoText}>
                  {products.length} file{products.length !== 1 ? 's' : ''} selected
                </div>
                {!hasActiveUploading && (
                  <button
                    onClick={() => {
                      setProducts([]);
                      setCurrentProductIndex(0);
                      fileInputRef.current?.click();
                    }}
                    style={{ ...commonStyles.button.secondary, fontSize: '13px', padding: '6px 12px' }}
                    data-testid={buildTestId('bulk-add-products-modal', 'change-files-button')}
                  >
                    Change Files
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    padding: '20px',
                    borderRadius: '12px',
                    border: `1px solid ${colors.slate[700]}`,
                    backgroundColor: colors.slate[900],
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.slate[100] }}>
                      Product {currentProductIndex + 1} of {products.length}
                    </h3>
                    <span style={{ fontSize: '13px', color: colors.slate[400] }}>{currentProduct.name}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: colors.slate[400], margin: 0 }}>
                    Adjust camera angle, zoom, and field of view, then take screenshots. You can take multiple screenshots from different
                    perspectives.
                  </p>
                  <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                    <BulkGLBPreview
                      ref={previewRef}
                      initialSource={currentProduct.file}
                      initialCamera={{
                        beta: currentProduct.camera.beta,
                        radius: currentProduct.camera.radius,
                        fov: currentProduct.camera.fov,
                      }}
                      disabled={currentStatus === 'uploading' || currentStatus === 'completed' || currentStatus === 'capturing'}
                      onCameraReady={(camera: { alpha: number; beta: number; radius: number; fov: number; defaults?: CameraDefaults }) =>
                        handleCameraUpdate(currentProductIndex, camera)
                      }
                    />
                    {/* Take Screenshot Button */}
                    <div style={{ marginTop: '16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={handleTakeScreenshot}
                        disabled={currentStatus === 'capturing' || currentStatus === 'uploading' || currentStatus === 'completed'}
                        style={{
                          ...commonStyles.button.primary,
                          padding: '10px 24px',
                          opacity:
                            currentStatus === 'capturing' || currentStatus === 'uploading' || currentStatus === 'completed' ? 0.6 : 1,
                          cursor:
                            currentStatus === 'capturing' || currentStatus === 'uploading' || currentStatus === 'completed'
                              ? 'not-allowed'
                              : 'pointer',
                        }}
                        data-testid={buildTestId('bulk-add-products-modal', 'take-screenshot-button')}
                      >
                        {currentStatus === 'capturing' ? 'Taking Screenshot...' : '📸 Take Screenshot'}
                      </button>
                    </div>
                  </div>
                  {currentStatus === 'error' && (
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.red[700]}`,
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        color: colors.red[600],
                        fontSize: '13px',
                      }}
                    >
                      {currentProduct.error ?? 'Something went wrong. Adjust the camera and try again.'}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: colors.slate[300], marginBottom: '12px' }}>Product Queue</div>
                  <div style={styles.productList}>
                    {products.map((product, index) => {
                      const isCurrent = index === currentProductIndex;
                      const status = product.status;
                      const numImages = product.capturedImages.length;
                      const statusMessage =
                        status === 'completed'
                          ? 'Uploaded successfully'
                          : status === 'uploading'
                            ? `Uploading... ${Math.round(product.progress)}%`
                            : status === 'capturing'
                              ? 'Capturing screenshot...'
                              : status === 'ready'
                                ? `${numImages} screenshot${numImages !== 1 ? 's' : ''} ready`
                                : status === 'error'
                                  ? (product.error ?? 'Error occurred')
                                  : 'No screenshots yet';

                      return (
                        <div key={index}>
                          <div
                            style={{
                              ...styles.productItem,
                              border: `1px solid ${isCurrent ? colors.indigo[500] : colors.slate[700]}`,
                              backgroundColor: isCurrent ? colors.slate[800] : colors.slate[900],
                              cursor: numImages > 0 ? 'pointer' : 'default',
                            }}
                            onClick={() => numImages > 0 && handleToggleExpanded(index)}
                            data-testid={buildTestId('bulk-add-products-modal', 'queue-item', index)}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {numImages > 0 && (
                                  <span style={{ color: colors.slate[400] }}>
                                    {product.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </span>
                                )}
                                <div style={styles.productName}>{product.name}</div>
                                {isCurrent && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: colors.indigo[300],
                                      border: `1px solid ${colors.indigo[500]}`,
                                      borderRadius: '999px',
                                      padding: '2px 8px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    Current
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: colors.slate[400], marginTop: '4px' }}>{statusMessage}</div>
                              {status === 'uploading' && (
                                <div style={styles.progressBar}>
                                  <div style={{ ...styles.progressFill, width: `${product.progress}%` }} />
                                </div>
                              )}
                              {status === 'error' && (
                                <div style={{ fontSize: '12px', color: colors.red[600], marginTop: '4px' }}>
                                  {product.error ?? 'Unknown error'}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {status === 'ready' && !isCurrent && numImages > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReturnToPreview(index);
                                  }}
                                  style={{
                                    ...commonStyles.button.secondary,
                                    fontSize: '12px',
                                    padding: '4px 10px',
                                  }}
                                  data-testid={buildTestId('bulk-add-products-modal', 'edit-product-button', index)}
                                >
                                  Edit
                                </button>
                              )}
                              {status === 'pending' && (
                                <div
                                  style={{
                                    ...styles.statusBadge,
                                    backgroundColor: colors.slate[700],
                                    color: colors.slate[300],
                                  }}
                                >
                                  Pending
                                </div>
                              )}
                              {status === 'capturing' && (
                                <Loader2
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    color: colors.indigo[400],
                                    animation: 'spin 1s linear infinite',
                                  }}
                                />
                              )}
                              {status === 'uploading' && (
                                <Loader2
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    color: colors.indigo[400],
                                    animation: 'spin 1s linear infinite',
                                  }}
                                />
                              )}
                              {status === 'completed' && (
                                <CheckCircle style={{ width: '20px', height: '20px', color: colors.green[400] }} />
                              )}
                              {status === 'error' && <XCircle style={{ width: '20px', height: '20px', color: colors.red[600] }} />}
                            </div>
                          </div>

                          {/* Expanded content showing captured images */}
                          {product.isExpanded && numImages > 0 && (
                            <div
                              style={{
                                marginTop: '8px',
                                marginLeft: '16px',
                                padding: '12px',
                                backgroundColor: colors.slate[900],
                                borderRadius: '8px',
                                border: `1px solid ${colors.slate[700]}`,
                              }}
                            >
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                  gap: '12px',
                                }}
                              >
                                {product.capturedImages.map((img, imgIndex) => (
                                  <div key={imgIndex} style={{ position: 'relative' }}>
                                    <img
                                      src={img.jpegPreview}
                                      alt={`Screenshot ${imgIndex + 1}`}
                                      style={{
                                        width: '100%',
                                        aspectRatio: '1',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        border: `1px solid ${colors.slate[700]}`,
                                      }}
                                    />
                                    {status !== 'uploading' && status !== 'completed' && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteImage(index, imgIndex)}
                                        style={{
                                          position: 'absolute',
                                          top: '4px',
                                          right: '4px',
                                          background: colors.red[600],
                                          border: 'none',
                                          borderRadius: '4px',
                                          padding: '4px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#ffffff',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        }}
                                        title="Remove screenshot"
                                        data-testid={buildTestId('bulk-add-products-modal', 'remove-screenshot', index, imgIndex)}
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div style={styles.footer}>
          <div style={styles.infoText}>{infoMessage}</div>
          <div style={styles.buttonGroup}>
            <button
              onClick={handleClose}
              style={{
                ...commonStyles.button.secondary,
              }}
              data-testid={buildTestId('bulk-add-products-modal', 'cancel-button')}
            >
              {allCompleted ? 'Close' : 'Cancel'}
            </button>
            {products.length > 0 && (
              <button
                onClick={() => primaryAction?.()}
                disabled={primaryButtonDisabled || !primaryAction}
                style={{
                  ...commonStyles.button.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: primaryButtonDisabled || !primaryAction ? 0.5 : 1,
                }}
                data-testid={buildTestId('bulk-add-products-modal', 'primary-button')}
              >
                {primaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
