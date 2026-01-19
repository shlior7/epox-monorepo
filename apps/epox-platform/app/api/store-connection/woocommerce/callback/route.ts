/**
 * WooCommerce Callback API
 * POST /api/store-connection/woocommerce/callback
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getStoreService } from '@/lib/services/erp';
import type { WooCommerceCallbackPayload } from '@scenergy/erp-service';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as WooCommerceCallbackPayload;
    const stateId = String(payload.user_id);

    const result = await getStoreService().handleCallback(stateId, payload);

    if (!result.success) {
      console.error('WooCommerce callback failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WooCommerce callback error:', error);
    return NextResponse.json({ error: 'Failed to process callback' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const success = request.nextUrl.searchParams.get('success');
  return NextResponse.redirect(
    new URL(`/settings/store?connected=${success === 'true'}`, request.url)
  );
}
