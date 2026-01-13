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
} as const;

export type StoragePaths = typeof storagePaths;
