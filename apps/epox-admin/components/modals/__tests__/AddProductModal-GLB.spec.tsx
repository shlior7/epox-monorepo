import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processGLBToImages } from '@/lib/services/product-image-processor';
import type { CameraSettings } from '@/lib/services/product-image-processor';

/**
 * Integration Tests for AddProductModal - GLB Processing
 *
 * Tests the consolidated GLB processing flow used by AddProductModal
 * Ensures the modal correctly uses the shared processGLBToImages service
 */

// Mock the glb-renderer module
const mockRenderGLBToImages = vi.fn();
const mockDataUrlToFile = vi.fn();
const mockGenerateJpegPreview = vi.fn();

vi.mock('@/lib/services/glb-renderer', () => ({
  renderGLBToImages: mockRenderGLBToImages,
  dataUrlToFile: mockDataUrlToFile,
  generateJpegPreview: mockGenerateJpegPreview,
}));

// Mock uuid
const mockUuidv4 = vi.fn();
vi.mock('uuid', () => ({
  v4: mockUuidv4,
}));

// Helper to create a mock File with arrayBuffer method
function createMockFile(name: string, content: string = 'glb content'): File {
  const file = new File([content], name, { type: 'model/gltf-binary' });
  // Add arrayBuffer method for test environment
  file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  return file;
}

