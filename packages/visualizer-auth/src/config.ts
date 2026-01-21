import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { organization } from 'better-auth/plugins';
import { getDb } from 'visualizer-db';
import * as schema from 'visualizer-db/schema';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

export function createAuth() {
  const secret = requireEnv('BETTER_AUTH_SECRET');
  const baseURL = process.env.BETTER_AUTH_URL;

  return betterAuth({
    secret,
    ...(baseURL ? { baseURL } : {}),
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    session: {
      // Enable cookie cache to reduce database queries
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // Cache for 5 minutes
      },
    },
    experimental: {
      joins: true,
    },
    plugins: [organization(), nextCookies()],
    // Database hooks to auto-create organization on user creation
    databaseHooks: {
      user: {
        create: {
          async after(user) {
            // Auto-create organization for new user
            const db = getDb();
            const baseName = (user.name || user.email || 'user').toLowerCase();
            const slug = `${baseName.replace(/\s+/g, '-')}-${Date.now()}`;

            try {
              // Import client and member schemas
              const { client, member } = await import('visualizer-db/schema');
              const { v4: uuidv4 } = await import('uuid');

              // Create organization
              const [org] = await db
                .insert(client)
                .values({
                  id: uuidv4(),
                  name: `${user.name || 'User'}'s Workspace`,
                  slug,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .returning();

              // Add user as owner
              await db.insert(member).values({
                id: uuidv4(),
                clientId: org.id,
                userId: user.id,
                role: 'owner',
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              console.log(`✅ Auto-created organization ${org.id} for user ${user.id}`);
            } catch (error) {
              console.error('Failed to auto-create organization:', error);
              // Don't fail signup if org creation fails
            }
          },
        },
      },
      session: {
        create: {
          async before(session) {
            // Auto-set active organization for new sessions if not set
            if (!session.activeClientId) {
              const db = getDb();
              const { member } = await import('visualizer-db/schema');
              const { eq } = await import('drizzle-orm');

              try {
                // Find user's first organization
                const memberships = await db.select().from(member).where(eq(member.userId, session.userId)).limit(1);

                if (memberships.length > 0) {
                  return {
                    data: {
                      ...session,
                      activeClientId: memberships[0].clientId,
                    },
                  };
                }
              } catch (error) {
                console.error('Failed to set active organization:', error);
              }
            }

            return { data: session };
          },
        },
      },
    },
  });
}
