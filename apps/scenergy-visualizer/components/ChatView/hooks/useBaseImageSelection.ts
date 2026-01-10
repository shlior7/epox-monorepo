// hooks/useBaseImageSelection.ts
import { useState, useEffect } from 'react';
import type { Product, Session, ClientSession } from '@/lib/types/app-types';

export function useBaseImageSelection(
  product?: Product,
  session?: Session,
  clientSession?: ClientSession,
  sessionProducts?: Product[],
  isClientSession?: boolean,
  updateSession?: (clientId: string, productId: string, sessionId: string, updates: Partial<Session>) => Promise<void>,
  updateClientSession?: (clientId: string, sessionId: string, updates: Partial<ClientSession>) => Promise<void>,
  clientId?: string
) {
  const [selectedProductImageId, setSelectedProductImageId] = useState<string | null>(null);
  const [selectedBaseImages, setSelectedBaseImages] = useState<{ [productId: string]: string }>({});

  // Single product mode - initialize from product/session
  useEffect(() => {
    if (product?.productImageIds && product.productImageIds.length > 0) {
      setSelectedProductImageId((prev) => {
        const savedSelection = session?.selectedBaseImageId;
        if (savedSelection && product.productImageIds.includes(savedSelection)) {
          return savedSelection;
        }
        if (!prev || !product.productImageIds.includes(prev)) {
          return product.productImageIds[0];
        }
        return prev;
      });
    }
  }, [product, session]);

  // Multi-product mode - initialize from client session
  useEffect(() => {
    if (isClientSession && clientSession && sessionProducts) {
      setSelectedBaseImages((prev) => {
        const updatedSelection: { [productId: string]: string } = {};

        sessionProducts.forEach((prod) => {
          if (!prod.productImageIds || prod.productImageIds.length === 0) return;

          const savedSelection = clientSession.selectedBaseImages?.[prod.id];
          const currentSelection = prev[prod.id];

          if (savedSelection && prod.productImageIds.includes(savedSelection)) {
            updatedSelection[prod.id] = savedSelection;
          } else if (currentSelection && prod.productImageIds.includes(currentSelection)) {
            updatedSelection[prod.id] = currentSelection;
          } else {
            updatedSelection[prod.id] = prod.productImageIds[0];
          }
        });

        return updatedSelection;
      });
    }
  }, [isClientSession, clientSession, sessionProducts]);

  const handleSelectedProductImageChange = async (imageId: string, productId?: string, sessionId?: string) => {
    setSelectedProductImageId(imageId);

    if (!isClientSession && productId && sessionId && updateSession && clientId) {
      try {
        await updateSession(clientId, productId, sessionId, {
          selectedBaseImageId: imageId,
        });
      } catch (error) {
        console.error('Failed to save selected base image:', error);
      }
    }
  };

  const handleSelectedBaseImagesChange = async (newSelection: { [productId: string]: string }) => {
    setSelectedBaseImages(newSelection);

    if (isClientSession && clientSession && updateClientSession && clientId) {
      try {
        await updateClientSession(clientId, clientSession.id, {
          selectedBaseImages: newSelection,
        });
      } catch (error) {
        console.error('Failed to save selected base images:', error);
      }
    }
  };

  return {
    selectedProductImageId,
    selectedBaseImages,
    handleSelectedProductImageChange,
    handleSelectedBaseImagesChange,
  };
}
