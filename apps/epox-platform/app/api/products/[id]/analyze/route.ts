/**
 * Product Analysis API Route
 * POST /api/products/[id]/analyze
 * Triggers AI analysis for a product, saves results, returns analysis data.
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security/middleware';
import { verifyOwnership, forbiddenResponse } from '@/lib/security/auth';
import { db } from '@/lib/services/db';
import { resolveStorageUrlAbsolute } from 'visualizer-storage';

export const dynamic = 'force-dynamic';

export const POST = withSecurity(async (_request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const product = await db.products.getById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (
      !verifyOwnership({
        clientId,
        resourceClientId: product.clientId,
        resourceType: 'product',
        resourceId: id,
      })
    ) {
      return forbiddenResponse();
    }

    // Get primary image URL
    const imagesMap = await db.productImages.listByProductIds([id]);
    const images = imagesMap.get(id) || [];
    const primaryImage = images.find((img) => img.isPrimary) ?? images[0];
    const imageUrl = primaryImage?.imageUrl
      ? (resolveStorageUrlAbsolute(primaryImage.imageUrl) ?? undefined)
      : undefined;

    // Run AI analysis
    const { getProductAnalysisService } = await import('visualizer-ai');
    const analysisService = getProductAnalysisService();

    const result = await analysisService.analyzeProductWithAI(
      {
        productId: id,
        name: product.name,
        description: product.description ?? undefined,
        category: product.category ?? undefined,
        imageUrl,
      },
      { forceAI: true }
    );

    // Build analysis data
    const primaryColor = result.colorSchemes?.[0]?.colors[0] || '#000000';
    const analysisData = {
      analyzedAt: new Date().toISOString(),
      productType: result.productType || 'product',
      materials: result.materials || [],
      colors: result.colorSchemes?.[0]
        ? { primary: primaryColor, accent: result.colorSchemes[0].colors.slice(1) }
        : { primary: '#000000' },
      dominantColorHex: primaryColor,
      style: result.styles || [],
      sceneTypes: result.sceneTypes || ['Living Room'],
      scaleHints: { width: result.size?.type || 'medium', height: result.size?.dimensions || 'medium' },
      promptKeywords: [],
      version: '1.0',
      subject: {
        subjectClassHyphenated: result.productType?.replace(/\s+/g, '-') || 'product',
        nativeSceneTypes: result.sceneTypes || ['Living Room'],
        nativeSceneCategory: 'Indoor Room' as const,
        inputCameraAngle: 'Frontal' as const,
        dominantColors: result.colorSchemes?.[0]?.colors,
        materialTags: result.materials,
      },
    };

    // Save analysis to product
    await db.products.update(id, {
      analysisData,
      analyzedAt: new Date(),
      // Also populate category and sceneTypes if they are empty
      ...(product.category ? {} : { category: result.productType || undefined }),
      ...(!product.sceneTypes?.length ? { sceneTypes: result.sceneTypes || ['Living Room'] } : {}),
    });

    console.log(`✅ Analyzed product: ${product.name}`);
    return NextResponse.json({
      success: true,
      productId: id,
      analysis: analysisData,
    });
  } catch (error: unknown) {
    console.error('❌ Failed to analyze product:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
