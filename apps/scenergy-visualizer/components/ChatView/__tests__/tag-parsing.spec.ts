import { describe, it, expect } from 'vitest';

/**
 * Test utilities for tag parsing in ChatView
 * These tests verify that tags can be parsed from user input and properly
 * integrated into the prompt generation
 */

// Helper function (extracted from ChatView for testing)
function parseTagsFromText(text: string): {
  tags: { [key: string]: string };
  cleanText: string;
} {
  const tags: { [key: string]: string } = {};
  let cleanText = text;

  const tagPatterns = [
    { key: 'scene', pattern: /\[Scene:\s*([^\]]+)\]/gi },
    { key: 'style', pattern: /\[Style:\s*([^\]]+)\]/gi },
    { key: 'lighting', pattern: /\[Lighting:\s*([^\]]+)\]/gi },
    { key: 'surroundings', pattern: /\[Surroundings:\s*([^\]]+)\]/gi },
    { key: 'aspectRatio', pattern: /\[Aspect Ratio:\s*([^\]]+)\]/gi },
  ];

  tagPatterns.forEach(({ key, pattern }) => {
    const match = pattern.exec(text);
    if (match) {
      tags[key] = match[1].trim();
      cleanText = cleanText.replace(pattern, '').trim();
    }
  });

  return { tags, cleanText };
}

function insertTagInText(text: string, label: string, value: string): string {
  const tagPattern = new RegExp(`\\[${label}:\\s*[^\\]]+\\]`, 'gi');
  const newTag = `[${label}: ${value}]`;

  if (tagPattern.test(text)) {
    return text.replace(tagPattern, newTag);
  }

  return text ? `${newTag} ${text}` : newTag;
}

function removeTagFromText(text: string, label: string): string {
  const tagPattern = new RegExp(`\\[${label}:\\s*[^\\]]+\\]\\s*`, 'gi');
  return text.replace(tagPattern, '').trim();
}

