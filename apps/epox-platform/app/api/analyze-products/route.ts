/**
 * API Route: Analyze products for structured data extraction
 * POST /api/analyze-products
 *
 * Uses AI-powered ProductAnalysisService to extract:
 * - Product type
 * - Room types
 * - Color schemes (multiple if available)
 * - Materials
 * - Size (small/medium/large or specific dimensions)
 * - Styles
 *
 * Used during product import/upload for user review and approval
 */

import { NextResponse } from 'next/server';
import {
  getProductAnalysisService,
  getGeminiService,
  type AIAnalysisResult,
} from 'visualizer-ai';
import { getAISuggestedTags } from '@/lib/services/prompt-builder';
import type { PromptTags } from '@/lib/types';
import { withSecurity, validateUrls } from '@/lib/security';

interface ProductToAnalyze {
  productId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  imageUrl?: string;
}

interface AnalyzeRequest {
  /** Products to analyze with full metadata */
  products?: ProductToAnalyze[];
  /** Legacy support: product IDs only */
  productIds?: string[];
  /** Legacy support: product image URLs for simple analysis */
  productImageUrls?: string[];
  /** Inspiration images for style analysis */
  inspirationImageUrls?: string[];
  /** Whether to use AI-powered analysis (default: true) */
  useAI?: boolean;
}

interface AnalyzeResponse {
  /** AI analysis results per product */
  productAnalyses?: AIAnalysisResult[];
  /** Legacy: suggested tags for generation */
  suggestedTags: Partial<PromptTags>;
  /** Inspiration image analysis */
  inspirationAnalysis?: {
    commonStyle: string;
    commonMood: string;
    commonLighting: string;
    suggestedPrompt: string;
  };
  /** Legacy: simple product analysis */
  productAnalysis?: {
    style: string;
    sceneTypes: string[];
  };
}

export const POST = withSecurity(async (request) => {
  const body: AnalyzeRequest = await request.json();
  const { products, productIds, productImageUrls, inspirationImageUrls, useAI = true } = body;

  // Validate input - need either products array or productIds
  if ((!products || products.length === 0) && (!productIds || productIds.length === 0)) {
    return NextResponse.json(
      { error: 'Missing required parameter: products or productIds' },
      { status: 400 }
    );
  }

  // Validate image URLs for SSRF protection
  if (productImageUrls && productImageUrls.length > 0) {
    const urlValidation = validateUrls(productImageUrls, { allowDataUrls: true });
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid product image URLs', details: urlValidation.errors },
        { status: 400 }
      );
    }
  }

  if (inspirationImageUrls && inspirationImageUrls.length > 0) {
    const urlValidation = validateUrls(inspirationImageUrls, { allowDataUrls: true });
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid inspiration image URLs', details: urlValidation.errors },
        { status: 400 }
      );
    }
  }

  // Validate imageUrl in product entries
  if (products && products.length > 0) {
    const imageUrls = products.filter((p) => p.imageUrl).map((p) => p.imageUrl as string);
    if (imageUrls.length > 0) {
      const urlValidation = validateUrls(imageUrls, { allowDataUrls: true });
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid product image URLs', details: urlValidation.errors },
          { status: 400 }
        );
      }
    }
  }

  console.log('🔍 Analyzing products...');

  const productAnalysisService = getProductAnalysisService();
  let productAnalyses: AIAnalysisResult[] = [];
  let suggestedTags: Partial<PromptTags> = {};
  let productAnalysis;
  let inspirationAnalysis;

  // New path: analyze products with full metadata using AI
  if (products && products.length > 0) {
    console.log(`📦 Analyzing ${products.length} products with AI...`);

    // Analyze each product with AI
    productAnalyses = await Promise.all(
      products.map(async (p) => {
        try {
          return await productAnalysisService.analyzeProductWithAI({
            productId: p.productId,
            name: p.name,
            description: p.description,
            category: p.category,
            tags: p.tags,
            imageUrl: p.imageUrl,
          });
        } catch (error) {
          console.warn(`⚠️ Analysis failed for ${p.name}:`, error);
          // Return fallback result
          return {
            productType: p.category?.toLowerCase() || 'furniture',
            sceneTypes: ['Living Room'],
            colorSchemes: [{ name: 'Default', colors: ['neutral'] }],
            materials: [],
            size: { type: 'medium' as const },
            styles: ['Modern'],
            confidence: 0.3,
            analysisMethod: 'fallback' as const,
          };
        }
      })
    );

    // Build suggested tags from aggregated analysis
    if (productAnalyses.length > 0) {
      const firstAnalysis = productAnalyses[0];
      const allStyles = [...new Set(productAnalyses.flatMap((a) => a.styles))];
      const allsceneTypes = [...new Set(productAnalyses.flatMap((a) => a.sceneTypes))];

      suggestedTags = getAISuggestedTags({
        style: allStyles[0] || 'Modern',
        sceneTypes: allsceneTypes.slice(0, 3),
      });

      productAnalysis = {
        style: firstAnalysis.styles[0] || 'Modern',
        sceneTypes: firstAnalysis.sceneTypes,
      };
    }

    console.log(`✅ AI analysis complete for ${productAnalyses.length} products`);
  }
  // Legacy path: analyze using image URLs only
  else if (productImageUrls && productImageUrls.length > 0 && useAI) {
    try {
      const gemini = getGeminiService();
      const sceneAnalysis = await gemini.analyzeScene(productImageUrls[0]);
      productAnalysis = {
        style: sceneAnalysis.style || 'Modern',
        sceneTypes: sceneAnalysis.sceneType ? [sceneAnalysis.sceneType] : ['Living Room'],
      };
      suggestedTags = getAISuggestedTags({
        style: productAnalysis.style,
        sceneTypes: productAnalysis.sceneTypes,
      });
      console.log('✅ Legacy product analysis complete');
    } catch (error) {
      console.warn('⚠️ Product analysis failed, using defaults:', error);
      suggestedTags = {
        sceneType: ['Living Room'],
        style: ['Modern'],
        mood: ['Cozy'],
        lighting: ['Natural'],
      };
    }
  } else {
    // Default suggestions
    suggestedTags = {
      sceneType: ['Living Room'],
      style: ['Modern'],
      mood: ['Cozy'],
      lighting: ['Natural'],
    };
  }

  // Analyze inspiration images if provided
  if (inspirationImageUrls && inspirationImageUrls.length > 0) {
    try {
      const gemini = getGeminiService();
      const sceneAnalysis = await gemini.analyzeScene(inspirationImageUrls[0]);
      inspirationAnalysis = {
        commonStyle: sceneAnalysis.style || 'Modern',
        commonMood: 'Cozy',
        commonLighting: sceneAnalysis.lighting || 'Natural',
        suggestedPrompt: sceneAnalysis.promptText || '',
      };

      // Merge inspiration style with suggestions
      if (inspirationAnalysis.commonStyle) {
        suggestedTags.style = [inspirationAnalysis.commonStyle];
      }
      if (inspirationAnalysis.commonLighting) {
        suggestedTags.lighting = [inspirationAnalysis.commonLighting];
      }
      console.log('✅ Inspiration analysis complete');
    } catch (error) {
      console.warn('⚠️ Inspiration analysis failed:', error);
    }
  }

  const response: AnalyzeResponse = {
    productAnalyses: productAnalyses.length > 0 ? productAnalyses : undefined,
    suggestedTags,
    productAnalysis,
    inspirationAnalysis,
  };

  return NextResponse.json(response);
});
