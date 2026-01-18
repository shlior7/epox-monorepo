/**
 * Gemini Utils Tests
 * Tests for image normalization utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeImageInput, extractMaterials, extractColors, extractStyle, getDefaultAnalysisFromFileName } from '../src/gemini/utils';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create a mock headers object
function createMockHeaders(headers: Record<string, string> = {}) {
  return {
    get: (key: string) => headers[key.toLowerCase()] || null,
  };
}

describe('normalizeImageInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data URL handling', () => {
    it('should parse data URL with image/jpeg mime type', async () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      const result = await normalizeImageInput(dataUrl);

      expect(result.mimeType).toBe('image/jpeg');
      expect(result.base64Data).toBe('/9j/4AAQSkZJRg==');
    });

    it('should parse data URL with image/png mime type', async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

      const result = await normalizeImageInput(dataUrl);

      expect(result.mimeType).toBe('image/png');
      expect(result.base64Data).toBe('iVBORw0KGgoAAAANSUhEUg==');
    });

    it('should parse data URL with image/webp mime type', async () => {
      const dataUrl = 'data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoA';

      const result = await normalizeImageInput(dataUrl);

      expect(result.mimeType).toBe('image/webp');
      expect(result.base64Data).toBe('UklGRlYAAABXRUJQVlA4IEoA');
    });
  });

  describe('URL handling', () => {
    it('should fetch and convert URL to base64', async () => {
      const imageData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG magic bytes
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData.buffer),
        headers: createMockHeaders({ 'content-type': 'image/png' }),
      });

      const result = await normalizeImageInput('https://example.com/image.png');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.png');
      expect(result.mimeType).toBe('image/png');
      expect(result.base64Data).toBeDefined();
    });

    it('should infer mime type from URL when content-type is application/octet-stream', async () => {
      const imageData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG magic bytes
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData.buffer),
        headers: createMockHeaders({ 'content-type': 'application/octet-stream' }),
      });

      const result = await normalizeImageInput('https://storage.example.com/uploads/photo.jpg');

      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should infer mime type from URL when content-type is binary/octet-stream', async () => {
      const imageData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData.buffer),
        headers: createMockHeaders({ 'content-type': 'binary/octet-stream' }),
      });

      const result = await normalizeImageInput('https://r2.example.com/images/file.png');

      expect(result.mimeType).toBe('image/png');
    });

    it('should infer mime type from URL when content-type is missing', async () => {
      const imageData = new Uint8Array([0x47, 0x49, 0x46, 0x38]); // GIF magic bytes
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData.buffer),
        headers: createMockHeaders(),
      });

      const result = await normalizeImageInput('https://cdn.example.com/assets/animation.gif');

      expect(result.mimeType).toBe('image/gif');
    });

    it('should infer webp mime type from URL extension', async () => {
      const imageData = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData.buffer),
        headers: createMockHeaders({ 'content-type': 'application/octet-stream' }),
      });

      const result = await normalizeImageInput('https://storage.example.com/optimized/photo.webp');

      expect(result.mimeType).toBe('image/webp');
    });

    it('should default to image/jpeg for unknown extensions', async () => {
      const imageData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData.buffer),
        headers: createMockHeaders({ 'content-type': 'application/octet-stream' }),
      });

      const result = await normalizeImageInput('https://example.com/file.unknown');

      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should handle .jpeg extension correctly', async () => {
      const imageData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData.buffer),
        headers: createMockHeaders({ 'content-type': 'application/octet-stream' }),
      });

      const result = await normalizeImageInput('https://example.com/photo.jpeg');

      expect(result.mimeType).toBe('image/jpeg');
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid URL format', async () => {
      await expect(normalizeImageInput('not-a-valid-url')).rejects.toThrow('Invalid image URL format');
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(normalizeImageInput('https://example.com/missing.png')).rejects.toThrow('Failed to fetch image');
    });
  });
});

describe('extractMaterials', () => {
  it('should extract materials from text', () => {
    const result = extractMaterials('This chair is made of wood and metal with leather upholstery');
    
    expect(result).toContain('wood');
    expect(result).toContain('metal');
    expect(result).toContain('leather');
  });

  it('should return max 3 materials', () => {
    const result = extractMaterials('Made of wood, metal, leather, fabric, and glass');
    
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('should return empty array when no materials found', () => {
    const result = extractMaterials('A beautiful piece');
    
    expect(result).toEqual([]);
  });
});

describe('extractColors', () => {
  it('should extract colors from text', () => {
    const result = extractColors('The product comes in black and white options');
    
    expect(result).toContain('black');
    expect(result).toContain('white');
  });

  it('should return max 3 colors', () => {
    const result = extractColors('Available in black, white, grey, red, and blue');
    
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

describe('extractStyle', () => {
  it('should extract modern style', () => {
    const result = extractStyle('This is a modern minimalist design');
    
    expect(result).toBe('modern');
  });

  it('should return contemporary as default', () => {
    const result = extractStyle('A beautiful piece of furniture');
    
    expect(result).toBe('contemporary');
  });
});

describe('getDefaultAnalysisFromFileName', () => {
  it('should return furniture defaults for chair filename', () => {
    const result = getDefaultAnalysisFromFileName('modern-chair.jpg');
    
    expect(result.materials).toContain('wood');
    expect(result.style).toBe('modern');
  });

  it('should return tech defaults for electronic device', () => {
    const result = getDefaultAnalysisFromFileName('electronic-device.png');
    
    expect(result.materials).toContain('plastic');
    expect(result.materials).toContain('metal');
  });

  it('should return generic defaults for unknown filename', () => {
    const result = getDefaultAnalysisFromFileName('random-file.jpg');
    
    expect(result.style).toBe('modern');
    expect(result.materials).toContain('contemporary');
  });
});
