/**
 * Centralized helpers for generating S3 object keys.
 * Shared between browser-safe helpers and server-side services.
 */

export const S3Paths = {
  // clients/{clientId}/
  getClientPath: (clientId: string) => `clients/${clientId}/`,

  // clients/{clientId}/client.json
  getClientMetaPath: (clientId: string) => `clients/${clientId}/client.json`,

  // clients/{clientId}/products/{productId}/
  getProductPath: (clientId: string, productId: string) => `clients/${clientId}/products/${productId}/`,

  // clients/{clientId}/products/{productId}/product.json
  getProductMetaPath: (clientId: string, productId: string) => `clients/${clientId}/products/${productId}/product.json`,

  // clients/{clientId}/products/{productId}/media/images/base/{imageId}.png
  getProductImageBasePath: (clientId: string, productId: string, imageId: string) =>
    `clients/${clientId}/products/${productId}/media/images/base/${imageId}.png`,

  // clients/{clientId}/products/{productId}/media/images/preview/{imageId}.jpg
  getProductImagePreviewPath: (clientId: string, productId: string, imageId: string) =>
    `clients/${clientId}/products/${productId}/media/images/preview/${imageId}.jpg`,

  // clients/{clientId}/products/{productId}/media/models/{filename}
  getProductModelPath: (clientId: string, productId: string, filename: string) =>
    `clients/${clientId}/products/${productId}/media/models/${filename}`,

  // Legacy path for backward compatibility (deprecated)
  getProductImagePath: (clientId: string, productId: string, filename: string) =>
    `clients/${clientId}/products/${productId}/media/${filename}`,

  // clients/{clientId}/products/{productId}/sessions/{sessionId}/
  getSessionPath: (clientId: string, productId: string, sessionId: string) =>
    `clients/${clientId}/products/${productId}/sessions/${sessionId}/`,

  // clients/{clientId}/products/{productId}/sessions/{sessionId}/chat.json
  getChatJsonPath: (clientId: string, productId: string, sessionId: string) =>
    `clients/${clientId}/products/${productId}/sessions/${sessionId}/chat.json`,

  // clients/{clientId}/products/{productId}/sessions/{sessionId}/media/
  getMediaPath: (clientId: string, productId: string, sessionId: string) =>
    `clients/${clientId}/products/${productId}/sessions/${sessionId}/media/`,

  // clients/{clientId}/products/{productId}/sessions/{sessionId}/media/{filename}
  getMediaFilePath: (clientId: string, productId: string, sessionId: string, filename: string) =>
    `clients/${clientId}/products/${productId}/sessions/${sessionId}/media/${filename}`,

  // ===== CLIENT SESSIONS (Multi-Product) =====

  // clients/{clientId}/sessions/{sessionId}/
  getClientSessionPath: (clientId: string, sessionId: string) => `clients/${clientId}/sessions/${sessionId}/`,

  // clients/{clientId}/sessions/{sessionId}/chat.json
  getClientSessionChatJsonPath: (clientId: string, sessionId: string) => `clients/${clientId}/sessions/${sessionId}/chat.json`,

  // clients/{clientId}/sessions/{sessionId}/media/
  getClientSessionMediaPath: (clientId: string, sessionId: string) => `clients/${clientId}/sessions/${sessionId}/media/`,

  // clients/{clientId}/sessions/{sessionId}/media/{filename}
  getClientSessionMediaFilePath: (clientId: string, sessionId: string, filename: string) =>
    `clients/${clientId}/sessions/${sessionId}/media/${filename}`,
} as const;

export type S3PathsType = typeof S3Paths;
