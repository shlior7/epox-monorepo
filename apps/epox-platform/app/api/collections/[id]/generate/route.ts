/**
 * Collection Generate API Route
 * Creates generation flows for products and starts generation
 * POST /api/collections/:id/generate
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withGenerationSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import { resolveStorageUrl } from 'visualizer-storage';
import type { FlowGenerationSettings, ProductImage, BubbleValue, SceneTypeInspirationMap } from 'visualizer-types';
import { enqueueImageGeneration } from 'visualizer-ai';
import { buildBubblePromptSection } from '@/lib/services/bubble-prompt-extractor';
import { enforceQuota, consumeCredits } from '@/lib/services/quota';

interface GenerateRequest {
  productIds?: string[]; // Optional: specific products to generate (defaults to all)
  settings?: Partial<FlowGenerationSettings>; // Override collection settings
}


// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
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
    const mergedSettings: Record<string, any> = {
      aspectRatio: '1:1',
      imageQuality: '2k',
      variantsPerProduct: 1,
      ...collection.settings,
      ...body.settings,
    };

    // Calculate total expected images across all flows and enforce quota
    const variantsPerProduct = mergedSettings.variantsPerProduct ?? 1;
    const totalExpectedImages = generationFlows.reduce(
      (sum, f) => sum + f.productIds.length * variantsPerProduct,
      0
    );
    const quotaDenied = await enforceQuota(clientId, totalExpectedImages);
    if (quotaDenied) return quotaDenied;

    // Extract general inspiration bubbles
    const generalInspiration: BubbleValue[] = Array.isArray(mergedSettings.generalInspiration)
      ? mergedSettings.generalInspiration
      : [];
    const sceneTypeInspiration: SceneTypeInspirationMap = mergedSettings.sceneTypeInspiration || {};
    const useSceneTypeInspiration: boolean = mergedSettings.useSceneTypeInspiration !== false;

    // Build prompt from bubbles
    const promptParts: string[] = [];
    const generalPrompt = buildBubblePromptSection(generalInspiration);
    if (generalPrompt) promptParts.push(generalPrompt);
    if (mergedSettings.userPrompt) promptParts.push(mergedSettings.userPrompt);
    const basePrompt = promptParts.join('\n');

    // Extract reference image URLs from reference bubbles
    const inspirationImageUrls: string[] = [];
    for (const bubble of generalInspiration) {
      if (bubble.type === 'reference' && bubble.image?.url) {
        inspirationImageUrls.push(bubble.image.url);
      }
    }

    // Build collection settings for Art Director context
    const collectionSettings = {
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
          if (primaryImage?.imageUrl) {
            const fullUrl = resolveStorageUrl(primaryImage.imageUrl);
            if (fullUrl) {
              flow.selectedBaseImages[productId] = fullUrl;
            }
          }
        }
      });
      // Use stored selectedBaseImages (productId -> imageUrl)
      productImageUrls = Object.values(flow.selectedBaseImages);

      // Build per-flow prompt: base prompt + scene-type-specific bubbles
      let flowPrompt = basePrompt;
      const flowSceneType = (flow.settings as any)?.sceneType;
      if (useSceneTypeInspiration && flowSceneType && sceneTypeInspiration[flowSceneType]) {
        const stBubbles = sceneTypeInspiration[flowSceneType].bubbles || [];
        const stPrompt = buildBubblePromptSection(stBubbles);
        if (stPrompt) {
          flowPrompt = flowPrompt ? `${flowPrompt}\n${stPrompt}` : stPrompt;
        }
        // Also extract reference images from scene-type bubbles
        for (const bubble of stBubbles) {
          if (bubble.type === 'reference' && bubble.image?.url) {
            inspirationImageUrls.push(bubble.image.url);
          }
        }
      }

      // Create a job for this product
      const { jobId } = await enqueueImageGeneration(
        clientId,
        {
          prompt: flowPrompt,
          productIds: flow.productIds,
          sessionId: flowId,
          settings: {
            aspectRatio: mergedSettings.aspectRatio,
            imageQuality: mergedSettings.imageQuality,
            numberOfVariants: mergedSettings.variantsPerProduct ?? 1,
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

    // Consume credits after all jobs enqueued successfully
    await consumeCredits(clientId, totalExpectedImages);

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
