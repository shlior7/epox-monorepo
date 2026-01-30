import { NextRequest, NextResponse } from 'next/server';
import { withAdminReadSecurity, withAdminWriteSecurity } from '@/lib/security/admin-middleware';
import { db } from 'visualizer-db';

type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

const VALID_PLANS: PlanType[] = ['free', 'starter', 'pro', 'enterprise'];

/** Plan limit defaults — mirrors PLAN_LIMITS from visualizer-services */
const PLAN_DEFAULTS: Record<PlanType, { monthlyGenerations: number; storageMb: number }> = {
  free: { monthlyGenerations: 100, storageMb: 1000 },
  starter: { monthlyGenerations: 500, storageMb: 5000 },
  pro: { monthlyGenerations: 2000, storageMb: 20000 },
  enterprise: { monthlyGenerations: -1, storageMb: -1 },
};

/**
 * GET /api/admin/clients/[id]/quota
 * Returns current quota, usage, and recent audit log for a client
 */
export const GET = withAdminReadSecurity(
  async (_request, _context, routeContext) => {
    try {
      const { id } = (await routeContext.params) as { id: string };

      const client = await db.clients.getById(id);
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      const [quota, usage, auditLog] = await Promise.all([
        db.quotaLimits.getByClientId(id),
        db.usageRecords.getByClientAndMonth(id),
        db.creditAuditLogs.listByClient(id, { limit: 10 }),
      ]);

      return NextResponse.json({
        quota,
        usage,
        auditLog,
      });
    } catch (error) {
      console.error('Failed to fetch client quota:', error);
      return NextResponse.json({ error: 'Failed to fetch client quota' }, { status: 500 });
    }
  }
);

/**
 * PUT /api/admin/clients/[id]/quota
 * Update client plan and/or quota limits
 */
export const PUT = withAdminWriteSecurity(
  async (request: NextRequest, { adminSession }, routeContext) => {
    try {
      const { id } = (await routeContext.params) as { id: string };

      const body = await request.json();
      const { plan, monthlyGenerationLimit, storageQuotaMb } = body as {
        plan?: string;
        monthlyGenerationLimit?: number;
        storageQuotaMb?: number;
      };

      // Validate plan
      if (plan !== undefined && !VALID_PLANS.includes(plan as PlanType)) {
        return NextResponse.json(
          { error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` },
          { status: 400 }
        );
      }

      // Validate limits
      if (monthlyGenerationLimit !== undefined && (!Number.isInteger(monthlyGenerationLimit) || monthlyGenerationLimit < -1)) {
        return NextResponse.json(
          { error: 'monthlyGenerationLimit must be a positive integer or -1 for unlimited' },
          { status: 400 }
        );
      }
      if (storageQuotaMb !== undefined && (!Number.isInteger(storageQuotaMb) || storageQuotaMb < -1)) {
        return NextResponse.json(
          { error: 'storageQuotaMb must be a positive integer or -1 for unlimited' },
          { status: 400 }
        );
      }

      // Get or create current quota
      const currentQuota = await db.quotaLimits.getOrCreate(id);

      // Build update payload
      const updates: { plan?: PlanType; monthlyGenerationLimit?: number; storageQuotaMb?: number } = {};

      if (plan !== undefined) {
        updates.plan = plan as PlanType;
        // Apply plan defaults unless explicitly overridden
        const planDefaults = PLAN_DEFAULTS[plan as PlanType];
        if (monthlyGenerationLimit === undefined) {
          updates.monthlyGenerationLimit = planDefaults.monthlyGenerations;
        }
        if (storageQuotaMb === undefined) {
          updates.storageQuotaMb = planDefaults.storageMb;
        }
      }

      if (monthlyGenerationLimit !== undefined) {
        updates.monthlyGenerationLimit = monthlyGenerationLimit;
      }
      if (storageQuotaMb !== undefined) {
        updates.storageQuotaMb = storageQuotaMb;
      }

      // Update quota
      const updatedQuota = await db.quotaLimits.update(id, updates);

      // Determine audit action
      const action = plan !== undefined ? 'plan_change' : 'limit_change';

      // Create audit log entry
      await db.creditAuditLogs.create({
        clientId: id,
        adminId: adminSession.id,
        action: action as 'plan_change' | 'limit_change',
        details: { ...updates, reason: body.reason },
        previousValue: JSON.stringify({
          plan: currentQuota.plan,
          monthlyGenerationLimit: currentQuota.monthlyGenerationLimit,
          storageQuotaMb: currentQuota.storageQuotaMb,
        }),
        newValue: JSON.stringify({
          plan: updatedQuota.plan,
          monthlyGenerationLimit: updatedQuota.monthlyGenerationLimit,
          storageQuotaMb: updatedQuota.storageQuotaMb,
        }),
      });

      console.log(`Admin ${adminSession.email} updated quota for client ${id}`);

      return NextResponse.json(updatedQuota);
    } catch (error) {
      console.error('Failed to update client quota:', error);
      return NextResponse.json({ error: 'Failed to update client quota' }, { status: 500 });
    }
  }
);
