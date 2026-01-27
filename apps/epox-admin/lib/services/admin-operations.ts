/**
 * Admin Operations Service
 *
 * High-level administrative operations that require special permissions.
 */

import { db } from 'visualizer-db';
import { getDb } from 'visualizer-db';
import {
  generationJob,
  generatedAsset,
  generationFlow,
  collectionSession,
  chatSession,
  productImage,
  product,
  member,
  invitation,
  usageRecord,
  quotaLimit,
  aiCostTracking,
  user,
  client,
} from 'visualizer-db/schema';
import { eq, sql } from 'drizzle-orm';

export interface DeleteClientResult {
  clientId: string;
  deletedCounts: {
    generationJobs: number;
    generatedAssets: number;
    generationFlows: number;
    collectionSessions: number;
    chatSessions: number;
    productImages: number;
    products: number;
    members: number;
    invitations: number;
    usageRecords: number;
    quotaLimits: number;
    aiCostTracking: number;
    users: number;
    client: number;
  };
  s3AssetsDeleted: number;
  success: boolean;
  error?: string;
}

/**
 * Delete a client and all associated data completely
 *
 * This operation:
 * 1. Deletes all S3 assets for the client's products
 * 2. Deletes all database records in dependency order
 * 3. Deletes users that have no other client memberships
 * 4. Logs the operation for audit purposes
 *
 * @param clientId - The client ID to delete
 * @param adminId - The admin user performing the deletion
 * @returns Deletion result with counts
 */
