/**
 * Collection Flows API Route
 * GET /api/collections/:id/flows - Get generation flows for a collection
 * POST /api/collections/:id/flows - Create flows for products in collection (with scene-matched settings)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import type { FlowGenerationSettings, SceneTypeInspirationMap } from 'visualizer-types';

export const GET = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id: collectionId } = await params;

    // Fetch collection to verify it exists
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

    // Fetch generation flows for this collection
    const flows = await db.generationFlows.listByCollectionSession(collectionId);

    // Get all flow IDs to batch fetch generated assets
    const flowIds = flows.map((f) => f.id);
    const allGeneratedAssets = flowIds.length > 0 
      ? await db.generatedAssets.listByGenerationFlowIds(flowIds)
      : [];

    // Group assets by flow ID
    const assetsByFlowId = new Map<string, typeof allGeneratedAssets>();
    for (const asset of allGeneratedAssets) {
      if (asset.generationFlowId) {
        const existing = assetsByFlowId.get(asset.generationFlowId) || [];
        existing.push(asset);
        assetsByFlowId.set(asset.generationFlowId, existing);
      }
    }

    // Map flows to include product info and generated images
    const flowsWithProducts = await Promise.all(
      flows.map(async (flow) => {
        const productId = flow.productIds[0];
        const product = productId ? await db.products.getById(productId) : null;
        const images = productId ? await db.productImages.list(productId) : [];
        const generatedAssets = (assetsByFlowId.get(flow.id) || []).filter(
          (asset) => asset.assetType !== 'video'
        );

        // Determine flow status based on generated assets
        let effectiveStatus = flow.status;
        if (generatedAssets.some((a) => a.status === 'completed')) {
          effectiveStatus = 'completed';
        }

        return {
          id: flow.id,
          productId,
          productName: product?.name || 'Unknown Product',
          productCategory: product?.category,
          productSceneTypes: product?.sceneTypes,
          status: effectiveStatus,
          settings: flow.settings,
          createdAt: flow.createdAt.toISOString(),
          updatedAt: flow.updatedAt.toISOString(),
          baseImages: images.map((img, idx) => ({
            id: img.id,
            url: `${process.env.R2_PUBLIC_URL || 'https://pub-xxx.r2.dev'}/${img.r2KeyBase}`,
            isPrimary: idx === 0,
          })),
          // Include generated images/revisions
          generatedImages: generatedAssets.map((asset) => ({
            id: asset.id,
            imageUrl: asset.assetUrl,
            timestamp: asset.createdAt,
            type: 'generated' as const,
            status: asset.status,
            approvalStatus: asset.approvalStatus,
          })),
        };
      })
    );

    return NextResponse.json({
      flows: flowsWithProducts,
      total: flowsWithProducts.length,
    });
  } catch (error) {
    console.error('❌ Failed to fetch collection flows:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id: collectionId } = await params;
    const body = await request.json().catch(() => ({}));

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

    // Get collection settings
    const collectionSettings = collection.settings;
    const sceneTypeInspirations = collectionSettings?.sceneTypeInspirations;

    // Get existing flows for this collection
    const existingFlows = await db.generationFlows.listByCollectionSession(collectionId);
    const existingProductIds = new Set(existingFlows.flatMap((f) => f.productIds));

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

      // Get product to determine its scene types
      const product = await db.products.getById(productId);
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

      console.log(`✅ Created flow ${flow.id} for product ${productId} (scene: ${matchedSceneType || 'default'})`);
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
