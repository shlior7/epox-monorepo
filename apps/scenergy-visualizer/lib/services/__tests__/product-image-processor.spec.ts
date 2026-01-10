import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processGLBToImages, betaToDegrees, betaToRadians, validateCameraSettings } from '../product-image-processor';
import type { CameraSettings, ProcessGLBResult } from '../product-image-processor';

/**
 * Tests for product image processing service
 * Covers GLB to images conversion with preview generation
 */

// Mock the glb-renderer module
const mockRenderGLBToImages = vi.fn();
const mockDataUrlToFile = vi.fn();
const mockGenerateJpegPreview = vi.fn();

vi.mock('../glb-renderer', () => ({
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

describe('product-image-processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockUuidv4.mockReturnValue('test-uuid-123');
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
    mockGenerateJpegPreview.mockResolvedValue('data:image/jpeg;base64,preview');
  });

  describe('processGLBToImages', () => {
    it('should generate 6 PNG images and 6 JPEG previews from GLB file', async () => {
      const mockFile = createMockFile('model.glb');

      const result = await processGLBToImages(mockFile);

      expect(result.imageFiles).toHaveLength(6);
      expect(result.jpegPreviews).toHaveLength(6);
      expect(mockRenderGLBToImages).toHaveBeenCalledOnce();
      expect(mockGenerateJpegPreview).toHaveBeenCalledTimes(6);
    });

    it('should apply custom camera settings (beta and radius)', async () => {
      const mockFile = createMockFile('model.glb');
      const cameraSettings: CameraSettings = {
        beta: Math.PI / 2,
        radius: 10,
      };

      await processGLBToImages(mockFile, undefined, cameraSettings);

      expect(mockRenderGLBToImages).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          cameraBeta: Math.PI / 2,
          cameraRadius: 10,
        })
      );
    });

    it('should use default camera settings if not provided', async () => {
      const mockFile = createMockFile('model.glb');

      await processGLBToImages(mockFile);

      expect(mockRenderGLBToImages).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          width: 1024,
          height: 1024,
          backgroundColor: 'transparent',
        })
      );
    });

    it('should create File objects with UUID filenames', async () => {
      const mockFile = createMockFile('model.glb');
      mockUuidv4
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2')
        .mockReturnValueOnce('uuid-3')
        .mockReturnValueOnce('uuid-4')
        .mockReturnValueOnce('uuid-5')
        .mockReturnValueOnce('uuid-6');

      await processGLBToImages(mockFile);

      expect(mockDataUrlToFile).toHaveBeenCalledWith(expect.any(String), 'uuid-1.png');
      expect(mockDataUrlToFile).toHaveBeenCalledWith(expect.any(String), 'uuid-2.png');
      expect(mockUuidv4).toHaveBeenCalledTimes(6);
    });

    it('should generate JPEG previews with quality 0.95', async () => {
      const mockFile = createMockFile('model.glb');

      await processGLBToImages(mockFile);

      expect(mockGenerateJpegPreview).toHaveBeenCalledWith(expect.any(String), 0.95);
      expect(mockGenerateJpegPreview).toHaveBeenCalledTimes(6);
    });

    it('should handle GLB processing errors gracefully', async () => {
      const mockFile = createMockFile('model.glb');
      mockRenderGLBToImages.mockRejectedValueOnce(new Error('Failed to render'));

      await expect(processGLBToImages(mockFile)).rejects.toThrow('Failed to render');
    });

    it('should call progress callback during processing', async () => {
      const mockFile = createMockFile('model.glb');
      const progressCallback = vi.fn();

      await processGLBToImages(mockFile, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(10);
      expect(progressCallback).toHaveBeenCalledWith(20);
      expect(progressCallback).toHaveBeenCalledWith(30);
      expect(progressCallback).toHaveBeenCalledWith(60);
      expect(progressCallback).toHaveBeenCalledWith(75);
    });

    it('should render images at 1024x1024 resolution', async () => {
      const mockFile = createMockFile('model.glb');

      await processGLBToImages(mockFile);

      expect(mockRenderGLBToImages).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          width: 1024,
          height: 1024,
        })
      );
    });

    it('should use transparent background for PNG images', async () => {
      const mockFile = createMockFile('model.glb');

      await processGLBToImages(mockFile);

      expect(mockRenderGLBToImages).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          backgroundColor: 'transparent',
        })
      );
    });

    it('should return imageFiles and jpegPreviews arrays of equal length', async () => {
      const mockFile = createMockFile('model.glb');

      const result = await processGLBToImages(mockFile);

      expect(result.imageFiles.length).toBe(result.jpegPreviews.length);
      expect(result.imageFiles.length).toBe(6);
    });
  });

  describe('Camera Settings Utilities', () => {
    it('should convert beta to degrees correctly', () => {
      expect(betaToDegrees(Math.PI / 3)).toBeCloseTo(60, 1);
      expect(betaToDegrees(Math.PI / 2)).toBeCloseTo(90, 1);
      expect(betaToDegrees(Math.PI)).toBeCloseTo(180, 1);
    });

    it('should convert beta to radians correctly', () => {
      expect(betaToRadians(60)).toBeCloseTo(Math.PI / 3, 5);
      expect(betaToRadians(90)).toBeCloseTo(Math.PI / 2, 5);
      expect(betaToRadians(180)).toBeCloseTo(Math.PI, 5);
    });

    it('should validate correct camera settings', () => {
      expect(validateCameraSettings({ beta: Math.PI / 3 })).toBe(true);
      expect(validateCameraSettings({ beta: Math.PI / 2, radius: 10 })).toBe(true);
    });

    it('should invalidate incorrect camera settings', () => {
      expect(validateCameraSettings({ beta: NaN })).toBe(false);
      expect(validateCameraSettings({ beta: Infinity })).toBe(false);
      expect(validateCameraSettings({ beta: Math.PI / 3, radius: -5 })).toBe(false);
      expect(validateCameraSettings({ beta: Math.PI / 3, radius: 0 })).toBe(false);
    });
  });
});
