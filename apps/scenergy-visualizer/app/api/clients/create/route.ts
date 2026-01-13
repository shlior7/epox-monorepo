import { NextResponse } from 'next/server';
import { auth } from 'visualizer-auth';
import { randomBytes } from 'crypto';
import { db, getDb } from 'visualizer-db';
import { createClientRecord, updateClientRecord } from '@/lib/services/db/storage-service';
import type { Client, CreateClientPayload } from '@/lib/types/app-types';
import { requireAdmin } from '@/lib/auth/admin-route';

const CLIENT_EMAIL_DOMAIN = 'clients.scenergy.local';

const normalizeClientId = (value: string): string => value.trim().toLowerCase();
const isValidClientId = (value: string): boolean => /^[a-z0-9-]+$/.test(value);
const buildClientLoginEmail = (clientId: string): string => `${clientId}@${CLIENT_EMAIL_DOMAIN}`;
const generateClientPassword = (): string => randomBytes(12).toString('base64url');

/**
 * API route to create a new client in S3
 * This keeps AWS credentials server-side only
 * Commerce credentials are stored securely in Neon via erp-service
 */
export const POST = requireAdmin(async (request: Request) => {
  try {
    const rawBody = (await request.json()) as Client | { client?: Client; commerce?: CreateClientPayload['commerce'] };
    const clientCandidate = 'client' in rawBody ? rawBody.client : rawBody;
    const commerce = 'commerce' in rawBody ? rawBody.commerce : undefined;

    const isClient = (value: unknown): value is Client =>
      Boolean(value) &&
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof (value as Client).id === 'string' &&
      'name' in value &&
      typeof (value as Client).name === 'string';

    if (!isClient(clientCandidate)) {
      return NextResponse.json({ error: 'Client id and name are required' }, { status: 400 });
    }

    const normalizedClientId = normalizeClientId(clientCandidate.id);
    if (!normalizedClientId || !isValidClientId(normalizedClientId)) {
      return NextResponse.json(
        { error: 'Client ID must be lowercase letters, numbers, and dashes only' },
        { status: 400 }
      );
    }

    const client: Client = {
      ...clientCandidate,
      id: normalizedClientId,
    };

    const isCommerceWithCredentials = (
      value: CreateClientPayload['commerce'] | Client['commerce'] | undefined
    ): value is NonNullable<CreateClientPayload['commerce']> =>
      Boolean(value) && typeof value === 'object' && value !== null && 'credentials' in value;

    const commerceCredentials =
      commerce?.provider === 'woocommerce' && isCommerceWithCredentials(commerce) ? commerce.credentials : undefined;
    if (commerce?.provider === 'woocommerce') {
      if (!commerce.baseUrl || !commerceCredentials?.consumerKey || !commerceCredentials.consumerSecret) {
        return NextResponse.json(
          { error: 'WooCommerce baseUrl, consumerKey, and consumerSecret are required' },
          { status: 400 }
        );
      }
    }

    await createClientRecord({
      id: client.id,
      name: client.name,
      description: client.description,
      commerce:
        commerce?.provider === 'woocommerce'
          ? {
              provider: commerce.provider,
              baseUrl: commerce.baseUrl,
            }
          : undefined,
    });

    const loginEmail = buildClientLoginEmail(client.id);
    const existingUser = await db.users.getByEmail(loginEmail);
    if (existingUser) {
      return NextResponse.json({ error: 'Client user already exists for this ID' }, { status: 409 });
    }

    const generatedPassword = generateClientPassword();
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: loginEmail,
        name: client.name,
        password: generatedPassword,
        rememberMe: false,
      },
    });

    if (!signUpResult?.user?.id) {
      return NextResponse.json({ error: 'Failed to create client user' }, { status: 500 });
    }

    const existingMembership = await db.members.getByClientAndUser(client.id, signUpResult.user.id);
    if (!existingMembership) {
      await db.members.create(client.id, signUpResult.user.id, 'client');
    }

    console.log('🔧 API /api/clients - Creating client:', client.name);
    let updatedClient = client;

    if (commerce?.provider === 'woocommerce') {
      // Use ERP service to store credentials securely in Neon
      const { createERPService } = await import('@scenergy/erp-service');
      const erpService = createERPService(getDb());

      // Save credentials to vault using clientId
      const saveResult = await erpService.saveCredentials(client.id, 'woocommerce', {
        baseUrl: commerce.baseUrl,
        consumerKey: commerceCredentials!.consumerKey,
        consumerSecret: commerceCredentials!.consumerSecret,
      });

      if (saveResult.error) {
        throw saveResult.error;
      }

      console.log('✅ Stored WooCommerce credentials in Neon for client:', client.name);

      // Also store in Supabase Clients table for quick lookup
      const { db } = await import('@scenergy/supabase-service');

      const { columns, error: schemaError } = await db.tables.getTableSchema('Clients');
      if (schemaError) {
        throw schemaError;
      }

      const columnNames = new Set(columns.map((column) => column.name));
      const now = new Date().toISOString();
      const baseValues: Record<string, unknown> = {
        id: client.id,
        clientId: client.id,
        name: client.name,
        description: client.description ?? null,
        baseUrl: commerce.baseUrl,
        url: commerce.baseUrl,
        storeUrl: commerce.baseUrl,
        provider: commerce.provider,
        commerceProvider: commerce.provider,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const record: Record<string, unknown> = {};
      const fallbackForType = (type: string) => {
        if (type.includes('json')) return {};
        if (type.includes('bool')) return true;
        if (type.includes('timestamp')) return now;
        if (type.includes('uuid')) return client.id;
        if (type.includes('int') || type.includes('numeric') || type.includes('float') || type.includes('double')) return 0;
        return '';
      };

      for (const column of columns) {
        if (column.name in baseValues) {
          record[column.name] = baseValues[column.name];
          continue;
        }

        if (!column.nullable && column.defaultValue == null) {
          record[column.name] = fallbackForType(column.type);
        }
      }

      const conflictKey = columnNames.has('id') ? 'id' : columnNames.has('clientId') ? 'clientId' : undefined;
      const { error: upsertError } = await db.tables.upsertRecord('Clients', record, conflictKey);
      if (upsertError) {
        throw upsertError;
      }

      updatedClient = {
        ...client,
        commerce: {
          provider: commerce.provider,
          baseUrl: commerce.baseUrl,
        },
      };

      await updateClientRecord(client.id, {
        commerce: updatedClient.commerce,
      });
    }

    return NextResponse.json({
      success: true,
      client: updatedClient,
      clientUserCredentials: {
        email: loginEmail,
        password: generatedPassword,
      },
    });
  } catch (error: any) {
    console.error('❌ Failed to create client:', error);
    return NextResponse.json({ error: error.message || 'Failed to create client' }, { status: 500 });
  }
});
