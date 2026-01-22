/**
 * Set Primary Image API Route
 * POST /api/products/:id/images/:imageId/primary
 */

import { db } from '@/lib/services/db';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security/middleware';
import { verifyOwnership, forbiddenResponse } from '@/lib/security/auth';


// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
export const POST = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: productId, imageId } = await params;

    // Fetch product first to verify existence and ownership
    const product = await db.products.getById(productId);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify ownership
    if (
      !verifyOwnership({
        clientId,
        resourceClientId: product.clientId,
        resourceType: 'product',
        resourceId: productId,
      })
    ) {
      return forbiddenResponse();
    }

    // Set the image as primary
    const updatedImage = await db.productImages.setPrimary(productId, imageId);

    console.log('✅ Set primary image:', imageId, 'for product:', productId);

    return NextResponse.json({
      success: true,
      image: {
        id: updatedImage.id,
        isPrimary: updatedImage.isPrimary,
        sortOrder: updatedImage.sortOrder,
      },
    });
  } catch (error: unknown) {
    console.error('❌ Failed to set primary image:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
