/**
 * Art Director API Tests
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as artDirector } from '@/app/api/art-director/route';
import type { VisionAnalysisResult, SubjectAnalysis } from 'visualizer-types';

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

  it('should reject missing inspiration images', async () => {
    const request = new NextRequest('http://localhost:3000/api/art-director', {
      method: 'POST',
      body: JSON.stringify({
        subjectAnalysis,
        sceneTypeInspirations: {},
      }),
    });

    const response = await artDirector(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('No inspiration images');
  });

  it('should build prompt with matched scene type and user additions', async () => {
    const request = new NextRequest('http://localhost:3000/api/art-director', {
      method: 'POST',
      body: JSON.stringify({
        subjectAnalysis: {
          ...subjectAnalysis,
          nativeSceneTypes: ['living room'],
        },
        sceneTypeInspirations: {
          'Living Room': {
            inspirationImages: [],
            mergedAnalysis: visionAnalysis,
          },
        },
        stylePreset: 'Scandinavian',
        lightingPreset: 'Golden Hour',
        userPrompt: 'Add a green plant in the corner.',
      }),
    });

    const response = await artDirector(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.matchedSceneType).toBe('Living Room');
    expect(data.segments.introAnchor).toContain('Dining-Chair');
    expect(data.finalPrompt).toContain('Add a green plant in the corner.');
  });
});
