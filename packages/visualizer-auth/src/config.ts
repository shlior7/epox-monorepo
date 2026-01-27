import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
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
  // Check NEXT_PUBLIC_IS_E2E first because yarn dev always sets NODE_ENV=development
  const isE2E = process.env.NEXT_PUBLIC_IS_E2E === 'true';
  const isProduction = process.env.NODE_ENV === 'production' && !isE2E;

  // Debug logging (disabled by default)
  if (process.env.DEBUG_AUTH) {
    console.log('[SERVER AUTH INIT] NODE_ENV:', process.env.NODE_ENV);
    console.log('[SERVER AUTH INIT] isProduction:', isProduction);
    console.log('[SERVER AUTH INIT] Will enable org plugin:', isProduction);
  }

  // Get plugins - only load organization plugin in production
  const getPlugins = () => {
    if (isProduction) {
      // Dynamically import organization plugin only in production
      const { organization } = require('better-auth/plugins');
      return [organization(), nextCookies()];
    }
    return [nextCookies()];
  };

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
      // Disable cookie cache in test/dev to avoid stale sessions
      cookieCache: {
        enabled: isProduction,
        maxAge: 5 * 60, // Cache for 5 minutes
      },
    },
    experimental: {
      joins: true,
    },
    // Only enable organization plugin in production to avoid WebSocket issues
    plugins: getPlugins(),
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
