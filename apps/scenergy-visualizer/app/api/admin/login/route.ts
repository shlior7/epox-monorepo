import { NextRequest, NextResponse } from 'next/server';
import { loginAdmin } from '@/lib/auth/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const session = await loginAdmin(email, password);

    if (!session) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { token: _token, ...safeSession } = session;
    return NextResponse.json({ session: safeSession });
  } catch (error: any) {
    console.error('❌ Admin login failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to login' }, { status: 500 });
  }
}
