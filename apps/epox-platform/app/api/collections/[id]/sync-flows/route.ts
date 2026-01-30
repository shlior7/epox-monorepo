/**
 * Sync Collection Flows API Route
 * PATCH /api/collections/:id/sync-flows - Update all flows in collection to match collection settings
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import { internalServerErrorResponse } from '@/lib/security/error-handling';
import type { FlowGenerationSettings } from 'visualizer-types';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

export const PATCH = withSecurity(async (_request, context, routeContext) => {
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

    // Get all flows for this collection
    const existingFlows = await db.generationFlows.listByCollectionSession(collectionId);

    if (existingFlows.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'No flows to sync',
      });
    }

    // Batch fetch all products for the flows
    const productIds = [...new Set(existingFlows.flatMap((f) => f.productIds))];
    const productsMap = await db.products.getByIds(productIds);

    // Update each flow with collection settings and matched scene type
    let updatedCount = 0;
    for (const flow of existingFlows) {
      const productId = flow.productIds[0];
      if (!productId) continue;

      const product = productsMap.get(productId);
      const productSceneTypes = product?.sceneTypes || [];

      // Use first available scene type from product
      const matchedSceneType = productSceneTypes[0];

      // Build updated flow settings - inherit collection settings but preserve flow's own sceneType
      const updatedSettings: FlowGenerationSettings = {
        ...collectionSettings,
        ...flow.settings,
        // Only set matched scene type if the flow doesn't already have one
        ...(!flow.settings?.sceneType && matchedSceneType && { sceneType: matchedSceneType }),
      };

      // Update the flow
      await db.generationFlows.update(flow.id, {
        settings: updatedSettings,
      });

      updatedCount++;
      console.log(
        `✅ Synced flow ${flow.id} for product ${productId} (scene: ${matchedSceneType || 'default'})`
      );
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: existingFlows.length,
      message: `Successfully synced ${updatedCount} flows with collection settings`,
    });
  } catch (error) {
    console.error('❌ Failed to sync collection flows:', error);
    return internalServerErrorResponse(error);
  }
});
