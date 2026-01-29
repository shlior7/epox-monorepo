import { NextRequest, NextResponse } from 'next/server';
import { withAdminWriteSecurity } from '@/lib/security/admin-middleware';
import { db } from 'visualizer-db';

/**
 * POST /api/admin/clients/[id]/credits
 * Grant additional credits or reset usage for a client
 */
export const POST = withAdminWriteSecurity(
  async (request: NextRequest, { adminSession }, routeContext) => {
    try {
      const { id } = (await routeContext.params) as { id: string };

      const body = await request.json();
      const { action, amount, reason } = body as {
        action: 'grant' | 'reset';
        amount?: number;
        reason?: string;
      };

      // Validate action
      if (!action || !['grant', 'reset'].includes(action)) {
        return NextResponse.json(
          { error: "Invalid action. Must be 'grant' or 'reset'" },
          { status: 400 }
        );
      }

      // Validate client exists
      const client = await db.clients.getById(id);
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      // Get current quota and usage
      const currentQuota = await db.quotaLimits.getOrCreate(id);
      const currentUsage = await db.usageRecords.getCurrentUsage(id);

      if (action === 'grant') {
        // Validate amount
        if (amount === undefined || !Number.isInteger(amount) || amount <= 0) {
          return NextResponse.json(
            { error: 'amount must be a positive integer for grant action' },
            { status: 400 }
          );
        }

        // Increase monthly generation limit
        const newLimit = currentQuota.monthlyGenerationLimit + amount;
        await db.quotaLimits.update(id, { monthlyGenerationLimit: newLimit });

        // Create audit log
        await db.creditAuditLogs.create({
          clientId: id,
          adminId: adminSession.id,
          action: 'credit_grant',
          details: { amount, reason: reason ?? null },
          previousValue: String(currentQuota.monthlyGenerationLimit),
          newValue: String(newLimit),
        });

        console.log(`Admin ${adminSession.email} granted ${amount} credits to client ${id}`);

        return NextResponse.json({
          action: 'grant',
          currentUsage,
          previousLimit: currentQuota.monthlyGenerationLimit,
          newLimit,
          remaining: newLimit - currentUsage,
        });
      }

      // action === 'reset'
      // Reset current month's usage to 0
      const usageRecord = await db.usageRecords.getByClientAndMonth(id);

      if (usageRecord) {
        // Reset by creating a negative increment to bring count to 0
        // We need to use incrementUsage with a negative count
        await db.usageRecords.incrementUsage(id, undefined, -usageRecord.generationCount);
      }

      // Create audit log
      await db.creditAuditLogs.create({
        clientId: id,
        adminId: adminSession.id,
        action: 'usage_reset',
        details: { previousUsage: currentUsage, reason: reason ?? null },
        previousValue: String(currentUsage),
        newValue: '0',
      });

      console.log(`Admin ${adminSession.email} reset usage for client ${id}`);

      return NextResponse.json({
        action: 'reset',
        currentUsage: 0,
        limit: currentQuota.monthlyGenerationLimit,
        remaining: currentQuota.monthlyGenerationLimit,
      });
    } catch (error) {
      console.error('Failed to manage client credits:', error);
      return NextResponse.json({ error: 'Failed to manage client credits' }, { status: 500 });
    }
  }
);
