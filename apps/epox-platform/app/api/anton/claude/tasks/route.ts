/**
 * Anton Claude Tasks API Route
 * POST - Create Claude task to generate fix for annotation
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity } from '@/lib/security/middleware';
import { getClaudeService } from '@epox/visualizer-ai';

export const dynamic = 'force-dynamic';

// POST /api/anton/claude/tasks
export const POST = withSecurity(async (request, context) => {
  const { clientId } = context;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { annotationId, projectId, elementContext, pageUrl, screenLocation } = body;

    if (!annotationId || !projectId || !elementContext || !pageUrl) {
      return NextResponse.json({ error: 'annotationId, projectId, elementContext, and pageUrl required' }, { status: 400 });
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

    // Get annotation
    const annotation = await db.antonAnnotations.getById(annotationId);
    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Generate prompt and send to Claude
    const claude = getClaudeService();
    const claudeRequest = {
      annotationContent: annotation.content,
      elementContext,
      pageUrl,
      screenLocation,
    };

    const result = await claude.createTask(claudeRequest);

    // Save to database
    const task = await db.antonClaudeTasks.create({
      annotationId,
      projectId,
      claudeTaskId: result.taskId,
      prompt: claude.generateFixPrompt(claudeRequest),
      context: {
        elementContext,
        pageUrl,
        annotationContent: annotation.content,
      },
      status: result.status,
      response: result.response || null,
      errorMessage: result.errorMessage || null,
    });

    return NextResponse.json({
      task: {
        id: task.id,
        annotationId: task.annotationId,
        projectId: task.projectId,
        claudeTaskId: task.claudeTaskId,
        status: task.status,
        response: task.response,
        errorMessage: task.errorMessage,
        createdAt: task.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to create Claude task:', error);
    return NextResponse.json({ error: 'Failed to create Claude task' }, { status: 500 });
  }
});
