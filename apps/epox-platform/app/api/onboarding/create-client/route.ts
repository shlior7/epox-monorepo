/**
 * Client Onboarding Route
 *
 * Creates a new client (organization/workspace) for a user after signup.
 * This should be called immediately after successful user registration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { auth } from '@/lib/services/auth';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientName } = await request.json();

    if (!clientName || typeof clientName !== 'string') {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    // Create client (organization/workspace)
    const baseName = (session.user?.name || session.user?.email || 'user').toLowerCase();
    const slug = `${baseName.replace(/\s+/g, '-')}-${Date.now()}`;
    const client = await db.clients.create({
      name: clientName,
      slug,
    });

    // Add user as owner (with compensating rollback if this fails)
    try {
      await db.members.create(client.id, session.user.id, 'owner');
    } catch (memberError) {
      // Rollback: delete the orphaned client
      await db.clients.delete(client.id);
      throw memberError;
    }

    return NextResponse.json({
      clientId: client.id,
      clientName: client.name,
      slug: client.slug,
    });
  } catch (error) {
    console.error('Failed to create client:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
