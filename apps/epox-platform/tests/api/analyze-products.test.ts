/**
 * Analyze Products API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as analyzeProducts } from '@/app/api/analyze-products/route';

let mockProductAnalysisService: { analyzeProductWithAI: ReturnType<typeof vi.fn> };
let mockGemini: { analyzeScene: ReturnType<typeof vi.fn> };

vi.mock('visualizer-ai', () => ({
  getProductAnalysisService: vi.fn(() => mockProductAnalysisService),
  getGeminiService: vi.fn(() => mockGemini),
}));

describe('Analyze Products API - POST /api/analyze-products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProductAnalysisService = {
      analyzeProductWithAI: vi.fn(),
    };
    mockGemini = {
      analyzeScene: vi.fn(),
    };
  });

  it('should require products or productIds', async () => {
    const request = new NextRequest('http://localhost:3000/api/analyze-products', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await analyzeProducts(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('products or productIds');
  });

  it('should analyze products with AI and build suggested tags', async () => {
    mockProductAnalysisService.analyzeProductWithAI.mockResolvedValue({
      productType: 'sofa',
      sceneTypes: ['Living Room', 'Bedroom'],
      colorSchemes: [{ name: 'Neutral', colors: ['beige'] }],
      materials: ['fabric'],
      size: { type: 'medium' },
      styles: ['Modern'],
      confidence: 0.9,
      analysisMethod: 'ai',
    });

    const request = new NextRequest('http://localhost:3000/api/analyze-products', {
      method: 'POST',
      body: JSON.stringify({
        products: [
          { productId: 'prod-1', name: 'Sofa', category: 'Sofas' },
        ],
      }),
    });

    const response = await analyzeProducts(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.productAnalyses).toHaveLength(1);
    expect(data.suggestedTags.sceneType).toEqual(['Living Room', 'Bedroom']);
    expect(data.suggestedTags.style).toEqual(['Modern']);
    expect(data.suggestedTags.lighting).toEqual(['Natural']);
  });

  it('should fall back when AI analysis fails', async () => {
    mockProductAnalysisService.analyzeProductWithAI.mockRejectedValueOnce(
      new Error('AI failed')
    );

    const request = new NextRequest('http://localhost:3000/api/analyze-products', {
      method: 'POST',
      body: JSON.stringify({
        products: [
          { productId: 'prod-1', name: 'Chair', category: 'Chair' },
        ],
      }),
    });

    const response = await analyzeProducts(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.productAnalyses).toHaveLength(1);
    expect(data.productAnalyses[0].analysisMethod).toBe('fallback');
    expect(data.productAnalyses[0].productType).toBe('chair');
  });

  it('should use legacy image analysis when productImageUrls provided', async () => {
    mockGemini.analyzeScene.mockResolvedValue({
      style: 'Industrial',
      sceneType: 'Kitchen',
      lighting: 'Warm',
      promptText: 'Industrial kitchen scene',
    });

    const request = new NextRequest('http://localhost:3000/api/analyze-products', {
      method: 'POST',
      body: JSON.stringify({
        productIds: ['prod-1'],
        productImageUrls: ['https://example.com/product.jpg'],
      }),
    });

    const response = await analyzeProducts(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.productAnalysis.style).toBe('Industrial');
    expect(data.productAnalysis.sceneTypes).toEqual(['Kitchen']);
    expect(data.suggestedTags.style).toEqual(['Industrial']);
    expect(data.suggestedTags.sceneType).toEqual(['Kitchen']);
  });

  it('should return defaults when legacy analysis fails', async () => {
    mockGemini.analyzeScene.mockRejectedValueOnce(new Error('Service down'));

    const request = new NextRequest('http://localhost:3000/api/analyze-products', {
      method: 'POST',
      body: JSON.stringify({
        productIds: ['prod-1'],
        productImageUrls: ['https://example.com/product.jpg'],
      }),
    });

    const response = await analyzeProducts(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suggestedTags.sceneType).toEqual(['Living Room']);
    expect(data.suggestedTags.style).toEqual(['Modern']);
    expect(data.suggestedTags.lighting).toEqual(['Natural']);
  });

  it('should merge inspiration analysis into suggestions', async () => {
    mockGemini.analyzeScene
      .mockResolvedValueOnce({
        style: 'Modern',
        sceneType: 'Bedroom',
        lighting: 'Natural',
        promptText: 'Modern bedroom',
      })
      .mockResolvedValueOnce({
        style: 'Coastal',
        sceneType: 'Bedroom',
        lighting: 'Golden Hour',
        promptText: 'Coastal warm light',
      });

    const request = new NextRequest('http://localhost:3000/api/analyze-products', {
      method: 'POST',
      body: JSON.stringify({
        productIds: ['prod-1'],
        productImageUrls: ['https://example.com/product.jpg'],
        inspirationImageUrls: ['https://example.com/inspo.jpg'],
      }),
    });

    const response = await analyzeProducts(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.inspirationAnalysis.commonStyle).toBe('Coastal');
    expect(data.suggestedTags.style).toEqual(['Coastal']);
    expect(data.suggestedTags.lighting).toEqual(['Golden Hour']);
  });
});
