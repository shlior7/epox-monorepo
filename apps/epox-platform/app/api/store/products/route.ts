/**
 * Store Products API
 * GET - Fetch products from connected store
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { getStoreService } from '@/lib/services/erp';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

export const GET = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters with defaults
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100); // Max 100 per page

    // Validate pagination
    if (page < 1 || limit < 1) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    // Fetch products from connected store
    const storeService = getStoreService();
    const result = await storeService.getProducts(clientId, {
      search,
      category,
      page,
      limit,
    });

    return NextResponse.json({
      items: result.items,
      total: result.total,
      page: result.page,
      hasMore: result.hasMore,
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch store products:', error);

    if (error.message === 'No store connected') {
      return NextResponse.json({ error: 'No store connection found' }, { status: 404 });
    }

    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
