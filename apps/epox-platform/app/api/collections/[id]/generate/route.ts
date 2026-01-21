/**
 * Collection Generate API Route
 * Creates generation flows for products and starts generation
 * POST /api/collections/:id/generate
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withGenerationSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import type { FlowGenerationSettings } from 'visualizer-types';
import { enqueueImageGeneration } from 'visualizer-ai';

interface GenerateRequest {
  productIds?: string[]; // Optional: specific products to generate (defaults to all)
  settings?: Partial<FlowGenerationSettings>; // Override collection settings
}

export const POST = withGenerationSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id: collectionId } = await params;
    const body: GenerateRequest = await request.json().catch(() => ({}));

    // Fetch collection
    const collection = await db.collectionSessions.getById(collectionId);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Verify ownership
    if (!verifyOwnership({
      clientId,
      resourceClientId: collection.clientId,
      resourceType: 'collection',
      resourceId: collectionId,
    })) {
      return forbiddenResponse();
    }

    // Determine which products to generate
    const productIdsToGenerate = body.productIds?.length
      ? body.productIds.filter((id) => collection.productIds.includes(id))
      : collection.productIds;

    if (productIdsToGenerate.length === 0) {
      return NextResponse.json({ error: 'No products to generate' }, { status: 400 });
    }

    // Merge settings: request settings override collection settings
    const mergedSettings: Partial<FlowGenerationSettings> = {
      inspirationImages: [],
      aspectRatio: '1:1',
      imageQuality: '2k',
      variantsCount: 1,
      ...collection.settings,
      ...body.settings,
    };

    // Create or get generation flows for each product
    const flowIds: string[] = [];
    const createdFlows: Array<{ flowId: string; productId: string }> = [];

    for (const productId of productIdsToGenerate) {
      // Check if a flow already exists for this product in this collection
      const existingFlows = await db.generationFlows.listByCollectionSession(collectionId);
      let flow = existingFlows.find((f) => f.productIds.includes(productId));

      if (!flow) {
        // Create new generation flow for this product
        flow = await db.generationFlows.create(clientId, {
          collectionSessionId: collectionId,
          productIds: [productId],
          selectedBaseImages: collection.selectedBaseImages,
          settings: mergedSettings,
        });
        console.log(`✅ Created generation flow ${flow.id} for product ${productId}`);
      } else {
        // Update existing flow with latest settings
        flow = await db.generationFlows.update(flow.id, {
          settings: mergedSettings,
        });
        console.log(`📝 Updated generation flow ${flow.id} for product ${productId}`);
      }

      flowIds.push(flow.id);
      createdFlows.push({ flowId: flow.id, productId });
    }

    // Get product image URLs for generation
    const products = await Promise.all(
      productIdsToGenerate.map((id) => db.products.getById(id))
    );
    const productImages = await Promise.all(
      productIdsToGenerate.map((productId) => db.productImages.list(productId))
    );

    const productImageUrls: string[] = [];
    for (let i = 0; i < productIdsToGenerate.length; i++) {
      const productId = productIdsToGenerate[i];
      const images = productImages[i];
      // Use selected base image or first available (sorted by sortOrder, first is primary)
      const selectedImageId = collection.selectedBaseImages[productId];
      const selectedImage = selectedImageId
        ? images.find((img) => img.id === selectedImageId)
        : images[0]; // First image is primary (sorted by sortOrder)
      if (selectedImage) {
        // Convert R2 key to URL
        const baseUrl = `${process.env.R2_PUBLIC_URL || 'https://pub-xxx.r2.dev'}/${selectedImage.r2KeyBase}`;
        productImageUrls.push(baseUrl);
      }
    }

    // Get inspiration image URLs from settings
    const inspirationImageUrls =
      mergedSettings.inspirationImages?.map((img) => img.url) || [];

    // Create a single generation job for all products
    // Use the first flow ID as the session ID (for job tracking)
    const primaryFlowId = flowIds[0];

    const { jobId } = await enqueueImageGeneration(
      clientId,
      {
        prompt: '', // Will be built by the worker using Art Director
        productIds: productIdsToGenerate,
        sessionId: primaryFlowId,
        settings: {
          aspectRatio: mergedSettings.aspectRatio,
          imageQuality: mergedSettings.imageQuality,
          numberOfVariants: mergedSettings.variantsCount ?? 1,
        },
        productImageUrls,
        inspirationImageUrls,
      },
      {
        priority: 100,
        flowId: primaryFlowId,
      }
    );

    // Update collection status to generating
    await db.collectionSessions.update(collectionId, { status: 'generating' });

    console.log(`🚀 Started generation job ${jobId} for collection ${collectionId}`);
    console.log(`   Products: ${productIdsToGenerate.length}, Flows: ${flowIds.length}`);

    return NextResponse.json({
      success: true,
      jobId,
      flowIds,
      flows: createdFlows,
      productCount: productIdsToGenerate.length,
      message: `Generation started for ${productIdsToGenerate.length} products`,
    });
  } catch (error) {
    console.error('❌ Failed to start collection generation:', error);
    const message = error instanceof Error ? error.message : 'Failed to start generation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
