import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin-auth';

export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token: _token, ...safeSession } = session;
    return NextResponse.json({ session: safeSession });
  } catch (error: any) {
    console.error('❌ Admin session check failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to get session' }, { status: 500 });
  }
}
