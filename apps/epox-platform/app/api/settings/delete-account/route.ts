/**
 * Delete Account API
 * Permanently delete user account and all related data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'visualizer-auth/server';
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
  generationFlowProduct,
  generatedAsset,
  generatedAssetProduct,
  generationJob,
  chatSession,
  message,
  favoriteImage,
  invitation,
  userSettings,
  generationEvent,
  storeConnection,
  usageRecord,
  quotaLimit,
  aiCostTracking,
  verification,
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
    const credentialAccount = accounts.find((acc: { providerId: string; password?: string | null }) => acc.providerId === 'credential');

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
        .filter((m: { role: string }) => m.role === 'owner')
        .map(async (m: { clientId: string }) => {
          const clients = await drizzle.select().from(client).where(eq(client.id, m.clientId));
          return clients[0];
        })
    );

    // Delete all data for owned clients
    for (const ownedClient of ownedClients) {
      if (!ownedClient) continue;

      const clientId = ownedClient.id;
      console.log(`   Deleting data for owned client: ${clientId}`);

      // Delete store sync data
      await drizzle.delete(storeConnection).where(eq(storeConnection.clientId, clientId));

      // Delete generated assets and related data
      const generatedAssets = await drizzle
        .select()
        .from(generatedAsset)
        .where(eq(generatedAsset.clientId, clientId));

      for (const asset of generatedAssets) {
        await drizzle
          .delete(generatedAssetProduct)
          .where(eq(generatedAssetProduct.generatedAssetId, asset.id));
        await drizzle.delete(favoriteImage).where(eq(favoriteImage.generatedAssetId, asset.id));
      }
      await drizzle.delete(generatedAsset).where(eq(generatedAsset.clientId, clientId));

      // Delete generation jobs
      await drizzle.delete(generationJob).where(eq(generationJob.clientId, clientId));

      // Delete generation flows and related data
      const genFlows = await drizzle
        .select()
        .from(generationFlow)
        .where(eq(generationFlow.clientId, clientId));

      for (const flow of genFlows) {
        await drizzle
          .delete(generationFlowProduct)
          .where(eq(generationFlowProduct.generationFlowId, flow.id));
      }
      await drizzle.delete(generationFlow).where(eq(generationFlow.clientId, clientId));

      // Delete collection data and messages
      const collectionSessions = await drizzle
        .select()
        .from(collectionSession)
        .where(eq(collectionSession.clientId, clientId));
      for (const colSession of collectionSessions) {
        await drizzle.delete(message).where(eq(message.collectionSessionId, colSession.id));
      }
      await drizzle.delete(collectionSession).where(eq(collectionSession.clientId, clientId));

      // Delete product data and chat sessions
      const products = await drizzle.select().from(product).where(eq(product.clientId, clientId));
      for (const prod of products) {
        await drizzle.delete(productImage).where(eq(productImage.productId, prod.id));

        // Delete chat sessions for this product and their messages
        const prodChatSessions = await drizzle
          .select()
          .from(chatSession)
          .where(eq(chatSession.productId, prod.id));
        for (const chat of prodChatSessions) {
          await drizzle.delete(message).where(eq(message.chatSessionId, chat.id));
        }
        await drizzle.delete(chatSession).where(eq(chatSession.productId, prod.id));
      }
      await drizzle.delete(product).where(eq(product.clientId, clientId));

      // Delete analytics
      await drizzle.delete(generationEvent).where(eq(generationEvent.clientId, clientId));

      // Delete usage and quota data
      await drizzle.delete(usageRecord).where(eq(usageRecord.clientId, clientId));
      await drizzle.delete(quotaLimit).where(eq(quotaLimit.clientId, clientId));
      await drizzle.delete(aiCostTracking).where(eq(aiCostTracking.clientId, clientId));

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

    const userEmail = authSession.user.email;
    await drizzle.delete(userSettings).where(eq(userSettings.userId, userId));
    await drizzle.delete(verification).where(eq(verification.identifier, userEmail));
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
