#!/usr/bin/env node
/**
 * Script to create a user in the database
 * Usage: tsx scripts/seed-user.ts <email> <password> <name>
 */

import { loadEnv } from './load-env';
import { eq } from 'drizzle-orm';
import { getDb } from '../src/client';
import { user, account } from '../src/schema/auth';
import { v4 as uuidv4 } from 'uuid';

loadEnv();

async function hashPassword(password: string): Promise<string> {
  // Note: Better Auth uses bcrypt for password hashing
  // For a production script, you should use the same hashing as better-auth
  // For now, this is a placeholder - better to use the API endpoint
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(password, 10);
}

async function createUser(email: string, password: string, name: string) {
  const db = getDb();

  try {
    // Check if user already exists
    const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1);

    if (existingUser.length > 0) {
      console.error(`❌ User with email ${email} already exists`);
      process.exit(1);
    }

    // Create user
    const userId = uuidv4();
    const now = new Date();

    const [newUser] = await db
      .insert(user)
      .values({
        id: userId,
        email,
        name,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create password account
    const hashedPassword = await hashPassword(password);

    await db.insert(account).values({
      id: uuidv4(),
      userId,
      accountId: email,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    console.log('✅ User created successfully:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Name: ${newUser.name}`);
  } catch (error) {
    console.error('❌ Failed to create user:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const [email, password, name] = process.argv.slice(2);

if (!email || !password || !name) {
  console.error('Usage: tsx scripts/seed-user.ts <email> <password> <name>');
  console.error('Example: tsx scripts/seed-user.ts user@example.com mypassword "John Doe"');
  process.exit(1);
}

createUser(email, password, name).catch((error: unknown) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
