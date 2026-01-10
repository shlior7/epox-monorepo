import { betterAuth } from 'better-auth';
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
    experimental: {
      joins: true,
    },
    plugins: [organization(), nextCookies()],
  });
}
