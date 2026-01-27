/**
 * Profile Settings API
 * Update user profile information (name, email)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'visualizer-auth/server';
import { db } from '@/lib/services/db';

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email } = await request.json();

    // Validate inputs
    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    if (email !== undefined) {
      if (!email || typeof email !== 'string') {
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      // Check if email is already taken by another user
      if (email !== session.user.email) {
        const existingUser = await db.users.getByEmail(email);
        if (existingUser) {
          return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        }
      }
    }

    // Build update object
    const updates: { name?: string; email?: string; emailVerified?: boolean } = {};
    if (name !== undefined) {
      updates.name = name.trim();
    }
    if (email !== undefined && email !== session.user.email) {
      updates.email = email;
      // If email changed, mark as unverified
      updates.emailVerified = false;
    }

    // Update user using repository
    const updatedUser = await db.users.update(session.user.id, updates);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
      },
    });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
