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
  getUploadUrl(orgId: string, path: string, options?: UploadOptions): Promise<PresignedUrl>;
  getDownloadUrl(key: string, expiresIn?: number): Promise<string>;
  upload(key: string, data: Buffer | Blob | File, contentType?: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<StorageObject[]>;
  paths: {
    productImageBase(orgId: string, productId: string, imageId: string): string;
    productImagePreview(orgId: string, productId: string, imageId: string): string;
    productModel(orgId: string, productId: string, filename: string): string;
    sessionMedia(orgId: string, sessionId: string, filename: string): string;
    generatedImage(orgId: string, imageId: string): string;
  };
  getPublicUrl(key: string): string;
}

export interface StorageAdapter {
  getUploadUrl(key: string, options?: UploadOptions): Promise<PresignedUrl>;
  getDownloadUrl(key: string, expiresIn?: number): Promise<string>;
  upload(key: string, data: Buffer | Blob | File, contentType?: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<StorageObject[]>;
  getPublicUrl(key: string): string;
}
