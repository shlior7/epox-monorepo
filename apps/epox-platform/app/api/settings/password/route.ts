/**
 * Password Change API
 * Change user password with current password verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'visualizer-auth/server';
import { db } from '@/lib/services/db';
import { hash, compare } from 'bcrypt';

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    // Validate inputs
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Get user's credential account
    const accounts = await db.accounts.listByUser(session.user.id);
    const credentialAccount = accounts.find((acc) => acc.providerId === 'credential');

    if (!credentialAccount || !credentialAccount.password) {
      return NextResponse.json(
        { error: 'Password authentication not available for this account' },
        { status: 400 }
      );
    }

    // Verify current password
    const isPasswordValid = await compare(currentPassword, credentialAccount.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10);

    // Update password using repository method
    await db.accounts.upsertPasswordForProvider(session.user.id, 'credential', hashedPassword);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Failed to update password:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
