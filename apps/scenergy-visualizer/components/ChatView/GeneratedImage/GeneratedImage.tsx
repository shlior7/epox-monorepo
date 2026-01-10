'use client';

// Generated Image Component with Favorite functionality

import { Star } from 'lucide-react';
import clsx from 'clsx';
import { buildTestId } from '@/lib/utils/test-ids';
import styles from './GeneratedImage.module.scss';

export interface GeneratedImageProps {
  imageId: string;
  imageUrl: string;
  clientId: string;
  productId: string;
  productName?: string; // Optional product name for client sessions
  isFavorite: boolean;
  onImageClick: (imageUrl: string) => void;
  onToggleFavorite: (imageId: string) => void;
  // Multi-select props
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (imageId: string) => void;
}

export function GeneratedImage({
  imageId,
  imageUrl,
  clientId,
  productId,
  productName,
  isFavorite,
  onImageClick,
  onToggleFavorite,
  isMultiSelectMode = false,
  isSelected = false,
  onToggleSelection,
}: GeneratedImageProps) {
  return (
    <div
      key={imageId}
      className={clsx(styles.imageWrapper, {
        [styles.multiSelect]: isMultiSelectMode,
        [styles.selected]: isSelected,
      })}
      data-testid={buildTestId('generated-image', imageId)}
      onClick={() => {
        if (isMultiSelectMode && onToggleSelection) {
          onToggleSelection(imageId);
        } else {
          onImageClick(imageUrl);
        }
      }}
    >
      <img src={imageUrl} alt="Generated" className={styles.image} loading="lazy" />

      {/* Multi-select checkbox */}
      {isMultiSelectMode && (
        <div className={clsx(styles.checkbox, { [styles.checked]: isSelected })}>
          {isSelected && (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}

      {/* Product Name Label - Show for client sessions */}
      {productName && <div className={styles.productLabel}>{productName}</div>}

      {/* Star Icon - Hidden in multi-select mode, visibility controlled by CSS */}
      {!isMultiSelectMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(imageId);
          }}
          className={clsx(styles.favoriteButton, { [styles.favorited]: isFavorite })}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          data-testid={buildTestId('generated-image', imageId, 'favorite-toggle')}
        >
          <Star />
        </button>
      )}
    </div>
  );
}
