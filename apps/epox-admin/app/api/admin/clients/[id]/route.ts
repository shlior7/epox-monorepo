import { NextRequest, NextResponse } from 'next/server';
import { withAdminReadSecurity, withAdminDangerousSecurity } from '@/lib/security/admin-middleware';
import { db } from 'visualizer-db';

/**
 * Client Detail API
 *
 * GET: Get full client details
 * DELETE: Delete client completely
 */
export const GET = withAdminReadSecurity(
  async (_request, _context, routeContext) => {
    try {
      const { id } = await routeContext.params as { id: string };

      const client = await db.clients.getById(id);
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      // Get related data in parallel
      const [members, allProducts, quota, usage] = await Promise.all([
        // Members
        db.members.listByClient(id),

        // Products
        db.products.list(id),

        // Quota
        db.quotaLimits.getByClientId(id),

        // Current month usage
        db.usageRecords.getByClientAndMonth(id),
      ]);

      // Take first 10 products
      const products = allProducts.slice(0, 10);

      return NextResponse.json({
        client,
        members,
        products,
        quota,
        usage,
      });
    } catch (error) {
      console.error('Failed to fetch client details:', error);
      return NextResponse.json({ error: 'Failed to fetch client details' }, { status: 500 });
    }
  }
);

export const DELETE = withAdminDangerousSecurity(
  async (_request, { adminSession }, routeContext) => {
    try {
      const { id } = await routeContext.params as { id: string };

      // Import here to avoid circular dependencies
      const { deleteClientCompletely } = await import('@/lib/services/admin-operations');

      // Delete client completely
      console.log(`Admin ${adminSession.email} (${adminSession.id}) requesting deletion of client ${id}`);
      const result = await deleteClientCompletely(id, adminSession.id);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to delete client' },
          { status: result.error === 'Client not found' ? 404 : 500 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('Failed to delete client:', error);
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }
  }
);
