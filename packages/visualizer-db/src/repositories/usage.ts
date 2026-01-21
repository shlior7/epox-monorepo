import { and, eq, sql } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { usageRecord, quotaLimit, type PlanType } from '../schema/usage';
import { NotFoundError } from '../errors';
import { BaseRepository } from './base';

// ===== USAGE RECORD =====

export interface UsageRecord {
  id: string;
  clientId: string;
  userId: string | null;
  month: string;
  generationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UsageRecordRepository extends BaseRepository<UsageRecord> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, usageRecord);
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async getByClientAndMonth(clientId: string, month?: string): Promise<UsageRecord | null> {
    const targetMonth = month ?? this.getCurrentMonth();
    const rows = await this.drizzle
      .select()
      .from(usageRecord)
      .where(and(eq(usageRecord.clientId, clientId), eq(usageRecord.month, targetMonth)))
      .limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async getOrCreate(clientId: string, userId?: string): Promise<UsageRecord> {
    const month = this.getCurrentMonth();
    const existing = await this.getByClientAndMonth(clientId, month);

    if (existing) {
      return existing;
    }

    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(usageRecord)
      .values({
        id,
        clientId,
        userId: userId ?? null,
        month,
        generationCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async incrementUsage(clientId: string, userId?: string, count = 1): Promise<UsageRecord> {
    const record = await this.getOrCreate(clientId, userId);

    const [updated] = await this.drizzle
      .update(usageRecord)
      .set({
        generationCount: sql`${usageRecord.generationCount} + ${count}`,
        updatedAt: new Date(),
      })
      .where(eq(usageRecord.id, record.id))
      .returning();

    return this.mapToEntity(updated);
  }

  async getCurrentUsage(clientId: string): Promise<number> {
    const record = await this.getByClientAndMonth(clientId);
    return record?.generationCount ?? 0;
  }
}

// ===== QUOTA LIMIT =====

export interface QuotaLimit {
  id: string;
  clientId: string;
  plan: PlanType;
  monthlyGenerationLimit: number;
  storageQuotaMb: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotaLimitCreate {
  clientId: string;
  plan?: PlanType;
  monthlyGenerationLimit?: number;
  storageQuotaMb?: number;
}

export interface QuotaLimitUpdate {
  plan?: PlanType;
  monthlyGenerationLimit?: number;
  storageQuotaMb?: number;
}

export class QuotaLimitRepository extends BaseRepository<QuotaLimit> {
  constructor(drizzle: DrizzleClient) {
    super(drizzle, quotaLimit);
  }

  async getByClientId(clientId: string): Promise<QuotaLimit | null> {
    const rows = await this.drizzle.select().from(quotaLimit).where(eq(quotaLimit.clientId, clientId)).limit(1);

    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async getOrCreate(clientId: string): Promise<QuotaLimit> {
    const existing = await this.getByClientId(clientId);
    if (existing) {
      return existing;
    }

    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(quotaLimit)
      .values({
        id,
        clientId,
        plan: 'free',
        monthlyGenerationLimit: 100,
        storageQuotaMb: 1000,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async create(data: QuotaLimitCreate): Promise<QuotaLimit> {
    const id = this.generateId();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(quotaLimit)
      .values({
        id,
        clientId: data.clientId,
        plan: data.plan ?? 'free',
        monthlyGenerationLimit: data.monthlyGenerationLimit ?? 100,
        storageQuotaMb: data.storageQuotaMb ?? 1000,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async update(clientId: string, data: QuotaLimitUpdate): Promise<QuotaLimit> {
    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.plan !== undefined) {
      updatePayload.plan = data.plan;
    }
    if (data.monthlyGenerationLimit !== undefined) {
      updatePayload.monthlyGenerationLimit = data.monthlyGenerationLimit;
    }
    if (data.storageQuotaMb !== undefined) {
      updatePayload.storageQuotaMb = data.storageQuotaMb;
    }

    const [updated] = await this.drizzle.update(quotaLimit).set(updatePayload).where(eq(quotaLimit.clientId, clientId)).returning();

    if (!updated) {
      throw new NotFoundError('quota_limit', clientId);
    }

    return this.mapToEntity(updated);
  }
}
