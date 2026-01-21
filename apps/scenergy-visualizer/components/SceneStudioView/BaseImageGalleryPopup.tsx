'use client';

import React, { useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import clsx from 'clsx';
import type { Product } from '@/lib/types/app-types';
import * as S3Service from '@/lib/services/s3/browser';
import styles from './SceneStudioView.module.scss';

interface BaseImageGalleryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  clientId: string;
  currentImageId: string;
  onSelectImage: (imageId: string) => void;
}

export function BaseImageGalleryPopup({ isOpen, onClose, product, clientId, currentImageId, onSelectImage }: BaseImageGalleryPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getImageUrl = (imageId: string): string => {
    return S3Service.getImageUrl(S3Service.S3Paths.getProductImageBasePath(clientId, product.id, imageId));
  };

  const handleSelectImage = (imageId: string) => {
    onSelectImage(imageId);
    onClose();
  };

  return (
    <div className={styles.baseImagePopupOverlay}>
      <div className={styles.baseImagePopup} ref={popupRef}>
        <div className={styles.baseImagePopupHeader}>
          <h4>Select Base Image</h4>
          <button className={styles.baseImagePopupClose} onClick={onClose} type="button" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p className={styles.baseImagePopupSubtitle}>Choose a base image for {product.name}</p>
        <div className={styles.baseImageGrid}>
          {product.productImageIds.map((imageId) => {
            const isSelected = imageId === currentImageId;
            return (
              <button
                key={imageId}
                className={clsx(styles.baseImageOption, {
                  [styles.selected]: isSelected,
                })}
                onClick={() => handleSelectImage(imageId)}
                type="button"
                title={isSelected ? 'Currently selected' : 'Select this image'}
              >
                <img src={getImageUrl(imageId)} alt={`${product.name} - base image`} loading="lazy" draggable={false} />
                {isSelected && (
                  <div className={styles.selectedBadge}>
                    <Check size={12} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
