const CLIENT_PREFIX = 'clients';

export const storagePaths = {
  productImageBase: (clientId: string, productId: string, imageId: string) =>
    `${CLIENT_PREFIX}/${clientId}/products/${productId}/media/images/base/${imageId}.png`,
  productImagePreview: (clientId: string, productId: string, imageId: string) =>
    `${CLIENT_PREFIX}/${clientId}/products/${productId}/media/images/preview/${imageId}.jpg`,
  productModel: (clientId: string, productId: string, filename: string) =>
    `${CLIENT_PREFIX}/${clientId}/products/${productId}/media/models/${filename}`,
  collectionAsset: (clientId: string, collectionId: string, assetId: string, extension = 'webp') =>
    `${CLIENT_PREFIX}/${clientId}/collections/${collectionId}/assets/${assetId}.${extension.replace(/^\./, '')}`,
  generationAsset: (clientId: string, generationFlowId: string, assetId: string, extension = 'webp') =>
    `${CLIENT_PREFIX}/${clientId}/generations/${generationFlowId}/assets/${assetId}.${extension.replace(/^\./, '')}`,
  generationAssetOriginal: (clientId: string, generationFlowId: string, assetId: string, extension = 'png') =>
    `${CLIENT_PREFIX}/${clientId}/generations/${generationFlowId}/assets/${assetId}_original.${extension.replace(/^\./, '')}`,
  // Session inspiration images
  inspirationImage: (clientId: string, sessionId: string, imageId: string, extension = 'jpg') =>
    `${CLIENT_PREFIX}/${clientId}/sessions/${sessionId}/inspirations/${imageId}.${extension.replace(/^\./, '')}`,
  // User profile photos
  userPhoto: (userId: string, extension = 'jpg') =>
    `users/${userId}/photo.${extension.replace(/^\./, '')}`,
  // Bulk download ZIPs
  downloadZip: (clientId: string, jobId: string) =>
    `${CLIENT_PREFIX}/${clientId}/downloads/${jobId}.zip`,
} as const;

export type StoragePaths = typeof storagePaths;
