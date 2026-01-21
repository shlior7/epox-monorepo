import { eq } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { adminUser, adminSession } from '../schema/auth';
import { v4 as uuidv4 } from 'uuid';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSession {
  id: string;
  token: string;
  adminUserId: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AdminUserRepository {
  constructor(private drizzle: DrizzleClient) {}

  async create(email: string, name: string, passwordHash: string): Promise<AdminUser> {
    const id = uuidv4();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(adminUser)
      .values({
        id,
        email,
        name,
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async getByEmail(email: string): Promise<(AdminUser & { passwordHash: string }) | null> {
    const rows = await this.drizzle.select().from(adminUser).where(eq(adminUser.email, email)).limit(1);
    return rows[0] ? (rows[0] as AdminUser & { passwordHash: string }) : null;
  }

  async getById(id: string): Promise<AdminUser | null> {
    const rows = await this.drizzle.select().from(adminUser).where(eq(adminUser.id, id)).limit(1);
    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async createSession(adminUserId: string, expiresAt: Date, ipAddress?: string, userAgent?: string): Promise<AdminSession> {
    const id = uuidv4();
    const token = uuidv4();
    const now = new Date();

    const [created] = await this.drizzle
      .insert(adminSession)
      .values({
        id,
        token,
        adminUserId,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created as AdminSession;
  }

  async getSessionByToken(token: string): Promise<(AdminSession & { adminUser: AdminUser }) | null> {
    const rows = await this.drizzle
      .select()
      .from(adminSession)
      .innerJoin(adminUser, eq(adminSession.adminUserId, adminUser.id))
      .where(eq(adminSession.token, token))
      .limit(1);

    if (!rows[0]) return null;

    return {
      ...rows[0].admin_session,
      adminUser: this.mapToEntity(rows[0].admin_user),
    } as AdminSession & { adminUser: AdminUser };
  }

  async deleteSession(token: string): Promise<void> {
    await this.drizzle.delete(adminSession).where(eq(adminSession.token, token));
  }

  private mapToEntity(row: any): AdminUser {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      isActive: row.isActive ?? row.is_active,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
    };
  }
}
