import 'server-only';

import { NextResponse } from 'next/server';
import { getAdminSession } from './admin-auth';
import type { AdminAuthSession } from './admin-auth';

interface AdminContext<TParams = any> {
  admin: AdminAuthSession;
  params?: TParams;
}

export function requireAdmin<TParams = any>(handler: (req: Request, ctx: AdminContext<TParams>) => Promise<Response>) {
  return async (req: Request, ctx: { params?: TParams }) => {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, { ...ctx, admin });
  };
}
