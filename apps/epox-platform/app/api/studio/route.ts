/**
 * Single Product Studio Session API
 * Creates chat sessions for single-product generation
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import type { FlowGenerationSettings } from 'visualizer-types';

/**
 * Create a new studio session for a single product
 */
export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { productId, productName, mode = 'generate' } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Verify product ownership
    const product = await db.products.getById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!verifyOwnership({
      clientId,
      resourceClientId: product.clientId,
      resourceType: 'product',
      resourceId: productId,
    })) {
      return forbiddenResponse();
    }

    // Create a chat session for the product
    const generationFlow = await db.generationFlows.create(clientId, {
      collectionSessionId: null,
      name: productName ?? `Studio Session ${new Date().toLocaleDateString()}`,
      productIds: [productId],
      selectedBaseImages: body.baseImageId ? { [productId]: body.baseImageId } : {},
      settings: {},
      isFavorite: false,
    });

    // Map to frontend format
    const studioSession = {
      id: generationFlow.id,
      type: 'single',
      productId,
      baseImageId: body.baseImageId,
      productName: productName ?? 'Untitled',
      mode,
      status: 'draft',
      settings: {
        aspectRatio: '1:1',
        imageQuality: '1k',
        variantsCount: 1,
        matchProductColors: true,
      } as Partial<FlowGenerationSettings>,
      promptTags: {
        sceneType: [],
        mood: [],
        lighting: [],
        style: [],
        custom: [],
      },
      inspirationImages: [],
      generatedAssets: [],
      createdAt: generationFlow.createdAt.toISOString(),
      updatedAt: generationFlow.updatedAt.toISOString(),
    };

    console.log('✅ Created studio session:', generationFlow.id);
    return NextResponse.json(studioSession, { status: 201 });
  } catch (error: unknown) {
    console.error('❌ Failed to create studio session:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

/**
 * Get existing studio sessions for a product
 */
export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Verify product ownership
    const product = await db.products.getById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!verifyOwnership({
      clientId,
      resourceClientId: product.clientId,
      resourceType: 'product',
      resourceId: productId,
    })) {
      return forbiddenResponse();
    }

    const generationFlows = await db.generationFlows.listByProduct(productId);
    return NextResponse.json(generationFlows);
  } catch (error: unknown) {
    console.error('❌ Failed to fetch studio sessions:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
