/**
 * Anton Projects API Route
 * GET - List workspace projects
 * POST - Create new project
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';

export const dynamic = 'force-dynamic';

// GET /api/anton/projects?workspaceId=xxx
export const GET = withSecurity(async (request, context) => {
  const { clientId } = context;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    // Verify user is workspace member
    const isMember = await db.antonWorkspaceMembers.isMember(workspaceId, clientId);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const projects = await db.antonProjects.listByWorkspaceId(workspaceId);

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        workspaceId: p.workspaceId,
        name: p.name,
        description: p.description,
        urlPatterns: p.urlPatterns,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
});

// POST /api/anton/projects
export const POST = withSecurity(async (request, context) => {
  const { clientId } = context;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { workspaceId, name, description, urlPatterns } = body;

    if (!workspaceId || !name) {
      return NextResponse.json({ error: 'workspaceId and name required' }, { status: 400 });
    }

    // Verify workspace membership
    const isMember = await db.antonWorkspaceMembers.isMember(workspaceId, clientId);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check free tier limits
    const canAdd = await db.antonWorkspaces.canAddProject(workspaceId);
    if (!canAdd) {
      return NextResponse.json({ error: 'Project limit reached', code: 'FREE_TIER_LIMIT' }, { status: 402 });
    }

    const project = await db.antonProjects.create({
      workspaceId,
      name: name.trim(),
      description: description?.trim(),
      urlPatterns: urlPatterns || [],
    });

    return NextResponse.json({
      project: {
        id: project.id,
        workspaceId: project.workspaceId,
        name: project.name,
        description: project.description,
        urlPatterns: project.urlPatterns,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
});
