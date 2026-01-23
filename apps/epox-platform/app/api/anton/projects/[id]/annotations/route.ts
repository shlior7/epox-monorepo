/**
 * Anton Project Annotations API Route
 * GET - List project annotations (with pageId filter)
 * POST - Create new annotation
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';

export const dynamic = 'force-dynamic';

// GET /api/anton/projects/[id]/annotations?pageId=xxx
export const GET = withSecurity(async (request, context, routeContext) => {
  const { clientId } = context;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await routeContext.params;
    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    // Verify project access (check workspace membership)
    const project = await db.antonProjects.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isMember = await db.antonWorkspaceMembers.isMember(project.workspaceId, clientId);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let annotations;
    if (pageId) {
      annotations = await db.antonAnnotations.listByPageId(pageId);
    } else {
      annotations = await db.antonAnnotations.listByProjectId(projectId);
    }

    return NextResponse.json({
      annotations: annotations.map((a) => ({
        id: a.id,
        pageId: a.pageId,
        projectId: a.projectId,
        authorId: a.authorId,
        content: a.content,
        position: a.position,
        elementSelectors: a.elementSelectors,
        screenLocationX: a.screenLocationX,
        screenLocationY: a.screenLocationY,
        elementHtml: a.elementHtml,
        elementStyles: a.elementStyles,
        elementScreenshot: a.elementScreenshot,
        elementBoundingRect: a.elementBoundingRect,
        isResolved: a.isResolved,
        resolvedAt: a.resolvedAt?.toISOString(),
        resolvedBy: a.resolvedBy,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to list annotations:', error);
    return NextResponse.json({ error: 'Failed to list annotations' }, { status: 500 });
  }
});

// POST /api/anton/projects/[id]/annotations
export const POST = withSecurity(async (request, context, routeContext) => {
  const { clientId } = context;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await routeContext.params;
    const projectId = params.id;
    const body = await request.json();

    const { url, content, position, elementSelectors, screenLocationX, screenLocationY, elementHtml, elementStyles, elementScreenshot, elementBoundingRect } = body;

    if (!url || !content || !position) {
      return NextResponse.json({ error: 'url, content, and position required' }, { status: 400 });
    }

    // Verify project access
    const project = await db.antonProjects.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isMember = await db.antonWorkspaceMembers.isMember(project.workspaceId, clientId);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get or create page
    const page = await db.antonPages.getOrCreate({
      projectId,
      url,
    });

    // Create annotation
    const annotation = await db.antonAnnotations.create({
      pageId: page.id,
      projectId,
      authorId: clientId,
      content,
      position,
      elementSelectors,
      screenLocationX,
      screenLocationY,
      elementHtml,
      elementStyles,
      elementScreenshot,
      elementBoundingRect,
    });

    return NextResponse.json({
      annotation: {
        id: annotation.id,
        pageId: annotation.pageId,
        projectId: annotation.projectId,
        authorId: annotation.authorId,
        content: annotation.content,
        position: annotation.position,
        elementSelectors: annotation.elementSelectors,
        screenLocationX: annotation.screenLocationX,
        screenLocationY: annotation.screenLocationY,
        isResolved: annotation.isResolved,
        createdAt: annotation.createdAt.toISOString(),
        updatedAt: annotation.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to create annotation:', error);
    return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 });
  }
});
