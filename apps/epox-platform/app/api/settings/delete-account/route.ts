/**
 * Delete Account API
 * Permanently delete user account and all related data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/services/auth';
import { getDb } from 'visualizer-db';
import {
  user,
  account,
  session,
  member,
  client,
  product,
  productImage,
  collectionSession,
  generationFlow,
  generatedAsset,
  generationJob,
  chatSession,
  message,
  favoriteImage,
  invitation,
  userSettings,
} from 'visualizer-db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(request: NextRequest) {
  try {
    const authSession = await auth.api.getSession({ headers: request.headers });

    if (!authSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const drizzle = getDb();
    const userId = authSession.user.id;

    console.log(`🗑️  Deleting account for user: ${userId}`);

    // Verify password before deletion
    const { compare } = await import('bcrypt');
    const accounts = await drizzle.select().from(account).where(eq(account.userId, userId));
    const credentialAccount = accounts.find((acc) => acc.providerId === 'credential');

    if (!credentialAccount || !credentialAccount.password) {
      return NextResponse.json({ error: 'Password authentication not available' }, { status: 400 });
    }

    const isPasswordValid = await compare(password, credentialAccount.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Find all clients this user owns
    const members = await drizzle.select().from(member).where(eq(member.userId, userId));

    const ownedClients = await Promise.all(
      members
        .filter((m) => m.role === 'owner')
        .map(async (m) => {
          const clients = await drizzle.select().from(client).where(eq(client.id, m.clientId));
          return clients[0];
        })
    );

    // Delete all data for owned clients
    for (const ownedClient of ownedClients) {
      if (!ownedClient) continue;

      const clientId = ownedClient.id;
      console.log(`   Deleting data for owned client: ${clientId}`);

      // Delete generation-related data
      await drizzle.delete(generatedAsset).where(eq(generatedAsset.clientId, clientId));
      await drizzle.delete(generationJob).where(eq(generationJob.clientId, clientId));
      await drizzle.delete(generationFlow).where(eq(generationFlow.clientId, clientId));

      // Delete collection data
      await drizzle.delete(collectionSession).where(eq(collectionSession.clientId, clientId));

      // Delete chat data
      const chatSessions = await drizzle
        .select()
        .from(chatSession)
        .where(eq(chatSession.clientId, clientId));
      for (const chat of chatSessions) {
        await drizzle.delete(message).where(eq(message.chatSessionId, chat.id));
      }
      await drizzle.delete(chatSession).where(eq(chatSession.clientId, clientId));

      // Delete product data
      const products = await drizzle.select().from(product).where(eq(product.clientId, clientId));
      for (const prod of products) {
        await drizzle.delete(productImage).where(eq(productImage.productId, prod.id));
        await drizzle.delete(favoriteImage).where(eq(favoriteImage.productId, prod.id));
      }
      await drizzle.delete(product).where(eq(product.clientId, clientId));

      // Delete invitations
      await drizzle.delete(invitation).where(eq(invitation.clientId, clientId));

      // Delete all members
      await drizzle.delete(member).where(eq(member.clientId, clientId));

      // Delete the client itself
      await drizzle.delete(client).where(eq(client.id, clientId));

      console.log(`   ✅ Deleted owned client: ${clientId}`);
    }

    // Remove user from any clients they don't own
    await drizzle.delete(member).where(eq(member.userId, userId));

    // Delete user-related data
    console.log(`   Deleting user data for: ${userId}`);

    await drizzle.delete(userSettings).where(eq(userSettings.userId, userId));
    await drizzle.delete(session).where(eq(session.userId, userId));
    await drizzle.delete(account).where(eq(account.userId, userId));
    await drizzle.delete(user).where(eq(user.id, userId));

    console.log(`   ✅ Account deleted: ${userId}`);

    // Sign out the user
    await auth.api.signOut({ headers: request.headers });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
