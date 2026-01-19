/**
 * API Route: Check provider credentials
 * Uses erp-service to check credentials status in Neon
 * Note: Credential updates should go through the OAuth flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStoreService } from '@scenergy/erp-service';
import { getClient, updateClientRecord } from '@/lib/services/db/storage-service';
import { db } from 'visualizer-db';

interface UpdateCredentialsRequest {
  clientId: string;
  provider: 'woocommerce' | 'shopify' | 'wix';
  credentials: {
    baseUrl: string;
    consumerKey: string;
    consumerSecret: string;
  };
}

export async function PUT(request: Request) {
  try {
    const body: UpdateCredentialsRequest = await request.json();
    const { clientId, provider, credentials } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Missing clientId' }, { status: 400 });
    }

    if (!provider) {
      return NextResponse.json({ success: false, error: 'Missing provider' }, { status: 400 });
    }

    if (provider === 'woocommerce') {
      if (!credentials.baseUrl || !credentials.consumerKey || !credentials.consumerSecret) {
        return NextResponse.json(
          { success: false, error: 'Missing required WooCommerce credentials' },
          { status: 400 }
        );
      }
    }

    console.log('🔐 Updating provider credentials for client:', clientId);

    // Note: Direct credential saving is not supported via the new API.
    // Credentials should be saved through the OAuth callback flow.
    // For now, just update the client metadata
    if (provider === 'woocommerce') {
      await updateClientRecord(clientId, {
        commerce: {
          provider,
          baseUrl: credentials.baseUrl,
        },
      });
    }

    console.log('✅ Provider metadata updated successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to update provider credentials:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update credentials' },
      { status: 500 }
    );
  }
}

/**
 * GET: Check if provider credentials exist for a client
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Missing clientId' }, { status: 400 });
    }

    const storeService = createStoreService(db);
    const credentials = await storeService.getCredentials(clientId);
    const hasCredentials = credentials !== null;

    // Only fetch client if we need the baseUrl (when credentials exist)
    let baseUrl: string | undefined;
    if (hasCredentials) {
      const client = await getClient(clientId);
      baseUrl = client?.commerce?.baseUrl;
    }

    return NextResponse.json({
      success: true,
      hasCredentials,
      provider: credentials?.provider ?? null,
      baseUrl,
    });
  } catch (error) {
    console.error('❌ Failed to check provider credentials:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to check credentials' },
      { status: 500 }
    );
  }
}
