export interface PresignedUrl {
  url: string;
  key: string;
  expiresAt: Date;
}

export interface UploadOptions {
  contentType?: string;
  expiresIn?: number;
  maxSize?: number;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
}

export interface StorageFacade {
  getUploadUrl: (clientId: string, path: string, options?: UploadOptions) => Promise<PresignedUrl>;
  getDownloadUrl: (key: string, expiresIn?: number) => Promise<string>;
  upload: (key: string, data: Buffer | Blob | File, contentType?: string) => Promise<void>;
  download: (key: string) => Promise<Buffer>;
  delete: (key: string) => Promise<void>;
  exists: (key: string) => Promise<boolean>;
  list: (prefix: string) => Promise<StorageObject[]>;
  paths: {
    productImageBase: (clientId: string, productId: string, imageId: string) => string;
    productImagePreview: (clientId: string, productId: string, imageId: string) => string;
    productModel: (clientId: string, productId: string, filename: string) => string;
    collectionAsset: (clientId: string, collectionId: string, assetId: string, extension?: string) => string;
    generationAsset: (clientId: string, generationFlowId: string, assetId: string, extension?: string) => string;
    generationAssetOriginal: (clientId: string, generationFlowId: string, assetId: string, extension?: string) => string;
    inspirationImage: (clientId: string, sessionId: string, imageId: string, extension?: string) => string;
    userPhoto: (userId: string, extension?: string) => string;
    downloadZip: (clientId: string, jobId: string) => string;
    editSessionBase: (clientId: string, sessionId: string) => string;
    editSessionRevision: (clientId: string, sessionId: string, revisionId: string) => string;
    editSessionPrefix: (clientId: string, sessionId: string) => string;
  };
  getPublicUrl: (key: string) => string;
}

export interface StorageAdapter {
  getUploadUrl: (key: string, options?: UploadOptions) => Promise<PresignedUrl>;
  getDownloadUrl: (key: string, expiresIn?: number) => Promise<string>;
  upload: (key: string, data: Buffer | Blob | File, contentType?: string) => Promise<void>;
  download: (key: string) => Promise<Buffer>;
  delete: (key: string) => Promise<void>;
  exists: (key: string) => Promise<boolean>;
  list: (prefix: string) => Promise<StorageObject[]>;
  getPublicUrl: (key: string) => string;
}
