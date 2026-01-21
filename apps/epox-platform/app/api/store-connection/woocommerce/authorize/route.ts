/**
 * WooCommerce Authorization API
 * POST /api/store-connection/woocommerce/authorize
 */

import { type NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { getStoreService } from '@/lib/services/erp';

const APP_NAME = process.env.WOOCOMMERCE_APP_NAME ?? 'Epox Platform';

export const POST = withSecurity(async (request, context) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { storeUrl, returnUrl } = (await request.json()) as {
      storeUrl?: string;
      returnUrl?: string;
    };
    if (!storeUrl) {
      return NextResponse.json({ error: 'Store URL is required' }, { status: 400 });
    }

    const baseUrl = getBaseUrl(request);
    const result = getStoreService().initAuth('woocommerce', {
      clientId,
      storeUrl,
      appName: APP_NAME,
      callbackUrl: `${baseUrl}/api/store-connection/woocommerce/callback`,
      returnUrl: returnUrl ?? `${baseUrl}/settings/store`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('WooCommerce authorize error:', error);
    return NextResponse.json({ error: 'Failed to initialize authentication' }, { status: 500 });
  }
});

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  return host ? `${protocol}://${host}` : 'http://localhost:3000';
}
