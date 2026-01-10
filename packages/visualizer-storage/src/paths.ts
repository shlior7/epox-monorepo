const ORG_PREFIX = 'orgs';

export const storagePaths = {
  productImageBase: (orgId: string, productId: string, imageId: string) =>
    `${ORG_PREFIX}/${orgId}/products/${productId}/images/base/${imageId}.png`,
  productImagePreview: (orgId: string, productId: string, imageId: string) =>
    `${ORG_PREFIX}/${orgId}/products/${productId}/images/preview/${imageId}.jpg`,
  productModel: (orgId: string, productId: string, filename: string) =>
    `${ORG_PREFIX}/${orgId}/products/${productId}/models/${filename}`,
  sessionMedia: (orgId: string, sessionId: string, filename: string) =>
    `${ORG_PREFIX}/${orgId}/sessions/${sessionId}/media/${filename}`,
  generatedImage: (orgId: string, imageId: string, extension = 'png') =>
    `${ORG_PREFIX}/${orgId}/generated/${imageId}.${extension.replace(/^\./, '')}`,
} as const;

export type StoragePaths = typeof storagePaths;
