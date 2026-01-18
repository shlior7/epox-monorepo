/**
 * Prompt Builder Tests
 * Tests for building generation prompts from tags
 */

import { describe, it, expect } from 'vitest';
import {
  buildPromptFromTags,
  buildFullGenerationPrompt,
  estimateGenerationComplexity,
  getAISuggestedTags,
  mergeTagSuggestions,
} from '@/lib/services/prompt-builder';
import type { PromptTags } from '@/lib/types';

describe('Prompt Builder', () => {
  describe('buildPromptFromTags', () => {
    it('should build prompt from scene type tags', () => {
      const tags: PromptTags = {
        sceneType: ['Living Room', 'Modern Office'],
        mood: [],
        lighting: [],
        style: [],
        custom: [],
      };

      const result = buildPromptFromTags(tags);

      expect(result).toBe('Living Room, Modern Office');
    });

    it('should build prompt with style tags', () => {
      const tags: PromptTags = {
        sceneType: [],
        mood: [],
        lighting: [],
        style: ['Minimalist', 'Scandinavian'],
        custom: [],
      };

      const result = buildPromptFromTags(tags);

      expect(result).toBe('minimalist style, scandinavian style');
    });

    it('should build prompt with mood tags', () => {
      const tags: PromptTags = {
        sceneType: [],
        mood: ['Cozy', 'Warm'],
        lighting: [],
        style: [],
        custom: [],
      };

      const result = buildPromptFromTags(tags);

      expect(result).toBe('cozy, warm');
    });

    it('should build prompt with lighting tags', () => {
      const tags: PromptTags = {
        sceneType: [],
        mood: [],
        lighting: ['Natural', 'Soft'],
        style: [],
        custom: [],
      };

      const result = buildPromptFromTags(tags);

      expect(result).toBe('natural lighting, soft lighting');
    });

    it('should build prompt with custom tags', () => {
      const tags: PromptTags = {
        sceneType: [],
        mood: [],
        lighting: [],
        style: [],
        custom: ['hardwood floor', 'large windows'],
      };

      const result = buildPromptFromTags(tags);

      expect(result).toBe('hardwood floor, large windows');
    });

    it('should combine all tag types in order', () => {
      const tags: PromptTags = {
        sceneType: ['Bedroom'],
        mood: ['Serene'],
        lighting: ['Natural'],
        style: ['Modern'],
        custom: ['white walls'],
      };

      const result = buildPromptFromTags(tags);

      expect(result).toBe('Bedroom, modern style, serene, natural lighting, white walls');
    });

    it('should return empty string for empty tags', () => {
      const tags: PromptTags = {
        sceneType: [],
        mood: [],
        lighting: [],
        style: [],
        custom: [],
      };

      const result = buildPromptFromTags(tags);

      expect(result).toBe('');
    });
  });

  describe('buildFullGenerationPrompt', () => {
    it('should include product consistency requirements', () => {
      const tags: PromptTags = {
        sceneType: ['Living Room'],
        mood: [],
        lighting: [],
        style: [],
        custom: [],
      };

      const result = buildFullGenerationPrompt('Wooden Chair', tags);

      expect(result).toContain('CRITICAL PRODUCT CONSISTENCY REQUIREMENTS');
      expect(result).toContain('Copy the product from the reference image EXACTLY');
      expect(result).toContain('Product: Wooden Chair');
      expect(result).toContain('Scene requirements: Living Room');
    });

    it('should include inspiration analysis when provided', () => {
      const tags: PromptTags = {
        sceneType: [],
        mood: [],
        lighting: [],
        style: [],
        custom: [],
      };

      const result = buildFullGenerationPrompt('Lamp', tags, 'warm golden hour lighting with soft shadows');

      expect(result).toContain('Style reference: warm golden hour lighting with soft shadows');
    });

    it('should not include style reference line when no inspiration analysis', () => {
      const tags: PromptTags = {
        sceneType: ['Kitchen'],
        mood: [],
        lighting: [],
        style: [],
        custom: [],
      };

      const result = buildFullGenerationPrompt('Toaster', tags);

      expect(result).not.toContain('Style reference:');
    });

    it('should always include output quality requirements', () => {
      const tags: PromptTags = {
        sceneType: [],
        mood: [],
        lighting: [],
        style: [],
        custom: [],
      };

      const result = buildFullGenerationPrompt('Product', tags);

      expect(result).toContain('Ultra high resolution');
      expect(result).toContain('photorealistic');
      expect(result).toContain('cinematic quality');
    });
  });

  describe('estimateGenerationComplexity', () => {
    it('should return simple for 0-3 total tags', () => {
      const tags: PromptTags = {
        sceneType: ['Bedroom'],
        mood: ['Cozy'],
        lighting: [],
        style: [],
        custom: [],
      };

      expect(estimateGenerationComplexity(tags)).toBe('simple');
    });

    it('should return moderate for 4-7 total tags', () => {
      const tags: PromptTags = {
        sceneType: ['Bedroom'],
        mood: ['Cozy', 'Warm'],
        lighting: ['Natural'],
        style: ['Modern'],
        custom: [],
      };

      expect(estimateGenerationComplexity(tags)).toBe('moderate');
    });

    it('should return complex for 8+ total tags', () => {
      const tags: PromptTags = {
        sceneType: ['Bedroom', 'Master Suite'],
        mood: ['Cozy', 'Warm', 'Inviting'],
        lighting: ['Natural', 'Soft'],
        style: ['Modern'],
        custom: ['hardwood floor'],
      };

      expect(estimateGenerationComplexity(tags)).toBe('complex');
    });
  });

  describe('getAISuggestedTags', () => {
    it('should suggest scene types from product analysis', () => {
      const analysis = {
        sceneTypes: ['Living Room', 'Office', 'Bedroom'],
      };

      const result = getAISuggestedTags(analysis);

      expect(result.sceneType).toEqual(['Living Room', 'Office']);
    });

    it('should suggest style from product analysis', () => {
      const analysis = {
        style: 'Modern',
      };

      const result = getAISuggestedTags(analysis);

      expect(result.style).toEqual(['Modern']);
    });

    it('should suggest mood based on style', () => {
      const analysis = {
        style: 'Scandinavian',
      };

      const result = getAISuggestedTags(analysis);

      expect(result.mood).toEqual(['Cozy']);
    });

    it('should always suggest Natural lighting', () => {
      const result = getAISuggestedTags({});

      expect(result.lighting).toEqual(['Natural']);
    });
  });

  describe('mergeTagSuggestions', () => {
    it('should prefer user selections over AI suggestions', () => {
      const aiSuggestions = {
        sceneType: ['Living Room'],
        style: ['Modern'],
        mood: ['Elegant'],
        lighting: ['Natural'],
      };

      const userSelections: PromptTags = {
        sceneType: ['Bedroom'],
        style: [],
        mood: [],
        lighting: [],
        custom: ['custom tag'],
      };

      const result = mergeTagSuggestions(aiSuggestions, userSelections);

      expect(result.sceneType).toEqual(['Bedroom']); // User selection
      expect(result.style).toEqual(['Modern']); // AI suggestion (user empty)
      expect(result.mood).toEqual(['Elegant']); // AI suggestion (user empty)
      expect(result.custom).toEqual(['custom tag']); // Custom always from user
    });

    it('should use AI suggestions when user has no selections', () => {
      const aiSuggestions = {
        sceneType: ['Office'],
        style: ['Industrial'],
        mood: ['Professional'],
        lighting: ['Bright'],
      };

      const userSelections: PromptTags = {
        sceneType: [],
        style: [],
        mood: [],
        lighting: [],
        custom: [],
      };

      const result = mergeTagSuggestions(aiSuggestions, userSelections);

      expect(result.sceneType).toEqual(['Office']);
      expect(result.style).toEqual(['Industrial']);
      expect(result.mood).toEqual(['Professional']);
      expect(result.lighting).toEqual(['Bright']);
    });
  });
});

