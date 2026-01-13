/**
 * API Route: Update provider credentials
 * Uses erp-service to securely store credentials in Neon
 */

import { NextRequest, NextResponse } from 'next/server';
import { createERPService } from '@scenergy/erp-service';
import { getClient, updateClientRecord } from '@/lib/services/db/storage-service';
import { getDb } from 'visualizer-db';

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

    const erpService = createERPService(getDb());

    // Save credentials to vault using clientId
    const result = await erpService.saveCredentials(clientId, provider, {
      baseUrl: credentials.baseUrl,
      consumerKey: credentials.consumerKey,
      consumerSecret: credentials.consumerSecret,
    });

    if (result.error) {
      console.error('Failed to save credentials:', result.error);
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 }
      );
    }

    // Also update the client metadata with commerce info (without secrets)
    if (provider === 'woocommerce') {
      await updateClientRecord(clientId, {
        commerce: {
          provider,
          baseUrl: credentials.baseUrl,
        },
      });
    }

    console.log('✅ Provider credentials updated successfully');

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

    const erpService = createERPService(getDb());
    const hasCredentials = await erpService.hasCredentials(clientId);

    if (hasCredentials.error) {
      return NextResponse.json(
        { success: false, error: hasCredentials.error.message },
        { status: 500 }
      );
    }

    const providerType = await erpService.getProviderType(clientId);

    // Only fetch client if we need the baseUrl (when credentials exist)
    let baseUrl: string | undefined;
    if (hasCredentials.data) {
      const client = await getClient(clientId);
      baseUrl = client?.commerce?.baseUrl;
    }

    return NextResponse.json({
      success: true,
      hasCredentials: hasCredentials.data,
      provider: providerType.data,
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
