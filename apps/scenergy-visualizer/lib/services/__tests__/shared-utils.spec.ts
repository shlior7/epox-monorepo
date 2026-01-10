import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fileToBase64,
  fileToGenerativePart,
  estimateTokenUsage,
  optimizePrompt,
  generateSessionId,
  parseSize,
} from '../shared/utils';

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

const createMockFile = (bytes: number[], name: string, type: string): File => {
  const data = Uint8Array.from(bytes);
  const buffer = data.buffer.slice(0);
  return {
    name,
    type,
    size: data.byteLength,
    arrayBuffer: async () => buffer,
  } as unknown as File;
};

describe('shared/utils', () => {
  beforeEach(() => {
    warnSpy.mockClear();
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  afterEach(() => {
    warnSpy.mockReset();
  });

  it('fileToBase64 preserves mime type when provided', async () => {
    const file = createMockFile([1, 2, 3], 'image.png', 'image/png');

    const result = await fileToBase64(file);

    expect(result.startsWith('data:image/png;base64,')).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('fileToBase64 infers mime type when missing', async () => {
    const file = createMockFile([4, 5, 6], 'photo.jpg', 'application/octet-stream');

    const result = await fileToBase64(file);

    expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/Corrected MIME type/);
  });

  it('fileToGenerativePart returns inline data with inferred mime type', async () => {
    const file = createMockFile([7, 8, 9], 'render.webp', 'application/xml');

    const part = await fileToGenerativePart(file);

    expect(part.inlineData.mimeType).toBe('image/webp');
    expect(part.inlineData.data).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('estimateTokenUsage approximates quarter-char length', () => {
    expect(estimateTokenUsage('')).toBe(0);
    expect(estimateTokenUsage('abcd')).toBe(1);
    expect(estimateTokenUsage('abcdefgh')).toBe(2);
  });

  it('optimizePrompt removes redundant words and normalizes spacing', () => {
    const prompt = 'Please create a very modern kitchen scene, with really bright lighting.';
    const optimized = optimizePrompt(prompt);
    expect(optimized).not.toMatch(/\bplease\b/i);
    expect(optimized).not.toMatch(/\bvery\b/i);
    expect(optimized).toContain('modern kitchen scene, with bright lighting.');
  });

  it('optimizePrompt aggressive mode strips articles and limits length', () => {
    const prompt = 'A modern kitchen with a contemporary style in a beautiful home, with bright sunlight and clean countertops.';
    const optimized = optimizePrompt(prompt, true);
    expect(optimized).not.toMatch(/\ba\s+/i);
    expect(optimized.length).toBeLessThanOrEqual(400);
  });

  it('generateSessionId produces unique identifiers', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const id = generateSessionId();
      expect(id).toMatch(/^session_\d+_[a-z0-9]+$/);
      ids.add(id);
    }
    expect(ids.size).toBe(10);
  });

  it('parseSize handles numeric and string values', () => {
    expect(parseSize(250)).toBe(250);
    expect(parseSize('300px')).toBe(300);
    expect(parseSize('invalid')).toBe(0);
    expect(parseSize('-42px')).toBe(-42);
  });
});
