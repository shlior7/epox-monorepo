/**
 * Collection Detail API Route
 * Production-ready with SQL queries and proper data handling
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch collection from database
    const collection = await db.collectionSessions.getById(id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // For now, return product count as total images (each product gets 1 image by default)
    // Generated count will be updated when we actually generate assets
    const totalImages = collection.productIds.length;
    const generatedCount = 0; // Will be populated when generation is implemented

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
        imageQuality: settings?.imageQuality ?? '2K',
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch collection first to verify existence
    const collection = await db.collectionSessions.getById(id);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
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