describe('AddProductModal - GLB Processing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    let uuidCounter = 0;
    mockUuidv4.mockImplementation(() => `uuid-${++uuidCounter}`);

    mockRenderGLBToImages.mockResolvedValue([
      { dataUrl: 'data:image/png;base64,view1' },
      { dataUrl: 'data:image/png;base64,view2' },
      { dataUrl: 'data:image/png;base64,view3' },
      { dataUrl: 'data:image/png;base64,view4' },
      { dataUrl: 'data:image/png;base64,view5' },
      { dataUrl: 'data:image/png;base64,view6' },
    ]);

    mockDataUrlToFile.mockImplementation((dataUrl: string, filename: string) => {
      return new File([dataUrl], filename, { type: 'image/png' });
    });

    mockGenerateJpegPreview.mockImplementation((dataUrl: string) => {
      return Promise.resolve(dataUrl.replace('png', 'jpeg'));
    });
  });

  describe('GLB Processing Flow', () => {
    it('should process GLB file and generate images with correct filenames', async () => {
      const glbFile = createMockFile('chair.glb');
      const cameraSettings: CameraSettings = {
        beta: Math.PI / 3,
        radius: 5,
      };

      const result = await processGLBToImages(glbFile, undefined, cameraSettings);

      // Should generate 6 PNG files and 6 JPEG previews
      expect(result.imageFiles).toHaveLength(6);
      expect(result.jpegPreviews).toHaveLength(6);

      // Verify PNG files have UUID filenames with .png extension
      result.imageFiles.forEach((file) => {
        expect(file.name).toMatch(/^uuid-\d+\.png$/);
        expect(file.type).toBe('image/png');
      });

      // Verify JPEG previews are generated
      result.jpegPreviews.forEach((preview) => {
        expect(preview).toContain('jpeg');
      });
    });

    it('should use camera settings from BulkGLBPreview ref', async () => {
      const glbFile = createMockFile('product.glb');

      // Simulate camera settings captured from BulkGLBPreview
      const cameraSettings: CameraSettings = {
        beta: 1.047, // 60 degrees
        radius: 8,
      };

      await processGLBToImages(glbFile, undefined, cameraSettings);

      // Verify renderGLBToImages was called with correct camera settings
      expect(mockRenderGLBToImages).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          cameraBeta: 1.047,
          cameraRadius: 8,
        })
      );
    });

    it('should handle GLB processing without radius (auto-calculated)', async () => {
      const glbFile = createMockFile('model.glb');
      const cameraSettings: CameraSettings = {
        beta: Math.PI / 4, // 45 degrees
        // No radius specified
      };

      await processGLBToImages(glbFile, undefined, cameraSettings);

      // Verify renderGLBToImages was called without radius (will be auto-calculated)
      expect(mockRenderGLBToImages).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          cameraBeta: Math.PI / 4,
          cameraRadius: undefined,
        })
      );
    });

    it('should generate unique UUIDs for each image', async () => {
      const glbFile = createMockFile('chair.glb');

      const result = await processGLBToImages(glbFile);

      // Extract UUIDs from filenames
      const uuids = result.imageFiles.map((file) => file.name.replace('.png', ''));

      // All UUIDs should be unique
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(6);

      // All should match UUID pattern
      uuids.forEach((uuid) => {
        expect(uuid).toMatch(/^uuid-\d+$/);
      });
    });

    it('should call progress callback during processing', async () => {
      const glbFile = createMockFile('product.glb');
      const progressCallback = vi.fn();

      await processGLBToImages(glbFile, progressCallback);

      // Progress callback should be called multiple times
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback.mock.calls.length).toBeGreaterThan(0);

      // Should report progress percentages
      const progressValues = progressCallback.mock.calls.map((call) => call[0]);
      expect(progressValues.some((v) => v > 0 && v <= 100)).toBe(true);
    });

    it('should preserve camera settings between uploads', async () => {
      // First upload with specific camera settings
      const glbFile1 = createMockFile('chair1.glb');
      const cameraSettings1: CameraSettings = {
        beta: Math.PI / 3,
        radius: 6,
      };

      await processGLBToImages(glbFile1, undefined, cameraSettings1);

      // Second upload with different camera settings
      const glbFile2 = createMockFile('chair2.glb');
      const cameraSettings2: CameraSettings = {
        beta: Math.PI / 2,
        radius: 10,
      };

      await processGLBToImages(glbFile2, undefined, cameraSettings2);

      // Verify both calls used their respective settings
      expect(mockRenderGLBToImages).toHaveBeenNthCalledWith(
        1,
        expect.any(ArrayBuffer),
        expect.objectContaining({
          cameraBeta: Math.PI / 3,
          cameraRadius: 6,
        })
      );

      expect(mockRenderGLBToImages).toHaveBeenNthCalledWith(
        2,
        expect.any(ArrayBuffer),
        expect.objectContaining({
          cameraBeta: Math.PI / 2,
          cameraRadius: 10,
        })
      );
    });

    it('should generate correct JPEG preview quality', async () => {
      const glbFile = createMockFile('product.glb');

      await processGLBToImages(glbFile);

      // Verify JPEG preview generation is called 6 times (once per view)
      expect(mockGenerateJpegPreview).toHaveBeenCalledTimes(6);

      // Verify quality parameter (0.95)
      mockGenerateJpegPreview.mock.calls.forEach((call) => {
        expect(call[1]).toBe(0.95);
      });
    });

    it('should handle GLB processing errors gracefully', async () => {
      const glbFile = createMockFile('invalid.glb');
      mockRenderGLBToImages.mockRejectedValueOnce(new Error('Invalid GLB format'));

      await expect(processGLBToImages(glbFile)).rejects.toThrow('Invalid GLB format');
    });
  });

  describe('File Naming Convention', () => {
    it('should NOT create double extension files (.png.png)', async () => {
      const glbFile = createMockFile('chair.glb');

      const result = await processGLBToImages(glbFile);

      // Verify no file has .png.png extension
      result.imageFiles.forEach((file) => {
        expect(file.name).not.toMatch(/\.png\.png$/);
        expect(file.name).toMatch(/\.png$/);
      });
    });

    it('should create files with UUID.png format', async () => {
      const glbFile = createMockFile('model.glb');

      const result = await processGLBToImages(glbFile);

      // All files should be named: <uuid>.png
      result.imageFiles.forEach((file) => {
        expect(file.name).toMatch(/^uuid-\d+\.png$/);
      });
    });
  });

  describe('Upload Integration', () => {
    it('should return image files ready for upload to S3', async () => {
      const glbFile = createMockFile('chair.glb');

      const result = await processGLBToImages(glbFile);

      // Files should be valid File objects
      result.imageFiles.forEach((file) => {
        expect(file).toBeInstanceOf(File);
        expect(file.size).toBeGreaterThan(0);
        expect(file.type).toBe('image/png');
      });

      // JPEG previews should be data URLs
      result.jpegPreviews.forEach((preview) => {
        expect(typeof preview).toBe('string');
        expect(preview).toContain('data:image');
      });
    });

    it('should match preview count with image count', async () => {
      const glbFile = createMockFile('product.glb');

      const result = await processGLBToImages(glbFile);

      // Should have equal number of images and previews
      expect(result.imageFiles.length).toBe(result.jpegPreviews.length);
    });
  });
});
