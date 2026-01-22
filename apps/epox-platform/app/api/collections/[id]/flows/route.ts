/**
 * Collection Flows API Route
 * GET /api/collections/:id/flows - Get generation flows for a collection
 * POST /api/collections/:id/flows - Create flows for products in collection (with scene-matched settings)
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import { internalServerErrorResponse } from '@/lib/security/error-handling';
import type { FlowGenerationSettings } from 'visualizer-types';

export const GET = withSecurity(async (_request, context, routeContext) => {
  const { params } = routeContext;
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id: collectionId } = await params;

    // Fetch collection to verify it exists and ownership
    const collection = await db.collectionSessions.getById(collectionId);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

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

    const r2PublicUrl = process.env.R2_PUBLIC_URL || 'https://pub-xxx.r2.dev';
    const flowsWithDetails = await db.generationFlows.listByCollectionSessionWithDetails(
      collectionId,
      r2PublicUrl
    );

    // Map to API response format
    const flows = flowsWithDetails.map((flow) => {
      // Determine effective status based on generated assets
      let effectiveStatus = flow.status;
      if (flow.generatedAssets.some((a) => a.status === 'completed')) {
        effectiveStatus = 'completed';
      }

      return {
        id: flow.id,
        productId: flow.productIds[0],
        productName: flow.product?.name || 'Unknown Product',
        productCategory: flow.product?.category,
        productSceneTypes: flow.product?.sceneTypes,
        status: effectiveStatus,
        settings: flow.settings,
        createdAt: flow.createdAt.toISOString(),
        updatedAt: flow.updatedAt.toISOString(),
        baseImages: flow.baseImages,
        generatedImages: flow.generatedAssets.map((asset) => ({
          id: asset.id,
          imageUrl: asset.assetUrl,
          timestamp: asset.createdAt,
          type: 'generated' as const,
          status: asset.status,
          approvalStatus: asset.approvalStatus,
          aspectRatio: asset.aspectRatio,
          jobId: asset.jobId,
        })),
      };
    });

    return NextResponse.json({ flows, total: flows.length });
  } catch (error) {
    console.error('❌ Failed to fetch collection flows:', error);
    return internalServerErrorResponse(error);
  }
});

export const POST = withSecurity(async (_request, context, routeContext) => {
  const { params } = routeContext;
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id: collectionId } = await params;

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

    // Get collection settings
    const collectionSettings = collection.settings;
    const sceneTypeInspirations = collectionSettings?.sceneTypeInspirations;

    // Get existing flows for this collection
    const existingFlows = await db.generationFlows.listByCollectionSession(collectionId);
    const existingProductIds = new Set(existingFlows.flatMap((f) => f.productIds));

    // Batch fetch all products that need new flows upfront
    const productsNeedingFlows = collection.productIds.filter((id) => !existingProductIds.has(id));
    const productsMap =
      productsNeedingFlows.length > 0
        ? await db.products.getByIds(productsNeedingFlows)
        : new Map();

    // Create flows for products that don't have one
    const newFlows: Array<{ flowId: string; productId: string }> = [];

    for (const productId of collection.productIds) {
      if (existingProductIds.has(productId)) {
        // Flow already exists for this product
        const flow = existingFlows.find((f) => f.productIds.includes(productId));
        if (flow) {
          newFlows.push({ flowId: flow.id, productId });
        }
        continue;
      }

      // Get product from pre-fetched Map (O(1) lookup)
      const product = productsMap.get(productId);
      const productSceneTypes = product?.sceneTypes || [];

      // Find matching inspiration from collection settings based on product's scene types
      let matchedInspiration: FlowGenerationSettings['inspirationImages'] = [];
      let matchedSceneType: string | undefined;

      if (sceneTypeInspirations && productSceneTypes.length > 0) {
        // Find the first matching scene type
        for (const sceneType of productSceneTypes) {
          if (sceneTypeInspirations[sceneType]) {
            matchedInspiration = sceneTypeInspirations[sceneType].inspirationImages;
            matchedSceneType = sceneType;
            break;
          }
        }
      }

      // If no scene type match, use all collection inspiration images
      if (matchedInspiration.length === 0 && collectionSettings?.inspirationImages) {
        matchedInspiration = collectionSettings.inspirationImages;
      }

      // Build flow settings with matched inspiration
      const flowSettings: Partial<FlowGenerationSettings> = {
        ...collectionSettings,
        inspirationImages: matchedInspiration,
        // Keep the scene type inspirations for reference
        sceneTypeInspirations,
      };

      // Create the flow
      const flow = await db.generationFlows.create(clientId, {
        collectionSessionId: collectionId,
        productIds: [productId],
        selectedBaseImages: collection.selectedBaseImages,
        settings: flowSettings,
      });

      console.log(
        `✅ Created flow ${flow.id} for product ${productId} (scene: ${matchedSceneType || 'default'})`
      );
      newFlows.push({ flowId: flow.id, productId });
    }

    return NextResponse.json({
      success: true,
      flows: newFlows,
      created: newFlows.length - existingFlows.length,
      total: newFlows.length,
    });
  } catch (error) {
    console.error('❌ Failed to create collection flows:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
