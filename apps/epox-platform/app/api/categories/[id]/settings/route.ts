/**
 * Category Settings API Route
 * PUT /api/categories/[id]/settings - Update category generation settings
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import type { CategoryGenerationSettings } from 'visualizer-types';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/categories/[id]/settings
 * Update category generation settings (default bubbles, scene-type settings, etc.)
 */
export const PUT = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existingCategory = await db.categories.getById(id);
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Verify ownership
    if (
      !verifyOwnership({ clientId, resourceClientId: existingCategory.clientId, resourceType: 'category', resourceId: id })
    ) {
      return forbiddenResponse();
    }

    const body: CategoryGenerationSettings = await request.json();

    // Validate the settings structure
    if (body.defaultBubbles && !Array.isArray(body.defaultBubbles)) {
      return NextResponse.json({ error: 'Default generation settings must be an array' }, { status: 400 });
    }

    if (body.sceneTypeSettings && typeof body.sceneTypeSettings !== 'object') {
      return NextResponse.json({ error: 'sceneTypeSettings must be an object' }, { status: 400 });
    }

    const category = await db.categories.updateSettings(id, body);

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Failed to update category settings:', error);
    return NextResponse.json({ error: 'Failed to update category settings' }, { status: 500 });
  }
});
