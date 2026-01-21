/**
 * Shopify Callback API
 * GET /api/store-connection/shopify/callback
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getStoreService } from '@/lib/services/erp';
import type { ShopifyCallbackParams } from '@scenergy/erp-service';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const payload: ShopifyCallbackParams = {
      code: params.get('code') ?? '',
      hmac: params.get('hmac') ?? '',
      host: params.get('host') ?? '',
      shop: params.get('shop') ?? '',
      state: params.get('state') ?? '',
      timestamp: params.get('timestamp') ?? '',
    };

    if (!payload.state || !payload.code) {
      return NextResponse.redirect(new URL('/settings/store?error=invalid_callback', request.url));
    }

    const result = await getStoreService().handleCallback(payload.state, payload);

    if (!result.success) {
      console.error('Shopify callback failed:', result.error);
      return NextResponse.redirect(
        new URL(
          `/settings/store?error=${encodeURIComponent(result.error ?? 'unknown')}`,
          request.url
        )
      );
    }

    return NextResponse.redirect(
      new URL(result.returnUrl ?? '/settings/store?connected=true', request.url)
    );
  } catch (error) {
    console.error('Shopify callback error:', error);
    return NextResponse.redirect(new URL('/settings/store?error=callback_failed', request.url));
  }
}
