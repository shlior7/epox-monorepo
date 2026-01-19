/**
 * Shopify Authorization API
 * POST /api/store-connection/shopify/authorize
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getClientId } from '@/lib/services/get-auth';
import { getStoreService } from '@/lib/services/erp';

const APP_NAME = process.env.SHOPIFY_APP_NAME ?? 'Epox Platform';

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientId(request);
    if (!clientId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { storeUrl, returnUrl } = (await request.json()) as {
      storeUrl?: string;
      returnUrl?: string;
    };
    if (!storeUrl) {
      return NextResponse.json({ error: 'Store URL is required' }, { status: 400 });
    }

    const baseUrl = getBaseUrl(request);
    const result = getStoreService().initAuth('shopify', {
      clientId,
      storeUrl,
      appName: APP_NAME,
      callbackUrl: `${baseUrl}/api/store-connection/shopify/callback`,
      returnUrl: returnUrl ?? `${baseUrl}/settings/store`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Shopify authorize error:', error);
    return NextResponse.json({ error: 'Failed to initialize authentication' }, { status: 500 });
  }
}

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  return host ? `${protocol}://${host}` : 'http://localhost:3000';
}
