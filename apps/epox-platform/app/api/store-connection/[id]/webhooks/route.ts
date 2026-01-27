/**
 * Store Webhook Registration API
 * POST - Register webhooks with the store
 * DELETE - Remove webhooks from the store
 */

import { NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';
import { db } from '@/lib/services/db';
import { providers, decryptCredentials } from '@scenergy/erp-service';
import crypto from 'crypto';

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

// Base URL for webhook callbacks
function getWebhookCallbackUrl(connectionId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/webhooks/store/${connectionId}`;
}

interface RegisterWebhooksRequest {
  events?: Array<'product.created' | 'product.updated' | 'product.deleted'>;
}

/**
 * POST - Register webhooks with the connected store
 */
export const POST = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: connectionId } = await params;

  try {
    // 1. Verify connection exists and belongs to client
    const connection = await db.storeConnections.getById(connectionId);
    if (!connection || connection.clientId !== clientId) {
      return NextResponse.json({ error: 'Store connection not found' }, { status: 404 });
    }

    // 2. Check if webhooks are already registered
    if (connection.webhookId) {
      return NextResponse.json(
        {
          error: 'Webhooks already registered',
          webhookId: connection.webhookId,
          events: connection.webhookEvents,
        },
        { status: 409 }
      );
    }

    // 3. Parse request body
    const body = (await request.json().catch(() => ({}))) as RegisterWebhooksRequest;
    const events = body.events ?? ['product.created', 'product.updated', 'product.deleted'];

    // 4. Get decrypted credentials
    const encryptedCreds = db.storeConnections.getEncryptedCredentials(connection);
    const { credentials, provider: providerType } = decryptCredentials(encryptedCreds);
    const provider = providers.require(providerType);

    // 5. Generate a webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // 6. Register webhook with the store
    const callbackUrl = getWebhookCallbackUrl(connectionId);

    console.log(`[Webhook] Registering webhook for connection ${connectionId}`, {
      callbackUrl,
      events,
      provider: providerType,
    });

    const registration = await provider.registerWebhook(credentials, {
      callbackUrl,
      events,
      secret: webhookSecret,
    });

    // 7. Store webhook configuration
    await db.storeConnections.updateWebhookConfig(connectionId, {
      webhookSecret,
      webhookId: registration.webhookId,
      webhookEvents: registration.events,
    });

    console.log(`[Webhook] Successfully registered webhook for connection ${connectionId}`, {
      webhookId: registration.webhookId,
      events: registration.events,
    });

    return NextResponse.json({
      success: true,
      webhookId: registration.webhookId,
      events: registration.events,
      callbackUrl,
    });
  } catch (error: unknown) {
    console.error('[Webhook] Failed to register webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

/**
 * DELETE - Remove webhooks from the connected store
 */
export const DELETE = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: connectionId } = await params;

  try {
    // 1. Verify connection exists and belongs to client
    const connection = await db.storeConnections.getById(connectionId);
    if (!connection || connection.clientId !== clientId) {
      return NextResponse.json({ error: 'Store connection not found' }, { status: 404 });
    }

    // 2. Check if webhooks are registered
    if (!connection.webhookId) {
      return NextResponse.json({ error: 'No webhooks registered' }, { status: 404 });
    }

    // 3. Get decrypted credentials
    const encryptedCreds = db.storeConnections.getEncryptedCredentials(connection);
    const { credentials, provider: providerType } = decryptCredentials(encryptedCreds);
    const provider = providers.require(providerType);

    // 4. Delete webhook from store
    console.log(`[Webhook] Deleting webhook for connection ${connectionId}`, {
      webhookId: connection.webhookId,
    });

    await provider.deleteWebhook(credentials, connection.webhookId);

    // 5. Clear webhook configuration
    await db.storeConnections.clearWebhookConfig(connectionId);

    console.log(`[Webhook] Successfully deleted webhook for connection ${connectionId}`);

    return NextResponse.json({
      success: true,
      message: 'Webhooks removed successfully',
    });
  } catch (error: unknown) {
    console.error('[Webhook] Failed to delete webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

/**
 * GET - Get webhook status for a connection
 */
export const GET = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: connectionId } = await params;

  try {
    // 1. Verify connection exists and belongs to client
    const connection = await db.storeConnections.getById(connectionId);
    if (!connection || connection.clientId !== clientId) {
      return NextResponse.json({ error: 'Store connection not found' }, { status: 404 });
    }

    // 2. Return webhook status
    return NextResponse.json({
      registered: !!connection.webhookId,
      webhookId: connection.webhookId,
      events: connection.webhookEvents ?? [],
      lastWebhookAt: connection.lastWebhookAt,
      callbackUrl: connection.webhookId ? getWebhookCallbackUrl(connectionId) : null,
    });
  } catch (error: unknown) {
    console.error('[Webhook] Failed to get webhook status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
