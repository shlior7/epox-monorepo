/**
 * Single Product Studio Session API
 * Creates chat sessions for single-product generation
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { getClientId } from '@/lib/services/get-auth';
import type { FlowGenerationSettings } from 'visualizer-types';

/**
 * Create a new studio session for a single product
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, productName, mode = 'generate' } = body;

    // Always use authenticated client ID - never accept from request body
    const clientId = await getClientId(request);
    if (!clientId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
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
}

/**
 * Get existing studio sessions for a product
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    const generationFlows = await db.generationFlows.listByProduct(productId);
    return NextResponse.json(generationFlows);
  } catch (error: unknown) {
    console.error('❌ Failed to fetch studio sessions:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
