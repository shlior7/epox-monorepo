import { NextResponse } from 'next/server';
import { logoutAdmin } from '@/lib/auth/admin-auth';

export async function POST() {
  try {
    await logoutAdmin();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Admin logout failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to logout' }, { status: 500 });
  }
}
