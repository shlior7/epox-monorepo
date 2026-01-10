#!/usr/bin/env node
/**
 * Create the default mega-admin user
 * Usage: tsx scripts/create-default-admin.ts
 */

import { loadEnv } from './load-env';
import { getDb } from '../src/client';
import { adminUser } from '../src/schema/auth';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

loadEnv();

const DEFAULT_ADMIN_EMAIL = 'mega-admin';
const DEFAULT_ADMIN_PASSWORD = 'EpoX2025!?';
const DEFAULT_ADMIN_NAME = 'Mega Admin';

async function createDefaultAdmin() {
  const db = getDb();

  try {
    // Check if mega-admin already exists
    const existing = await db.select().from(adminUser).where(eq(adminUser.email, DEFAULT_ADMIN_EMAIL)).limit(1);

    if (existing.length > 0) {
      console.log('✅ Mega admin already exists');
      console.log(`   Email: ${DEFAULT_ADMIN_EMAIL}`);
      process.exit(0);
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

    // Create admin user
    const id = uuidv4();
    const now = new Date();

    const [created] = await db
      .insert(adminUser)
      .values({
        id,
        email: DEFAULT_ADMIN_EMAIL,
        name: DEFAULT_ADMIN_NAME,
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    console.log('✅ Default mega admin created successfully!');
    console.log(`   Email: ${DEFAULT_ADMIN_EMAIL}`);
    console.log(`   Password: ${DEFAULT_ADMIN_PASSWORD}`);
    console.log(`   ID: ${created.id}`);
    console.log('');
    console.log('⚠️  Make sure to change the password after first login!');
  } catch (error) {
    console.error('❌ Failed to create default admin:', error);
    process.exit(1);
  }
}

createDefaultAdmin().catch((error: unknown) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
