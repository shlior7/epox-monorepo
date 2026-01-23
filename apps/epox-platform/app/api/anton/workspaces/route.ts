/**
 * Anton Workspaces API Route
 * GET - List user's workspaces
 * POST - Create new workspace
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';

export const dynamic = 'force-dynamic';

// GET /api/anton/workspaces - List user's workspaces
export const GET = withSecurity(async (request, context) => {
  const { clientId } = context;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // For Anton, clientId maps to userId (Better Auth user ID)
    const workspaces = await db.antonWorkspaces.listByUserId(clientId);

    // Get member count for each workspace
    const workspacesWithCounts = await Promise.all(
      workspaces.map(async (workspace) => ({
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        maxProjects: workspace.maxProjects,
        maxMembers: workspace.maxMembers,
        isPremium: workspace.isPremium,
        projectCount: await db.antonWorkspaces.countProjects(workspace.id),
        memberCount: await db.antonWorkspaces.countMembers(workspace.id),
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      }))
    );

    return NextResponse.json({ workspaces: workspacesWithCounts });
  } catch (error) {
    console.error('Failed to list workspaces:', error);
    return NextResponse.json({ error: 'Failed to list workspaces' }, { status: 500 });
  }
});

// POST /api/anton/workspaces - Create workspace
export const POST = withSecurity(async (request, context) => {
  const { clientId } = context;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid workspace name' }, { status: 400 });
    }

    const workspace = await db.antonWorkspaces.create({
      name: name.trim(),
      ownerId: clientId,
    });

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        maxProjects: workspace.maxProjects,
        maxMembers: workspace.maxMembers,
        isPremium: workspace.isPremium,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
});
