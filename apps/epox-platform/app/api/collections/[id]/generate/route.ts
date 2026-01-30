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
import { resolveStorageUrlAbsolute } from 'visualizer-storage';
import type {
  FlowGenerationSettings,
  ProductImage,
  BubbleValue,
  Category,
  CollectionGenerationSettings,
  Product,
} from 'visualizer-types';
import { enqueueImageGeneration } from 'visualizer-ai';
import { enforceQuota, consumeCredits } from '@/lib/services/quota';
import {
  buildSmartPrompt,
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
      allProductIds.length > 0
        ? db.productImages.listByProductIds(allProductIds)
        : new Map<string, ProductImage[]>(),
      uniqueProductIds.length > 0 ? db.products.getByIds(uniqueProductIds) : new Map(),
    ]);

    // Fetch client for generation defaults
    const client = await db.clients.getById(clientId);
    const clientDefaults = client?.generationDefaults ?? null;

    // Fetch all categories for this client and build lookup map
    const allCategories = await db.categories.listByClient(clientId);
    const categoriesMap = new Map<string, Category>(allCategories.map((c) => [c.id, c]));

    // Fetch product categories for all products
    const productCategoriesMap =
      await db.productCategories.getProductsWithCategories(uniqueProductIds);

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
    const totalExpectedImages = generationFlows.reduce(
      (sum, f) => sum + f.productIds.length * variantsPerProduct,
      0
    );
    const quotaDenied = await enforceQuota(clientId, totalExpectedImages);
    if (quotaDenied) return quotaDenied;

    // Create separate jobs for each gen flow so each gets its own generated images
    // Process in batches for parallel DB inserts
    const BATCH_SIZE = 50;
    const jobIds: string[] = [];

    // Prepare all flow data first (CPU-bound, no async needed)
    const flowTasks = generationFlows.map((flow) => {
      const flowId = flow.id;
      const productIds = flow.productIds;

      // Resolve product image URLs
      productIds.forEach((productId) => {
        if (!flow.selectedBaseImages[productId]) {
          const productImages = productImagesMap.get(productId) || [];
          const primaryImage = productImages.find((img) => img.isPrimary) ?? productImages[0];
          if (primaryImage?.imageUrl) {
            const fullUrl = resolveStorageUrlAbsolute(primaryImage.imageUrl);
            if (fullUrl) {
              flow.selectedBaseImages[productId] = fullUrl;
            }
          }
        }
      });
      const productImageUrls = Object.values(flow.selectedBaseImages);

      const firstProductId = productIds[0];
      const firstProduct: Product | undefined = firstProductId
        ? productsMap.get(firstProductId)
        : undefined;
      const subjectAnalysis = firstProduct?.analysisData?.subject;
      const productCategories = productCategoriesMap.get(firstProductId ?? '') ?? [];
      const flowSceneType = (flow.settings as any)?.sceneType || 'Living-Room';

      const mergeContext: MergeContext = {
        clientId,
        productId: firstProductId ?? '',
        productCategories,
        sceneType: flowSceneType,
        productDefaultSettings: firstProduct?.defaultGenerationSettings ?? undefined,
        collectionSettings: collection.settings as CollectionGenerationSettings | undefined,
        flowSettings: flow.settings,
      };

      const merged = mergeGenerationSettings(mergeContext, clientDefaults, categoriesMap);
      console.log(
        `📊 Settings sources for flow ${flowId}: ${formatSettingsSources(merged.sources)}`
      );

      const categoryNames = productCategories
        .map((pc) => categoriesMap.get(pc.categoryId)?.name)
        .filter((n): n is string => !!n);

      const smartResult = buildSmartPrompt({
        productName: firstProduct?.name || 'product',
        subjectClass: subjectAnalysis?.subjectClassHyphenated,
        productCategories: categoryNames.length > 0 ? categoryNames : undefined,
        sceneType: flowSceneType,
        subjectAnalysis,
        mergedBubbles: merged.mergedBubbles,
        userPrompt: merged.userPrompt,
      });
      const flowPrompt = smartResult.finalPrompt;
      console.log(`🧠 Smart prompt layers for flow ${flowId}:`, smartResult.layers);

      const inspirationImageUrls: string[] = [];
      for (const bubble of merged.mergedBubbles) {
        if (bubble.type === 'reference' && bubble.image?.url) {
          inspirationImageUrls.push(bubble.image.url);
        }
      }

      return {
        flow,
        flowId,
        productIds,
        productImageUrls,
        flowPrompt,
        merged,
        inspirationImageUrls,
      };
    });

    // Process in batches with Promise.all for parallel DB inserts
    for (let batchStart = 0; batchStart < flowTasks.length; batchStart += BATCH_SIZE) {
      const batch = flowTasks.slice(batchStart, batchStart + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(
          async ({
            flow,
            flowId,
            productIds,
            productImageUrls,
            flowPrompt,
            merged,
            inspirationImageUrls,
          }) => {
            const collectionSettingsForJob = { userPrompt: merged.userPrompt };

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

            await db.generatedAssets.create({
              clientId,
              generationFlowId: flowId,
              assetUrl: '',
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

            console.log(
              `🚀 Started generation job ${jobId} for flow ${flowId}, products ${productIds.join(',')}, base images: ${productImageUrls.join(', ') || 'none'}`
            );

            return jobId;
          }
        )
      );

      jobIds.push(...batchResults);
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