describe('Tag Parsing Utilities', () => {
  describe('parseTagsFromText', () => {
    it('should parse single tag from text', () => {
      const input = '[Scene: Living Room] replace the chair';
      const result = parseTagsFromText(input);

      expect(result.tags.scene).toBe('Living Room');
      expect(result.cleanText).toBe('replace the chair');
    });

    it('should parse multiple tags from text', () => {
      const input = '[Scene: Living Room] [Style: Modern] [Lighting: Natural Daylight] replace the chair with product';
      const result = parseTagsFromText(input);

      expect(result.tags.scene).toBe('Living Room');
      expect(result.tags.style).toBe('Modern');
      expect(result.tags.lighting).toBe('Natural Daylight');
      expect(result.cleanText).toBe('replace the chair with product');
    });

    it('should handle text without tags', () => {
      const input = 'just some custom instructions';
      const result = parseTagsFromText(input);

      expect(Object.keys(result.tags).length).toBe(0);
      expect(result.cleanText).toBe('just some custom instructions');
    });

    it('should handle text with tags interspersed', () => {
      const input = 'Replace the chair [Scene: Bedroom] with the product [Style: Luxury]';
      const result = parseTagsFromText(input);

      expect(result.tags.scene).toBe('Bedroom');
      expect(result.tags.style).toBe('Luxury');
      // Note: May have extra spaces when tags are removed from middle of text
      expect(result.cleanText.replace(/\s+/g, ' ')).toBe('Replace the chair with the product');
    });

    it('should handle empty text', () => {
      const input = '';
      const result = parseTagsFromText(input);

      expect(Object.keys(result.tags).length).toBe(0);
      expect(result.cleanText).toBe('');
    });

    it('should handle aspect ratio tag', () => {
      const input = '[Aspect Ratio: 16:9 (Widescreen)] create a wide scene';
      const result = parseTagsFromText(input);

      expect(result.tags.aspectRatio).toBe('16:9 (Widescreen)');
      expect(result.cleanText).toBe('create a wide scene');
    });
  });

  describe('insertTagInText', () => {
    it('should insert tag when none exists', () => {
      const input = 'replace the chair';
      const result = insertTagInText(input, 'Scene', 'Living Room');

      expect(result).toBe('[Scene: Living Room] replace the chair');
    });

    it('should update tag when it already exists', () => {
      const input = '[Scene: Bedroom] replace the chair';
      const result = insertTagInText(input, 'Scene', 'Living Room');

      expect(result).toBe('[Scene: Living Room] replace the chair');
    });

    it('should handle empty text', () => {
      const input = '';
      const result = insertTagInText(input, 'Scene', 'Living Room');

      expect(result).toBe('[Scene: Living Room]');
    });

    it('should preserve other tags when updating one', () => {
      const input = '[Scene: Bedroom] [Style: Modern] replace the chair';
      const result = insertTagInText(input, 'Scene', 'Kitchen');

      expect(result).toContain('[Scene: Kitchen]');
      expect(result).toContain('[Style: Modern]');
    });
  });

  describe('removeTagFromText', () => {
    it('should remove tag from text', () => {
      const input = '[Scene: Living Room] replace the chair';
      const result = removeTagFromText(input, 'Scene');

      expect(result).toBe('replace the chair');
    });

    it('should handle text without the tag', () => {
      const input = 'replace the chair';
      const result = removeTagFromText(input, 'Scene');

      expect(result).toBe('replace the chair');
    });

    it('should preserve other tags when removing one', () => {
      const input = '[Scene: Bedroom] [Style: Modern] replace the chair';
      const result = removeTagFromText(input, 'Scene');

      expect(result).toContain('[Style: Modern]');
      expect(result).not.toContain('[Scene:');
    });

    it('should handle multiple occurrences (remove all)', () => {
      const input = '[Scene: Bedroom] some text [Scene: Kitchen] more text';
      const result = removeTagFromText(input, 'Scene');

      expect(result).not.toContain('[Scene:');
      expect(result).toContain('some text');
      expect(result).toContain('more text');
    });
  });

  describe('Integration - Custom Prompt Flow', () => {
    it('should support user removing tags for custom prompt', () => {
      // User starts with tags from PromptBuilder
      let text = '[Scene: Living Room] [Style: Modern Minimalist] [Lighting: Natural Daylight]';

      // User adds custom text
      text = text + ' replace the chair in the image with the product chair';

      // User removes Scene and Style tags to have more control
      text = removeTagFromText(text, 'Scene');
      text = removeTagFromText(text, 'Style');

      // Parse the final text
      const result = parseTagsFromText(text);

      // Only Lighting tag should remain
      expect(result.tags.lighting).toBe('Natural Daylight');
      expect(result.tags.scene).toBeUndefined();
      expect(result.tags.style).toBeUndefined();
      expect(result.cleanText).toContain('replace the chair in the image with the product chair');
    });

    it('should support re-adding tag via PromptBuilder', () => {
      let text = '[Lighting: Natural Daylight] custom instructions';

      // User opens PromptBuilder and selects Scene
      text = insertTagInText(text, 'Scene', 'Office');

      const result = parseTagsFromText(text);

      expect(result.tags.scene).toBe('Office');
      expect(result.tags.lighting).toBe('Natural Daylight');
    });

    it('should support fully custom prompt without any tags', () => {
      let text = '[Scene: Living Room] [Style: Modern]';

      // User removes all tags
      text = removeTagFromText(text, 'Scene');
      text = removeTagFromText(text, 'Style');

      // User types custom instruction
      text = 'Place the product chair in a cozy reading nook with warm ambient lighting and plants';

      const result = parseTagsFromText(text);

      // No tags should be present
      expect(Object.keys(result.tags).length).toBe(0);
      expect(result.cleanText).toBe('Place the product chair in a cozy reading nook with warm ambient lighting and plants');
    });
  });
});
