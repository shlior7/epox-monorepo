/**
 * Delete Test Client API
 *
 * DANGEROUS: Deletes a client and all related records.
 * Only for development/testing purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
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
  storeSyncLog,
  usageRecord,
  quotaLimit,
  aiCostTracking,
  verification,
} from 'visualizer-db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const drizzle = getDb();

    console.log(`🗑️  Deleting test client for email: ${email}`);

    // 1. Find the user
    const users = await drizzle.select().from(user).where(eq(user.email, email));

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = users[0].id;
    console.log(`   Found user: ${userId}`);

    // 2. Find all clients this user is a member of
    const members = await drizzle.select().from(member).where(eq(member.userId, userId));

    const clientIds = members.map((m) => m.clientId);
    console.log(`   Found ${clientIds.length} client(s)`);

    // 3. Delete all data for each client
    for (const clientId of clientIds) {
      console.log(`   Deleting data for client: ${clientId}`);

      // Delete store sync data (cascade will handle storeSyncLog)
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

      // Delete collection sessions and messages
      const collectionSessions = await drizzle
        .select()
        .from(collectionSession)
        .where(eq(collectionSession.clientId, clientId));
      for (const colSession of collectionSessions) {
        await drizzle.delete(message).where(eq(message.collectionSessionId, colSession.id));
      }
      await drizzle.delete(collectionSession).where(eq(collectionSession.clientId, clientId));

      // Delete products and related data
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

      // Delete members
      await drizzle.delete(member).where(eq(member.clientId, clientId));

      // Delete the client itself
      await drizzle.delete(client).where(eq(client.id, clientId));

      console.log(`   ✅ Deleted all data for client: ${clientId}`);
    }

    // 4. Delete user-related data
    console.log(`   Deleting user data for: ${userId}`);

    await drizzle.delete(userSettings).where(eq(userSettings.userId, userId));
    await drizzle.delete(verification).where(eq(verification.identifier, email));
    await drizzle.delete(session).where(eq(session.userId, userId));
    await drizzle.delete(account).where(eq(account.userId, userId));
    await drizzle.delete(user).where(eq(user.id, userId));

    console.log(`   ✅ Deleted user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Deleted user ${email} and all related data`,
      deletedClientIds: clientIds,
    });
  } catch (error) {
    console.error('Failed to delete test client:', error);

    // In development, return detailed error message
    const errorMessage =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? `Failed to delete test client: ${error.message}`
        : 'Failed to delete test client';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
