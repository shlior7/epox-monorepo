/**
 * API Route: Test provider connection
 * Tests if the provided credentials are valid by attempting to connect
 */

import { NextRequest, NextResponse } from 'next/server';
import { providers, type ProviderType, type ProviderCredentials } from '@scenergy/erp-service';

interface TestConnectionRequest {
  provider: 'woocommerce' | 'shopify' | 'wix';
  credentials: {
    baseUrl: string;
    consumerKey: string;
    consumerSecret: string;
  };
}

export async function POST(request: Request) {
  try {
    const body: TestConnectionRequest = await request.json();
    const { provider, credentials } = body;

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

    console.log('🔌 Testing connection to', provider, 'at', credentials.baseUrl);

    // Get the provider implementation and test connection directly
    const providerImpl = providers.require(provider as ProviderType);
    const connected = await providerImpl.testConnection(credentials as ProviderCredentials);

    if (connected) {
      console.log('✅ Connection test successful');
      return NextResponse.json({ success: true });
    } else {
      console.log('❌ Connection test failed');
      return NextResponse.json(
        { success: false, error: 'Connection failed. Please check your credentials.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection test failed' },
      { status: 500 }
    );
  }
}
