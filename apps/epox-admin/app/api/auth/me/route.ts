import { NextResponse } from 'next/server';
import { withAuth } from 'visualizer-auth/middleware';
import { getUserRole } from '@/lib/auth/access';

export const GET = withAuth(async (_request, { session }) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await getUserRole(session);
  return NextResponse.json({ session, role });
});
