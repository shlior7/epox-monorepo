/**
 * Art Director API Tests
 * Tests both legacy and new bubble-based prompt generation
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as artDirector } from '@/app/api/art-director/route';
import type { VisionAnalysisResult, SubjectAnalysis, BubbleValue } from 'visualizer-types';

const visionAnalysis: VisionAnalysisResult = {
  json: {
    styleSummary: 'Warm minimal interior with soft textures',
    detectedSceneType: 'Living Room',
    heroObjectAccessories: {
      identity: 'linen throw',
      materialPhysics: 'linen',
      placement: 'folded over the armrest',
    },
    sceneInventory: [
      {
        identity: 'Back Wall',
        geometry: 'flat',
        surfacePhysics: 'plaster',
        colorGrading: 'warm white',
        spatialContext: 'behind sofa',
      },
      {
        identity: 'Floor',
        geometry: 'flat',
        surfacePhysics: 'oak',
        colorGrading: 'honey',
        spatialContext: 'underfoot',
      },
      {
        identity: 'Side Table',
        geometry: 'round',
        surfacePhysics: 'marble',
        colorGrading: 'white',
        spatialContext: 'beside seating',
      },
    ],
    lightingPhysics: {
      sourceDirection: 'soft daylight from left',
      shadowQuality: 'gentle shadows',
      colorTemperature: 'warm',
    },
  },
  promptText: 'Warm minimal interior scene',
};

const subjectAnalysis: SubjectAnalysis = {
  subjectClassHyphenated: 'Dining-Chair',
  nativeSceneTypes: ['Living Room'],
  nativeSceneCategory: 'Indoor Room',
  inputCameraAngle: 'Frontal',
  dominantColors: ['brown'],
  materialTags: ['wood'],
};

describe('Art Director API - POST /api/art-director', () => {
  it('should reject missing subjectAnalysis', async () => {
    const request = new NextRequest('http://localhost:3000/api/art-director', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await artDirector(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('subjectAnalysis');
  });

  describe('Bubble-based prompt generation', () => {
    it('should extract style bubble context', async () => {
      const bubbles: BubbleValue[] = [
        {
          type: 'style',
          preset: 'Modern Minimalist',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/art-director', {
        method: 'POST',
        body: JSON.stringify({
          subjectAnalysis,
          bubbles,
          sceneType: 'Living Room',
        }),
      });

      const response = await artDirector(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.finalPrompt).toContain('Modern Minimalist');
    });

    it('should extract lighting bubble context', async () => {
      const bubbles: BubbleValue[] = [
        {
          type: 'lighting',
          preset: 'Natural Daylight',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/art-director', {
        method: 'POST',
        body: JSON.stringify({
          subjectAnalysis,
          bubbles,
          sceneType: 'Living Room',
        }),
      });

      const response = await artDirector(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.finalPrompt).toContain('Natural Daylight');
    });

    it('should extract camera angle bubble context', async () => {
      const bubbles: BubbleValue[] = [
        {
          type: 'camera-angle',
          preset: 'Eye Level',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/art-director', {
        method: 'POST',
        body: JSON.stringify({
          subjectAnalysis,
          bubbles,
          sceneType: 'Living Room',
        }),
      });

      const response = await artDirector(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.finalPrompt.toLowerCase()).toContain('eye level');
    });

    it('should extract mood bubble context', async () => {
      const bubbles: BubbleValue[] = [
        {
          type: 'mood',
          preset: 'Calm & Peaceful',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/art-director', {
        method: 'POST',
        body: JSON.stringify({
          subjectAnalysis,
          bubbles,
          sceneType: 'Living Room',
        }),
      });

      const response = await artDirector(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.finalPrompt.toLowerCase()).toContain('calm');
    });

    it('should extract custom bubble context', async () => {
      const bubbles: BubbleValue[] = [
        {
          type: 'custom',
          value: 'with plants and natural elements',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/art-director', {
        method: 'POST',
        body: JSON.stringify({
          subjectAnalysis,
          bubbles,
          sceneType: 'Living Room',
        }),
      });

      const response = await artDirector(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.finalPrompt).toContain('with plants and natural elements');
    });

    it('should extract color palette bubble context', async () => {
      const bubbles: BubbleValue[] = [
        {
          type: 'color-palette',
          colors: ['#FFFFFF', '#000000', '#808080'],
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/art-director', {
        method: 'POST',
        body: JSON.stringify({
          subjectAnalysis,
          bubbles,
          sceneType: 'Living Room',
        }),
      });

      const response = await artDirector(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.finalPrompt).toMatch(/#FFFFFF/);
    });

    it('should extract multiple bubble contexts together', async () => {
      const bubbles: BubbleValue[] = [
        {
          type: 'style',
          preset: 'Modern Minimalist',
        },
        {
          type: 'lighting',
          preset: 'Natural Daylight',
        },
        {
          type: 'camera-angle',
          preset: 'Eye Level',
        },
        {
          type: 'mood',
          preset: 'Calm & Peaceful',
        },
        {
          type: 'custom',
          value: 'with plants',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/art-director', {
        method: 'POST',
        body: JSON.stringify({
          subjectAnalysis,
          bubbles,
          sceneType: 'Living Room',
        }),
      });

      const response = await artDirector(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // All contexts should be present in the final prompt
      const prompt = data.finalPrompt.toLowerCase();
      expect(prompt).toContain('modern minimalist');
      expect(prompt).toContain('natural daylight');
      expect(prompt).toContain('eye level');
      expect(prompt).toContain('calm');
      expect(prompt).toContain('with plants');
    });

    it('should work with at least one non-empty bubble', async () => {
      // Empty bubbles would fail without inspiration images,
      // but with at least one bubble with content, it should work
      const bubbles: BubbleValue[] = [
        { type: 'style' }, // Empty
        { type: 'custom', value: 'minimal setup' }, // Has content
      ];

      const request = new NextRequest('http://localhost:3000/api/art-director', {
        method: 'POST',
        body: JSON.stringify({
          subjectAnalysis,
          bubbles,
          sceneType: 'Living Room',
        }),
      });

      const response = await artDirector(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.finalPrompt).toBeDefined();
      expect(data.finalPrompt).toContain('minimal setup');
    });

    it('should build prompt with user additions', async () => {
      const bubbles: BubbleValue[] = [
        {
          type: 'style',
          preset: 'Industrial',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/art-director', {
        method: 'POST',
        body: JSON.stringify({
          subjectAnalysis,
          bubbles,
          userPrompt: 'Add a green plant in the corner.',
          sceneType: 'Living Room',
        }),
      });

      const response = await artDirector(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.finalPrompt).toContain('Industrial');
      expect(data.finalPrompt).toContain('Add a green plant in the corner.');
    });
  });
});
