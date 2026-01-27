/**
 * Store Webhook Receiver
 * Receives webhooks from WooCommerce/Shopify stores for bidirectional sync.
 *
 * Security: Verifies webhook signature using HMAC (no auth required).
 * Rate: Enqueues jobs for async processing rather than blocking.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import type { WebhookEvent } from 'visualizer-db/repositories';
import { providers } from '@scenergy/erp-service';

// Force dynamic for webhook processing
export const dynamic = 'force-dynamic';

// Webhook signature headers by provider
const SIGNATURE_HEADERS: Record<string, string> = {
  woocommerce: 'x-wc-webhook-signature',
  shopify: 'x-shopify-hmac-sha256',
};

// Webhook topic headers by provider
const TOPIC_HEADERS: Record<string, string> = {
  woocommerce: 'x-wc-webhook-topic',
  shopify: 'x-shopify-topic',
};

// Map provider topics to our event types
function parseWebhookEvent(providerType: string, topic: string): WebhookEvent | null {
  const topicMap: Record<string, Record<string, WebhookEvent>> = {
    woocommerce: {
      'product.created': 'product.created',
      'product.updated': 'product.updated',
      'product.deleted': 'product.deleted',
    },
    shopify: {
      'products/create': 'product.created',
      'products/update': 'product.updated',
      'products/delete': 'product.deleted',
    },
  };

  return topicMap[providerType]?.[topic] ?? null;
}

export async function POST(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await params;

  try {
    // 1. Look up the connection
    const connection = await db.storeConnections.getById(connectionId);

    if (!connection) {
      console.warn(`[Webhook] Connection not found: ${connectionId}`);
      return new NextResponse('Not found', { status: 404 });
    }

    if (!connection.webhookSecret) {
      console.warn(`[Webhook] No webhook secret configured for connection: ${connectionId}`);
      return new NextResponse('Webhook not configured', { status: 400 });
    }

    // 2. Get the provider
    const providerType = connection.storeType;
    const provider = providers.get(providerType);

    if (!provider) {
      console.error(`[Webhook] Unknown provider type: ${providerType}`);
      return new NextResponse('Unknown provider', { status: 400 });
    }

    // 3. Read raw body and verify signature
    const payload = await request.text();
    const signatureHeader = SIGNATURE_HEADERS[providerType];
    const signature = request.headers.get(signatureHeader);

    if (!signature) {
      console.warn(`[Webhook] Missing signature header: ${signatureHeader}`);
      return new NextResponse('Missing signature', { status: 401 });
    }

    if (!provider.verifyWebhookSignature(payload, signature, connection.webhookSecret)) {
      console.warn(`[Webhook] Invalid signature for connection: ${connectionId}`);
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // 4. Parse the event type from headers
    const topicHeader = TOPIC_HEADERS[providerType];
    const topic = request.headers.get(topicHeader) ?? '';
    const eventType = parseWebhookEvent(providerType, topic);

    if (!eventType) {
      // Unknown event type - acknowledge but don't process
      console.info(`[Webhook] Unknown topic '${topic}' for provider ${providerType}`);
      return new NextResponse('OK', { status: 200 });
    }

    // 5. Parse the payload to get product ID
    const webhookPayload = provider.parseWebhookPayload(JSON.parse(payload));

    if (!webhookPayload.productId) {
      console.warn(`[Webhook] No product ID in payload`);
      return new NextResponse('OK', { status: 200 });
    }

    console.info(`[Webhook] Received ${eventType} for product ${webhookPayload.productId} from ${providerType}`);

    // 6. Enqueue sync job (only for created/updated events)
    if (eventType === 'product.created' || eventType === 'product.updated') {
      await db.generationJobs.create({
        clientId: connection.clientId,
        type: 'sync_product',
        payload: {
          connectionId: connection.id,
          externalProductId: webhookPayload.productId,
        },
        priority: 50, // Higher priority than regular generation jobs
      });

      console.info(`[Webhook] Enqueued sync_product job for product ${webhookPayload.productId}`);
    }

    // 7. Update lastWebhookAt
    await db.storeConnections.updateLastWebhookAt(connectionId);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    // Return 200 to prevent retries for malformed requests
    return new NextResponse('Error', { status: 500 });
  }
}

// Handle webhook verification requests (some providers send a test ping)
export async function GET(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await params;

  // Simple health check for webhook endpoint
  const connection = await db.storeConnections.getById(connectionId);

  if (!connection) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse('Webhook endpoint active', { status: 200 });
}
