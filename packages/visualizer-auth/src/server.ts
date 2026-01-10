import { createAuth } from './config';

/**
 * Lazy-initialized auth singleton.
 * Created on first access to avoid requiring environment variables during build.
 */
let _auth: ReturnType<typeof createAuth> | null = null;

function getAuth(): ReturnType<typeof createAuth> {
  _auth ??= createAuth();
  return _auth;
}

/**
 * Auth instance with lazy initialization via Proxy.
 * Supports type inference with auth.$Infer while deferring initialization.
 */
export const auth = new Proxy({}, {
  get(_, prop) {
    return getAuth()[prop as keyof ReturnType<typeof createAuth>];
  },
  has(_, prop) {
    return prop in getAuth();
  },
  ownKeys(_) {
    return Reflect.ownKeys(getAuth());
  },
  getOwnPropertyDescriptor(_, prop) {
    return Reflect.getOwnPropertyDescriptor(getAuth(), prop);
  },
}) as ReturnType<typeof createAuth>;
