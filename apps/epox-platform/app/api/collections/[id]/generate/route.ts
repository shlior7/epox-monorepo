/**
 * Collection Generate API Route
 * Creates generation flows for products and starts generation
 * POST /api/collections/:id/generate
 *
 * Uses the art-director approach with hierarchical settings cascade:
 * Client → Category → Category+SceneType → Collection → Flow
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withGenerationSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import { resolveStorageUrl } from 'visualizer-storage';
import type { FlowGenerationSettings, ProductImage, BubbleValue, Category, CollectionGenerationSettings } from 'visualizer-types';
import { enqueueImageGeneration } from 'visualizer-ai';
import { enforceQuota, consumeCredits } from '@/lib/services/quota';
import {
  buildArtDirectorPrompt,
  buildSimplePrompt,
  mergeGenerationSettings,
  formatSettingsSources,
  type MergeContext,
} from 'visualizer-ai';

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

    // Get all product IDs to fetch their images and analysis data
    const allProductIds = generationFlows.flatMap((f) => f.productIds);
    const uniqueProductIds = [...new Set(allProductIds)];

    // Fetch products with their images and analysis data
    const [productImagesMap, productsMap] = await Promise.all([
      allProductIds.length > 0 ? db.productImages.listByProductIds(allProductIds) : new Map<string, ProductImage[]>(),
      uniqueProductIds.length > 0 ? db.products.getByIds(uniqueProductIds) : new Map(),
    ]);

    // Fetch client for generation defaults
    const client = await db.clients.getById(clientId);
    const clientDefaults = client?.generationDefaults ?? null;

    // Fetch all categories for this client and build lookup map
    const allCategories = await db.categories.listByClient(clientId);
    const categoriesMap = new Map<string, Category>(allCategories.map((c) => [c.id, c]));

    // Fetch product categories for all products
    const productCategoriesMap = await db.productCategories.getProductsWithCategories(uniqueProductIds);

    // Basic settings from collection and request override
    const baseSettings = {
      aspectRatio: '1:1' as const,
      imageQuality: '2k' as const,
      variantsPerProduct: 1,
      ...collection.settings,
      ...body.settings,
    };

    // Calculate total expected images across all flows and enforce quota
    const variantsPerProduct = baseSettings.variantsPerProduct ?? 1;
    const totalExpectedImages = generationFlows.reduce((sum, f) => sum + f.productIds.length * variantsPerProduct, 0);
    const quotaDenied = await enforceQuota(clientId, totalExpectedImages);
    if (quotaDenied) return quotaDenied;

    // Create separate jobs for each gen flow so each gets its own generated images
    const jobIds: string[] = [];

    for (let i = 0; i < generationFlows.length; i++) {
      const flow = generationFlows[i];
      const flowId = flow.id;
      const productIds = flow.productIds;
      let productImageUrls = Object.values(flow.selectedBaseImages);

      // Resolve product image URLs
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
      productImageUrls = Object.values(flow.selectedBaseImages);

      // Get the first product for this flow (for subject analysis)
      const firstProductId = productIds[0];
      const firstProduct = firstProductId ? productsMap.get(firstProductId) : null;
      const subjectAnalysis = firstProduct?.analysisData?.subject;

      // Get product categories for this product
      const productCategories = productCategoriesMap.get(firstProductId ?? '') ?? [];

      // Get the flow's scene type
      const flowSceneType = (flow.settings as any)?.sceneType || 'Living-Room';

      // Build merge context
      const mergeContext: MergeContext = {
        clientId,
        productId: firstProductId ?? '',
        productCategories,
        sceneType: flowSceneType,
        collectionSettings: collection.settings as CollectionGenerationSettings | undefined,
        flowSettings: flow.settings,
      };

      // Merge settings from all hierarchy levels
      const merged = mergeGenerationSettings(mergeContext, clientDefaults, categoriesMap);

      console.log(`📊 Settings sources for flow ${flowId}: ${formatSettingsSources(merged.sources)}`);

      // Build prompt using art-director approach if we have subject analysis
      let flowPrompt: string;
      if (subjectAnalysis) {
        const artDirectorResult = buildArtDirectorPrompt({
          subjectAnalysis,
          mergedBubbles: merged.mergedBubbles,
          userPrompt: merged.userPrompt,
          sceneType: flowSceneType,
        });
        flowPrompt = artDirectorResult.finalPrompt;
        console.log(`🎨 Art Director prompt segments for flow ${flowId}:`, artDirectorResult.segments);
      } else {
        // Fallback to simple prompt if no subject analysis
        flowPrompt = buildSimplePrompt(merged.mergedBubbles, merged.userPrompt);
        console.log(`📝 Using simple prompt for flow ${flowId} (no subject analysis)`);
      }

      // Extract reference image URLs from merged bubbles
      const inspirationImageUrls: string[] = [];
      for (const bubble of merged.mergedBubbles) {
        if (bubble.type === 'reference' && bubble.image?.url) {
          inspirationImageUrls.push(bubble.image.url);
        }
      }

      // Build collection settings for AI context
      const collectionSettingsForJob = {
        userPrompt: merged.userPrompt,
      };

      // Create a job for this flow
      const { jobId } = await enqueueImageGeneration(
        clientId,
        {
          prompt: flowPrompt,
          productIds: flow.productIds,
          sessionId: flowId,
          settings: {
            aspectRatio: merged.aspectRatio,
            imageQuality: merged.imageQuality,
            numberOfVariants: variantsPerProduct,
          },
          productImageUrls,
          inspirationImageUrls,
          collectionSettings: collectionSettingsForJob,
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
        settings: {
          ...baseSettings,
          aspectRatio: merged.aspectRatio,
          imageQuality: merged.imageQuality,
        } as FlowGenerationSettings,
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
