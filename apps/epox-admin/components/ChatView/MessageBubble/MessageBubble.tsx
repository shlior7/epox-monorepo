'use client';

// Message Bubble Component

import * as S3Service from '@/lib/services/s3/browser';
import { ImageIcon, Loader2, Send } from 'lucide-react';
import { useData } from '../../../lib/contexts/DataContext';
import { ImageMessagePart, Message, Product } from '../../../lib/types/app-types';
import { GeneratedImage } from '../GeneratedImage/GeneratedImage';
import clsx from 'clsx';
import { buildTestId } from '@/lib/utils/test-ids';
import styles from './MessageBubble.module.scss';

export interface MessageBubbleProps {
  message: Message;
  clientId: string;
  productId?: string;
  sessionId: string;
  product?: Product;
  isClientSession?: boolean;
  sessionProducts?: Product[];
  onImageClick: (imageUrl: string) => void;
  onRetryGeneration?: (message: Message, part: ImageMessagePart) => void;
  // Multi-select props
  isMultiSelectMode?: boolean;
  selectedImages?: Set<string>;
  onImageSelection?: (imageId: string) => void;
}

export function MessageBubble({
  message,
  clientId,
  productId,
  sessionId,
  product,
  isClientSession,
  sessionProducts,
  onImageClick,
  onRetryGeneration,
  isMultiSelectMode = false,
  selectedImages = new Set(),
  onImageSelection,
}: MessageBubbleProps) {
  const { toggleFavoriteGeneratedImage } = useData();
  const isUser = message.role === 'user';

  const handleToggleFavorite = async (imageId: string, productIdOverride?: string) => {
    try {
      // In client sessions, the productId comes from the image part's productId
      // In single product sessions, use the prop
      const targetProductId = productIdOverride || productId;
      if (!targetProductId) {
        console.error('No product ID available for favorite toggle');
        return;
      }
      await toggleFavoriteGeneratedImage(clientId, targetProductId, imageId, sessionId);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  return (
    <div className={clsx(styles.messageWrapper, styles[message.role])}>
      <div className={clsx(styles.avatar, styles[message.role])}>{isUser ? 'You' : 'AI'}</div>
      <div className={clsx(styles.messageContent, styles[message.role])}>
        {isUser ? (
          // User Message Content
          <>
            {message.parts.map((part, index) => (
              <div key={index}>
                {part.type === 'text' && (
                  <div>
                    <div className={styles.promptCode}>{part.content}</div>
                  </div>
                )}
              </div>
            ))}

            {/* Show base image preview for single product mode */}
            {message.baseImageId && productId && (
              <div className={styles.baseImageSection}>
                <div className={styles.baseImageLabel}>Base Image:</div>
                <img
                  src={S3Service.getPreviewImageUrl(clientId, productId, message.baseImageId)}
                  alt="Base"
                  className={styles.baseImagePreview}
                  data-testid={buildTestId('message', message.id, 'base-image', message.baseImageId)}
                  onClick={() => onImageClick(S3Service.getPreviewImageUrl(clientId, productId!, message.baseImageId!))}
                />
              </div>
            )}

            {/* Show base images for multi-product mode */}
            {message.baseImageIds && isClientSession && sessionProducts && (
              <div className={styles.baseImageSection}>
                <div className={styles.baseImageLabel}>Base Images:</div>
                <div className={styles.baseImagesGrid}>
                  {Object.entries(message.baseImageIds).map(([prodId, imageId]) => {
                    const prod = sessionProducts.find((p) => p.id === prodId);
                    if (!prod) return null;
                    return (
                      <div key={prodId} className={styles.baseImageItem}>
                        <img
                          src={S3Service.getPreviewImageUrl(clientId, prodId, imageId)}
                          alt={prod.name}
                          title={prod.name}
                          className={styles.baseImageThumb}
                          data-testid={buildTestId('message', message.id, 'base-image', prodId, imageId)}
                          onClick={() => onImageClick(S3Service.getPreviewImageUrl(clientId, prodId, imageId))}
                        />
                        <div className={styles.baseImageName}>{prod.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          // Assistant Message Content
          message.parts.map((part, index) => (
            <div key={index}>
              {part.type === 'image' && (
                <>
                  {/* Product Name Header (for client sessions) */}
                  {part.metadata?.productName && (
                    <div className={styles.productNameHeader}>
                      <span className={styles.productIndicator} />
                      {part.metadata.productName}
                    </div>
                  )}

                  {/* Pending or Generating State */}
                  {(part.status === 'pending' || part.status === 'generating') && (
                    <div className={styles.loadingState}>
                      <div className={styles.loadingContent}>
                        <Loader2 className={styles.loadingSpinner} />
                        <div className={styles.loadingText}>
                          <div className={styles.loadingTitle}>
                            {part.status === 'pending' ? 'Queued for generation...' : 'Generating images...'}
                          </div>
                          {part.progress !== undefined && part.progress > 0 && (
                            <div className={styles.loadingProgress}>
                              {part.progress}% complete
                              {part.progress > 0 && part.progress < 100 && (
                                <span className={styles.eta}>• ETA: {Math.ceil((100 - part.progress) / 10)}s</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {part.progress !== undefined && part.progress > 0 && (
                        <div className={styles.progressBarContainer}>
                          <div className={styles.progressBar} style={{ width: `${part.progress}%` }} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error State */}
                  {part.status === 'error' && (
                    <div className={styles.errorState}>
                      <div className={styles.errorTitle}>❌ Generation failed</div>
                      {part.error && <div className={styles.errorMessage}>{part.error}</div>}
                      {onRetryGeneration && (
                        <button
                          onClick={() => onRetryGeneration(message, part as ImageMessagePart)}
                          className={styles.retryButton}
                          data-testid={buildTestId('message', message.id, 'retry-generation')}
                        >
                          <Send className={styles.retryIcon} />
                          Try Again
                        </button>
                      )}
                    </div>
                  )}

                  {/* Completed State - Show Images */}
                  {part.status === 'completed' && part.imageIds.length > 0 && (
                    <div className={styles.imageGrid}>
                      {part.imageIds.map((imageId) => {
                        // In client sessions, use the part's productId; in single product sessions, use the prop
                        const targetProductId = isClientSession ? part.productId! : productId!;
                        const targetSessionId = sessionId!; // sessionId is now effectiveSessionId for both modes

                        const imageUrl = isClientSession
                          ? S3Service.getImageUrl(S3Service.S3Paths.getClientSessionMediaFilePath(clientId, targetSessionId, imageId))
                          : S3Service.getImageUrl(S3Service.S3Paths.getMediaFilePath(clientId, targetProductId, targetSessionId, imageId));

                        const targetProduct = isClientSession ? sessionProducts?.find((p) => p.id === targetProductId) : product;
                        // TODO: Check pinned on generated_asset instead
                        const isFavorite = false;
                        const productName = isClientSession ? targetProduct?.name : undefined;

                        return (
                          <GeneratedImage
                            key={imageId}
                            imageId={imageId}
                            imageUrl={imageUrl}
                            clientId={clientId}
                            productId={targetProductId}
                            productName={productName}
                            isFavorite={isFavorite}
                            onImageClick={onImageClick}
                            onToggleFavorite={(id) => handleToggleFavorite(id, targetProductId)}
                            isMultiSelectMode={isMultiSelectMode}
                            isSelected={selectedImages.has(imageId)}
                            onToggleSelection={onImageSelection}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Legacy: No status field (for backwards compatibility) */}
                  {!part.status && part.imageIds.length > 0 && !isClientSession && (
                    <div className={styles.imageGrid}>
                      {part.imageIds.map((imageId) => {
                        const imageUrl = S3Service.getImageUrl(
                          S3Service.S3Paths.getMediaFilePath(clientId, productId!, sessionId!, imageId)
                        );
                        // TODO: Check pinned on generated_asset instead
                        const isFavorite = false;
                        return (
                          <GeneratedImage
                            key={imageId}
                            imageId={imageId}
                            imageUrl={imageUrl}
                            clientId={clientId}
                            productId={productId!}
                            isFavorite={isFavorite}
                            onImageClick={onImageClick}
                            onToggleFavorite={handleToggleFavorite}
                            isMultiSelectMode={isMultiSelectMode}
                            isSelected={selectedImages.has(imageId)}
                            onToggleSelection={onImageSelection}
                          />
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}

        {message.inspirationImageId && (
          <div className={styles.baseImageSection}>
            <div className={styles.baseImageLabel}>Inspiration Image:</div>
            <img
              src={
                isClientSession
                  ? S3Service.getImageUrl(S3Service.S3Paths.getClientSessionMediaFilePath(clientId, sessionId, message.inspirationImageId))
                  : S3Service.getImageUrl(S3Service.S3Paths.getMediaFilePath(clientId, productId!, sessionId, message.inspirationImageId))
              }
              alt="Inspiration"
              className={styles.baseImagePreview}
              onClick={() =>
                onImageClick(
                  isClientSession
                    ? S3Service.getImageUrl(
                        S3Service.S3Paths.getClientSessionMediaFilePath(clientId, sessionId, message.inspirationImageId!)
                      )
                    : S3Service.getImageUrl(
                        S3Service.S3Paths.getMediaFilePath(clientId, productId!, sessionId, message.inspirationImageId!)
                      )
                )
              }
            />
          </div>
        )}
        <div className={clsx(styles.timestamp, isUser && styles.user)}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
