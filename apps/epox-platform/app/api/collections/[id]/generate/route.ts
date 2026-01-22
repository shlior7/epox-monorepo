/**
 * Collection Generate API Route
 * Creates generation flows for products and starts generation
 * POST /api/collections/:id/generate
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withGenerationSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import type { FlowGenerationSettings, ProductImage } from 'visualizer-types';
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
    if (
      !verifyOwnership({
        clientId,
        resourceClientId: collection.clientId,
        resourceType: 'collection',
        resourceId: collectionId,
      })
    ) {
      return forbiddenResponse();
    }

    const generationFlows = await db.generationFlows.listByCollectionSession(collectionId);

    // Get all product IDs to fetch their images
    const allProductIds = generationFlows.flatMap((f) => f.productIds);
    const productImagesMap =
      allProductIds.length > 0
        ? await db.productImages.listByProductIds(allProductIds)
        : new Map<string, ProductImage[]>();

    // Merge settings: request settings override collection settings
    const mergedSettings: Partial<FlowGenerationSettings> = {
      inspirationImages: [],
      aspectRatio: '1:1',
      imageQuality: '2k',
      variantsCount: 1,
      ...collection.settings,
      ...body.settings,
    };

    // Get inspiration image URLs from settings
    const inspirationImageUrls = mergedSettings.inspirationImages?.map((img) => img.url) || [];

    // Build collection settings for Art Director context
    const collectionSettings = {
      stylePreset: mergedSettings.stylePreset as string | undefined,
      lightingPreset: mergedSettings.lightingPreset as string | undefined,
      userPrompt: mergedSettings.userPrompt as string | undefined,
    };

    // Create separate jobs for each gen flow so each gets its own generated images
    const jobIds: string[] = [];

    for (let i = 0; i < generationFlows.length; i++) {
      const flow = generationFlows[i];
      const flowId = flow.id;
      const productIds = flow.productIds;
      let productImageUrls = Object.values(flow.selectedBaseImages);

      productIds.forEach((productId) => {
        if (!flow.selectedBaseImages[productId]) {
          const productImages = productImagesMap.get(productId) || [];
          // Use explicitly marked primary image, or fall back to first by sort order
          const primaryImage = productImages.find((img) => img.isPrimary) ?? productImages[0];
          if (primaryImage?.r2KeyBase) {
            const baseUrl = `${process.env.R2_PUBLIC_URL || 'https://pub-xxx.r2.dev'}/${primaryImage.r2KeyBase}`;
            flow.selectedBaseImages[productId] = baseUrl;
          }
        }
      });
      // Use stored selectedBaseImages (productId -> imageUrl)
      productImageUrls = Object.values(flow.selectedBaseImages);

      // Create a job for this product
      const { jobId } = await enqueueImageGeneration(
        clientId,
        {
          prompt: '', // Will be built by the worker using Art Director
          productIds: flow.productIds,
          sessionId: flowId,
          settings: {
            aspectRatio: mergedSettings.aspectRatio,
            imageQuality: mergedSettings.imageQuality,
            numberOfVariants: mergedSettings.variantsCount ?? 1,
          },
          productImageUrls,
          inspirationImageUrls,
          collectionSettings,
        },
        {
          priority: 100,
          flowId,
        }
      );

      // Create placeholder asset with pending status so we can resume polling on refresh
      await db.generatedAssets.create({
        clientId,
        generationFlowId: flowId,
        assetUrl: '', // Will be set when job completes
        assetType: 'image',
        status: 'pending',
        jobId,
        productIds: flow.productIds,
        settings: mergedSettings as FlowGenerationSettings,
      });

      jobIds.push(jobId);
      console.log(
        `🚀 Started generation job ${jobId} for flow ${flowId}, products ${productIds.join(',')}, base images: ${productImageUrls.join(', ') || 'none'}`
      );
    }

    // Update collection status to generating
    await db.collectionSessions.update(collectionId, { status: 'generating' });

    console.log(`🎯 Started ${jobIds.length} generation jobs for collection ${collectionId}`);

    return NextResponse.json({
      success: true,
      jobIds,
      flowIds: generationFlows.map((f) => f.id),
      productCount: generationFlows.reduce((sum, f) => sum + f.productIds.length, 0),
      message: `Generation started for ${jobIds.length} flows`,
    });
  } catch (error) {
    console.error('❌ Failed to start collection generation:', error);
    const message = error instanceof Error ? error.message : 'Failed to start generation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
