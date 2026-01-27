import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadProductImages, deleteProductImages, extractImageId, validateImageIds, getFileExtension } from '../product-image-upload';
import type { UploadImagesOptions, DeleteImagesOptions } from '../product-image-upload';

/**
 * Tests for product image upload service
 * Covers uploading base images and previews via API client
 */

vi.mock('@/lib/api-client', () => {
  const uploadProductImage = vi.fn();
  const uploadProductImagePreview = vi.fn();
  const deleteProductImages = vi.fn();
  return {
    apiClient: {
      uploadProductImage,
      uploadProductImagePreview,
      deleteProductImages,
    },
  };
});

import { apiClient } from '@/lib/api-client';

const mockUploadProductImage = vi.mocked(apiClient.uploadProductImage);
const mockUploadProductImagePreview = vi.mocked(apiClient.uploadProductImagePreview);
const mockDeleteProductImages = vi.mocked(apiClient.deleteProductImages);

describe('product-image-upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadProductImage.mockResolvedValue(undefined);
    mockUploadProductImagePreview.mockResolvedValue(undefined);
    mockDeleteProductImages.mockResolvedValue({ deletedIds: [], errors: [] });
  });

  describe('uploadProductImages', () => {
    it('should upload base PNG images to S3', async () => {
      const file1 = new File(['content1'], 'image1.png', { type: 'image/png' });
      const file2 = new File(['content2'], 'image2.png', { type: 'image/png' });
      const options: UploadImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageFiles: [file1, file2],
      };

      const result = await uploadProductImages(options);

      expect(result.imageIds).toHaveLength(2);
      expect(mockUploadProductImage).toHaveBeenCalledTimes(2);
      expect(mockUploadProductImage).toHaveBeenCalledWith('client-123', 'product-456', 'image1', file1);
    });

    it('should upload JPEG previews when provided', async () => {
      const file = new File(['content'], 'image.png', { type: 'image/png' });
      const options: UploadImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageFiles: [file],
        jpegPreviews: ['data:image/jpeg;base64,preview'],
      };

      await uploadProductImages(options);

      expect(mockUploadProductImagePreview).toHaveBeenCalledOnce();
      expect(mockUploadProductImagePreview).toHaveBeenCalledWith(
        'client-123',
        'product-456',
        expect.any(String),
        'data:image/jpeg;base64,preview'
      );
    });

    it('should use image filenames to derive IDs when provided', async () => {
      const file1 = new File(['content1'], 'image1.png', { type: 'image/png' });
      const file2 = new File(['content2'], 'image2.png', { type: 'image/png' });

      const options: UploadImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageFiles: [file1, file2],
      };

      const result = await uploadProductImages(options);

      expect(result.imageIds).toEqual(['image1', 'image2']);
    });

    it('should return array of image IDs (UUIDs only, no extensions)', async () => {
      const file = new File(['content'], 'image.png', { type: 'image/png' });

      const options: UploadImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageFiles: [file],
      };

      const result = await uploadProductImages(options);

      expect(result.imageIds[0]).toBe('image');
      expect(result.imageIds[0]).not.toMatch(/\.(png|jpg|jpeg)$/i);
    });

    it('should handle upload errors gracefully', async () => {
      const file1 = new File(['content1'], 'image1.png', { type: 'image/png' });
      const file2 = new File(['content2'], 'image2.png', { type: 'image/png' });
      mockUploadProductImage.mockRejectedValueOnce(new Error('S3 error'));
      mockUploadProductImage.mockResolvedValueOnce('s3-key');

      const options: UploadImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageFiles: [file1, file2],
      };

      const result = await uploadProductImages(options);

      expect(result.imageIds).toHaveLength(1); // One succeeded
      expect(result.errors).toHaveLength(1); // One failed
      expect(result.errors[0].error.message).toBe('S3 error');
    });

    it('should construct filenames with proper extensions', async () => {
      const pngFile = new File(['content'], 'image1.png', { type: 'image/png' });
      const jpgFile = new File(['content'], 'image2.jpg', { type: 'image/jpeg' });

      const options: UploadImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageFiles: [pngFile, jpgFile],
      };

      await uploadProductImages(options);

      expect(mockUploadProductImage).toHaveBeenCalledWith('client-123', 'product-456', 'image1', pngFile);
      expect(mockUploadProductImage).toHaveBeenCalledWith('client-123', 'product-456', 'image2', jpgFile);
    });

    it('should upload images in parallel', async () => {
      const files = [
        new File(['1'], 'image1.png', { type: 'image/png' }),
        new File(['2'], 'image2.png', { type: 'image/png' }),
        new File(['3'], 'image3.png', { type: 'image/png' }),
      ];

      const options: UploadImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageFiles: files,
      };

      await uploadProductImages(options);

      // All should be called (parallel execution via Promise.allSettled)
      expect(mockUploadProductImage).toHaveBeenCalledTimes(3);
    });

    it('should not upload previews when not provided', async () => {
      const file = new File(['content'], 'image.png', { type: 'image/png' });
      const options: UploadImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageFiles: [file],
      };

      await uploadProductImages(options);

      expect(mockUploadProductImagePreview).not.toHaveBeenCalled();
    });
  });

  describe('deleteProductImages', () => {
    it('should delete both base PNG and preview JPG from S3', async () => {
      const options: DeleteImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageIds: ['image-1', 'image-2'],
      };

      await deleteProductImages(options);

      expect(mockDeleteProductImages).toHaveBeenCalledWith('client-123', 'product-456', ['image-1', 'image-2']);
    });

    it('should handle deletion errors gracefully', async () => {
      mockDeleteProductImages.mockResolvedValue({
        deletedIds: ['image-2'],
        errors: [{ imageId: 'image-1', error: 'Delete failed' }],
      });

      const options: DeleteImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageIds: ['image-1', 'image-2'],
      };

      const result = await deleteProductImages(options);

      expect(result.deletedIds).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].imageId).toBe('image-1');
    });

    it('should delete multiple images in parallel', async () => {
      const options: DeleteImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageIds: ['img-1', 'img-2', 'img-3'],
      };

      await deleteProductImages(options);

      expect(mockDeleteProductImages).toHaveBeenCalledWith('client-123', 'product-456', ['img-1', 'img-2', 'img-3']);
    });

    it('should return empty arrays when no images to delete', async () => {
      const options: DeleteImagesOptions = {
        clientId: 'client-123',
        productId: 'product-456',
        imageIds: [],
      };

      const result = await deleteProductImages(options);

      expect(result.deletedIds).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(mockDeleteProductImages).not.toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    it('should extract image ID from filename correctly', () => {
      expect(extractImageId('test-uuid-5678.png')).toBe('test-uuid-5678');
      expect(extractImageId('test-uuid-5678.jpg')).toBe('test-uuid-5678');
      expect(extractImageId('test-uuid-5678.jpeg')).toBe('test-uuid-5678');
      expect(extractImageId('test-uuid-5678.webp')).toBe('test-uuid-5678');
    });

    it('should ensure image IDs do not contain file extensions', () => {
      expect(validateImageIds(['uuid-1', 'uuid-2', 'uuid-3'])).toBe(true);
      expect(validateImageIds(['uuid-1.png', 'uuid-2'])).toBe(false);
      expect(validateImageIds(['uuid-1', 'uuid-2.jpg'])).toBe(false);
    });

    it('should get file extension from filename', () => {
      expect(getFileExtension('image.png')).toBe('png');
      expect(getFileExtension('image.JPG')).toBe('jpg');
      expect(getFileExtension('image.jpeg')).toBe('jpeg');
      expect(getFileExtension('no-extension')).toBe('jpg'); // default
    });
  });
});
