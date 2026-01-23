/**
 * Anton Workspace by ID API Route
 * GET - Get workspace details
 * PATCH - Update workspace
 * DELETE - Delete workspace
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';

export const dynamic = 'force-dynamic';

// GET /api/anton/workspaces/[id]
export const GET = withSecurity(async (request, context, routeContext) => {
  const { clientId } = context;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await routeContext.params;
    const workspaceId = params.id;

    const workspace = await db.antonWorkspaces.getById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Verify user is a member
    const isMember = await db.antonWorkspaceMembers.isMember(workspaceId, clientId);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    console.error('Failed to get workspace:', error);
    return NextResponse.json({ error: 'Failed to get workspace' }, { status: 500 });
  }
});

// PATCH /api/anton/workspaces/[id]
export const PATCH = withSecurity(async (request, context, routeContext) => {
  const { clientId } = context;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await routeContext.params;
    const workspaceId = params.id;

    const workspace = await db.antonWorkspaces.getById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Verify user is owner or admin
    const hasRole = await db.antonWorkspaceMembers.hasRole(workspaceId, clientId, ['owner', 'admin']);
    if (!hasRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    const updated = await db.antonWorkspaces.update(workspaceId, {
      name: name?.trim(),
    });

    return NextResponse.json({
      workspace: {
        id: updated.id,
        name: updated.name,
        ownerId: updated.ownerId,
        maxProjects: updated.maxProjects,
        maxMembers: updated.maxMembers,
        isPremium: updated.isPremium,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to update workspace:', error);
    return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
  }
});

// DELETE /api/anton/workspaces/[id]
export const DELETE = withSecurity(async (request, context, routeContext) => {
  const { clientId } = context;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await routeContext.params;
    const workspaceId = params.id;

    const workspace = await db.antonWorkspaces.getById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Only owner can delete workspace
    if (workspace.ownerId !== clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.antonWorkspaces.delete(workspaceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
  }
});
