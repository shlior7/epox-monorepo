import { NextResponse } from 'next/server';
import { hashPassword } from 'better-auth/crypto';
import { requireAdmin } from '@/lib/auth/admin-route';
import { db } from 'visualizer-db';
import { getClient } from '@/lib/services/db/storage-service';

const DEFAULT_DOMAIN = 'clients.scenergy.local';
const CREDENTIAL_PROVIDER_ID = 'credential';

const buildDefaultEmail = (clientId: string) => `${clientId}@${DEFAULT_DOMAIN}`;

type ClientUserRecord = {
  userId: string;
  email: string;
  name: string;
};

async function findClientUser(clientId: string): Promise<ClientUserRecord | null> {
  const memberships = await db.members.listByClient(clientId);
  const memberRecord = memberships.find((item) => item.role === 'client') ?? memberships[0];
  if (!memberRecord) {
    return null;
  }

  const userRecord = await db.users.getById(memberRecord.userId);
  if (!userRecord) {
    return null;
  }

  return {
    userId: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
  };
}

async function createClientUser(clientId: string, email: string, name: string): Promise<ClientUserRecord> {
  const createdUser = await db.users.create({
    email,
    name,
    emailVerified: false,
  });

  await db.members.create(clientId, createdUser.id, 'client');

  return {
    userId: createdUser.id,
    email: createdUser.email,
    name: createdUser.name,
  };
}

async function upsertCredentialAccount(userId: string, password: string): Promise<void> {
  const hashedPassword = await hashPassword(password);
  await db.accounts.upsertPasswordForProvider(userId, CREDENTIAL_PROVIDER_ID, hashedPassword);
}

export const GET = requireAdmin(async (_request: Request, { params }) => {
  try {
    const { clientId } = await params;
    const clientUser = await findClientUser(clientId);

    if (!clientUser) {
      return NextResponse.json({ error: 'Client user not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: clientUser.userId,
        email: clientUser.email,
        name: clientUser.name,
      },
    });
  } catch (error: any) {
    console.error('❌ Failed to load client user:', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to load client user' }, { status: 500 });
  }
});

export const PUT = requireAdmin(async (request: Request, { params }) => {
  try {
    const { clientId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      generatePassword?: boolean;
    };

    const emailInput = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const passwordInput = typeof body.password === 'string' ? body.password.trim() : '';
    const shouldGenerate = body.generatePassword === true;

    if (!emailInput && !passwordInput && !shouldGenerate) {
      return NextResponse.json({ error: 'Email or password is required' }, { status: 400 });
    }

    let clientUser = await findClientUser(clientId);
    const desiredEmail = emailInput || clientUser?.email || buildDefaultEmail(clientId);

    if (!clientUser) {
      const client = await getClient(clientId);
      const name = client?.name ?? `Client ${clientId}`;
      clientUser = await createClientUser(clientId, desiredEmail, name);
    } else if (emailInput && clientUser.email !== desiredEmail) {
      await db.users.update(clientUser.userId, { email: desiredEmail });
      clientUser = {
        ...clientUser,
        email: desiredEmail,
      };
    }

    let generatedPassword: string | null = null;
    if (passwordInput || shouldGenerate) {
      generatedPassword = passwordInput || crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await upsertCredentialAccount(clientUser.userId, generatedPassword);
    }

    return NextResponse.json({
      user: {
        id: clientUser.userId,
        email: clientUser.email,
        name: clientUser.name,
      },
      ...(shouldGenerate ? { generatedPassword } : {}),
    });
  } catch (error: any) {
    console.error('❌ Failed to update client user:', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to update client user' }, { status: 500 });
  }
});
