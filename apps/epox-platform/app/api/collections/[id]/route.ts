/**
 * Collection Detail API Route
 * Production-ready with SQL queries and proper data handling
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { storage } from 'visualizer-storage';

// TODO: Replace with actual auth when implemented
const PLACEHOLDER_CLIENT_ID = 'test-client';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch collection from database
    const collection = await db.collectionSessions.getById(id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const flows = await db.generationFlows.listByCollectionSession(id);
    const flowIds = flows.map((flow) => flow.id);

    const [totalImages, generatedCount] = await Promise.all([
      db.generatedAssets.countByGenerationFlowIds(PLACEHOLDER_CLIENT_ID, flowIds),
      db.generatedAssets.countByGenerationFlowIds(PLACEHOLDER_CLIENT_ID, flowIds, 'completed'),
    ]);

    // Migrate old selectedBaseImages format to new settings.inspirationImages if needed
    let settings = collection.settings;
    if (!settings?.inspirationImages && Object.keys(collection.selectedBaseImages).length > 0) {
      // Legacy collection: convert selectedBaseImages to settings format
      const inspirationImagesArray = Object.values(collection.selectedBaseImages).map((url) => ({
        url,
        thumbnailUrl: url,
        tags: [],
        addedAt: collection.createdAt.toISOString(),
        sourceType: 'upload' as const,
      }));

      settings = {
        ...settings,
        inspirationImages: inspirationImagesArray,
        aspectRatio: settings?.aspectRatio ?? '1:1',
        imageQuality: settings?.imageQuality ?? '2k',
        variantsCount: settings?.variantsCount ?? 1,
      };
    }

    // Map to frontend format
    const response = {
      id: collection.id,
      name: collection.name,
      status: collection.status,
      productCount: collection.productIds.length,
      productIds: collection.productIds,
      generatedCount,
      totalImages,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      promptTags: {
        sceneType: [],
        mood: [],
        lighting: [],
        style: [],
        custom: [],
      },
      inspirationImages: Object.values(collection.selectedBaseImages),
      // New settings structure (with migration applied)
      settings,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('❌ Failed to fetch collection:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Fetch collection first to verify existence
    const collection = await db.collectionSessions.getById(id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Validate inputs if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 });
      }
      if (body.name.length > 255) {
        return NextResponse.json({ error: 'Name must be 255 characters or less' }, { status: 400 });
      }
    }

    if (body.status !== undefined) {
      const validStatuses = ['draft', 'generating', 'completed'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Status must be one of: draft, generating, completed' },
          { status: 400 }
        );
      }
    }

    if (body.productIds !== undefined) {
      if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
        return NextResponse.json(
          { error: 'productIds must be a non-empty array' },
          { status: 400 }
        );
      }
      if (!body.productIds.every((id: unknown) => typeof id === 'string')) {
        return NextResponse.json({ error: 'All productIds must be strings' }, { status: 400 });
      }
    }

    // Build update data with only provided fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.productIds !== undefined) {
      updateData.productIds = body.productIds;
    }
    if (body.inspirationImages !== undefined) {
      updateData.selectedBaseImages = body.inspirationImages;
    }
    if (body.settings !== undefined) {
      updateData.settings = body.settings;
    }

    // Update collection
    const updated = await db.collectionSessions.update(id, updateData);

    // Map to frontend format
    const response = {
      id: updated.id,
      name: updated.name,
      status: updated.status,
      productCount: updated.productIds.length,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      promptTags: body.promptTags ?? {},
      inspirationImages: Object.values(updated.selectedBaseImages),
      settings: updated.settings,
    };

    console.log('✅ Updated collection:', id);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('❌ Failed to update collection:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const assetPolicy = body?.assetPolicy;
    const validPolicies = ['delete_all', 'keep_pinned_approved'] as const;

    if (assetPolicy !== undefined && !validPolicies.includes(assetPolicy)) {
      return NextResponse.json(
        { error: 'assetPolicy must be one of: delete_all, keep_pinned_approved' },
        { status: 400 }
      );
    }

    const effectivePolicy = (assetPolicy ?? 'keep_pinned_approved') as (typeof validPolicies)[number];

    // Fetch collection first to verify existence
    const collection = await db.collectionSessions.getById(id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const flows = await db.generationFlows.listByCollectionSession(id);
    const flowIds = flows.map((flow) => flow.id);

    if (flowIds.length > 0) {
      const assets = await db.generatedAssets.listByGenerationFlowIds(flowIds);
      const activeAssets = assets.filter((asset) => !asset.deletedAt);

      if (effectivePolicy === 'delete_all') {
        for (const asset of activeAssets) {
          if (!asset.assetUrl) continue;
          try {
            const url = new URL(asset.assetUrl);
            const key = url.pathname.replace(/^\//, '');
            await storage.delete(key);
          } catch (storageError) {
            console.warn(`⚠️ Failed to delete from storage:`, storageError);
          }
        }
        await db.generatedAssets.deleteByGenerationFlowIds(flowIds);
      } else {
        const assetsToDelete = activeAssets.filter(
          (asset) => !asset.pinned && asset.approvalStatus !== 'approved'
        );

        for (const asset of assetsToDelete) {
          await db.generatedAssets.hardDelete(asset.id);
          if (!asset.assetUrl) continue;
          try {
            const url = new URL(asset.assetUrl);
            const key = url.pathname.replace(/^\//, '');
            await storage.delete(key);
          } catch (storageError) {
            console.warn(`⚠️ Failed to delete from storage:`, storageError);
          }
        }
      }
    }

    // Delete collection
    await db.collectionSessions.delete(id);

    console.log('✅ Deleted collection:', id);
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error('❌ Failed to delete collection:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