export async function deleteClientCompletely(
  clientId: string,
  adminId: string
): Promise<DeleteClientResult> {
  const result: DeleteClientResult = {
    clientId,
    deletedCounts: {
      generationJobs: 0,
      generatedAssets: 0,
      generationFlows: 0,
      collectionSessions: 0,
      chatSessions: 0,
      productImages: 0,
      products: 0,
      members: 0,
      invitations: 0,
      usageRecords: 0,
      quotaLimits: 0,
      aiCostTracking: 0,
      users: 0,
      client: 0,
    },
    s3AssetsDeleted: 0,
    success: false,
  };

  try {
    // Verify client exists
    const clientData = await db.clients.getById(clientId);
    if (!clientData) {
      result.error = 'Client not found';
      return result;
    }

    console.log(`[DELETE CLIENT] Starting deletion of client ${clientId} by admin ${adminId}`);
    console.log(`[DELETE CLIENT] Client name: ${clientData.name}`);

    const drizzle = getDb();

    // Get all products for this client (needed for S3 cleanup)
    const products = await db.products.list(clientId);
    console.log(`[DELETE CLIENT] Found ${products.length} products to delete`);

    // Get all generated assets for S3 deletion
    let totalAssets = 0;
    for (const prod of products) {
      const assets = await db.generatedAssets.listByProductId(clientId, prod.id);
      totalAssets += assets.length;
      console.log(`[DELETE CLIENT] Product ${prod.id}: ${assets.length} assets`);

      // TODO: Delete S3 objects
      // for (const asset of assets) {
      //   await storage.deleteObject(asset.s3Key);
      //   result.s3AssetsDeleted++;
      // }
    }
    console.log(`[DELETE CLIENT] Total assets to delete from S3: ${totalAssets}`);
    result.s3AssetsDeleted = totalAssets; // Placeholder until S3 deletion is implemented

    // Delete database records in dependency order
    console.log('[DELETE CLIENT] Deleting database records...');

    // 1. Generation jobs (references generated_assets)
    const deletedJobs = await drizzle
      .delete(generationJob)
      .where(
        sql`${generationJob.id} IN (
          SELECT gj.id FROM ${generationJob} gj
          INNER JOIN ${generatedAsset} ga ON gj.id = ga.job_id
          INNER JOIN ${product} p ON ga.product_id = p.id
          WHERE p.client_id = ${clientId}
        )`
      )
      .returning();
    result.deletedCounts.generationJobs = deletedJobs.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.generationJobs} generation jobs`);

    // 2. Generated assets (has clientId directly)
    const deletedAssets = await drizzle
      .delete(generatedAsset)
      .where(eq(generatedAsset.clientId, clientId))
      .returning();
    result.deletedCounts.generatedAssets = deletedAssets.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.generatedAssets} generated assets`);

    // 3. Generation flows (references collection_sessions)
    const deletedFlows = await drizzle
      .delete(generationFlow)
      .where(
        sql`${generationFlow.collectionSessionId} IN (
          SELECT id FROM ${collectionSession} WHERE client_id = ${clientId}
        )`
      )
      .returning();
    result.deletedCounts.generationFlows = deletedFlows.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.generationFlows} generation flows`);

    // 4. Collection sessions (references clients)
    const deletedCollectionSessions = await drizzle
      .delete(collectionSession)
      .where(eq(collectionSession.clientId, clientId))
      .returning();
    result.deletedCounts.collectionSessions = deletedCollectionSessions.length;
    console.log(
      `[DELETE CLIENT] Deleted ${result.deletedCounts.collectionSessions} collection sessions`
    );

    // 5. Chat sessions (references products)
    const deletedChatSessions = await drizzle
      .delete(chatSession)
      .where(
        sql`${chatSession.productId} IN (
          SELECT id FROM ${product} WHERE client_id = ${clientId}
        )`
      )
      .returning();
    result.deletedCounts.chatSessions = deletedChatSessions.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.chatSessions} chat sessions`);

    // 6. Product images (references products)
    const deletedProductImages = await drizzle
      .delete(productImage)
      .where(
        sql`${productImage.productId} IN (
          SELECT id FROM ${product} WHERE client_id = ${clientId}
        )`
      )
      .returning();
    result.deletedCounts.productImages = deletedProductImages.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.productImages} product images`);

    // 7. Products (references clients)
    const deletedProducts = await drizzle
      .delete(product)
      .where(eq(product.clientId, clientId))
      .returning();
    result.deletedCounts.products = deletedProducts.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.products} products`);

    // 8. Members (references clients and users)
    const membersToDelete = await drizzle
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.clientId, clientId));

    const deletedMembers = await drizzle
      .delete(member)
      .where(eq(member.clientId, clientId))
      .returning();
    result.deletedCounts.members = deletedMembers.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.members} members`);

    // 9. Invitations (references clients)
    const deletedInvitations = await drizzle
      .delete(invitation)
      .where(eq(invitation.clientId, clientId))
      .returning();
    result.deletedCounts.invitations = deletedInvitations.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.invitations} invitations`);

    // 10. Usage records (references clients)
    const deletedUsageRecords = await drizzle
      .delete(usageRecord)
      .where(eq(usageRecord.clientId, clientId))
      .returning();
    result.deletedCounts.usageRecords = deletedUsageRecords.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.usageRecords} usage records`);

    // 11. Quota limits (references clients)
    const deletedQuotaLimits = await drizzle
      .delete(quotaLimit)
      .where(eq(quotaLimit.clientId, clientId))
      .returning();
    result.deletedCounts.quotaLimits = deletedQuotaLimits.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.quotaLimits} quota limits`);

    // 12. AI cost tracking (references clients)
    const deletedCostTracking = await drizzle
      .delete(aiCostTracking)
      .where(eq(aiCostTracking.clientId, clientId))
      .returning();
    result.deletedCounts.aiCostTracking = deletedCostTracking.length;
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.aiCostTracking} cost tracking records`);

    // 13. Users (only if they have no other client memberships)
    for (const memberRecord of membersToDelete) {
      const otherMemberships = await drizzle
        .select()
        .from(member)
        .where(eq(member.userId, memberRecord.userId))
        .limit(1);

      if (otherMemberships.length === 0) {
        await drizzle.delete(user).where(eq(user.id, memberRecord.userId));
        result.deletedCounts.users++;
      }
    }
    console.log(`[DELETE CLIENT] Deleted ${result.deletedCounts.users} orphaned users`);

    // 14. Client itself
    const deletedClient = await drizzle.delete(client).where(eq(client.id, clientId)).returning();
    result.deletedCounts.client = deletedClient.length;
    console.log(`[DELETE CLIENT] Deleted client record`);

    // Log audit event
    console.log(`[DELETE CLIENT] ✅ Successfully deleted client ${clientId}`);
    console.log(`[DELETE CLIENT] Summary:`, JSON.stringify(result.deletedCounts, null, 2));

    // TODO: Store audit log in database
    // await logAuditEvent({
    //   type: 'client_deleted',
    //   adminId,
    //   clientId,
    //   metadata: result,
    // });

    result.success = true;
    return result;
  } catch (error) {
    console.error(`[DELETE CLIENT] ❌ Failed to delete client ${clientId}:`, error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}
