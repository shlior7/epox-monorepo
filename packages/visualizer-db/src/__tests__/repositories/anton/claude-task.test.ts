/**
 * Anton Claude Task Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AntonClaudeTaskRepository } from '../../../repositories/anton/claude-task';
import { AntonAnnotationRepository } from '../../../repositories/anton/annotation';
import { AntonPageRepository } from '../../../repositories/anton/page';
import { AntonProjectRepository } from '../../../repositories/anton/project';
import { AntonWorkspaceRepository } from '../../../repositories/anton/workspace';
import { testDb } from '../../setup';
import { createTestUser } from '../../helpers';

describe('AntonClaudeTaskRepository', () => {
  let repo: AntonClaudeTaskRepository;
  let annotationRepo: AntonAnnotationRepository;
  let testAnnotationId: string;
  let testProjectId: string;

  beforeEach(async () => {
    repo = new AntonClaudeTaskRepository(testDb as any);
    annotationRepo = new AntonAnnotationRepository(testDb as any);
    const pageRepo = new AntonPageRepository(testDb as any);
    const projectRepo = new AntonProjectRepository(testDb as any);
    const workspaceRepo = new AntonWorkspaceRepository(testDb as any);

    const user = await createTestUser(testDb as any);
    const workspace = await workspaceRepo.create({ name: 'Test Workspace', ownerId: user.id });
    const project = await projectRepo.create({ workspaceId: workspace.id, name: 'Test Project' });
    testProjectId = project.id;

    const page = await pageRepo.create({ projectId: project.id, url: 'https://example.com/page' });
    const annotation = await annotationRepo.create({
      pageId: page.id,
      projectId: project.id,
      authorId: user.id,
      content: 'Fix this button',
      position: { x: 100, y: 200 },
    });
    testAnnotationId = annotation.id;
  });

  describe('create', () => {
    it('should create Claude task with required fields', async () => {
      const task = await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Fix the button styling',
        context: {
          elementContext: {
            selectors: ['#btn'],
            html: '<button>Click</button>',
            styles: { color: 'blue' },
            boundingRect: { width: 100, height: 40, top: 200, left: 500 },
          },
          pageUrl: 'https://example.com/page',
          annotationContent: 'Fix this button',
        },
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.status).toBe('sent');
      expect(task.prompt).toBe('Fix the button styling');
    });

    it('should create task with custom status', async () => {
      const task = await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Test prompt',
        context: {
          elementContext: {
            selectors: [],
            html: '',
            styles: {},
            boundingRect: { width: 0, height: 0, top: 0, left: 0 },
          },
          pageUrl: '',
          annotationContent: '',
        },
        status: 'in_progress',
      });

      expect(task.status).toBe('in_progress');
    });
  });

  describe('listByAnnotationId', () => {
    it('should return tasks for annotation', async () => {
      await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Task 1',
        context: {
          elementContext: { selectors: [], html: '', styles: {}, boundingRect: { width: 0, height: 0, top: 0, left: 0 } },
          pageUrl: '',
          annotationContent: '',
        },
      });
      await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Task 2',
        context: {
          elementContext: { selectors: [], html: '', styles: {}, boundingRect: { width: 0, height: 0, top: 0, left: 0 } },
          pageUrl: '',
          annotationContent: '',
        },
      });

      const tasks = await repo.listByAnnotationId(testAnnotationId);

      expect(tasks.length).toBe(2);
    });
  });

  describe('listByProjectId', () => {
    it('should return tasks for project', async () => {
      await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Task 1',
        context: {
          elementContext: { selectors: [], html: '', styles: {}, boundingRect: { width: 0, height: 0, top: 0, left: 0 } },
          pageUrl: '',
          annotationContent: '',
        },
      });

      const tasks = await repo.listByProjectId(testProjectId);

      expect(tasks.length).toBe(1);
    });

    it('should filter by status', async () => {
      const task1 = await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Task 1',
        context: {
          elementContext: { selectors: [], html: '', styles: {}, boundingRect: { width: 0, height: 0, top: 0, left: 0 } },
          pageUrl: '',
          annotationContent: '',
        },
      });

      await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Task 2',
        context: {
          elementContext: { selectors: [], html: '', styles: {}, boundingRect: { width: 0, height: 0, top: 0, left: 0 } },
          pageUrl: '',
          annotationContent: '',
        },
        status: 'completed',
      });

      await repo.update(task1.id, { status: 'failed' });

      const sentTasks = await repo.listByProjectId(testProjectId, 'sent');
      const failedTasks = await repo.listByProjectId(testProjectId, 'failed');
      const completedTasks = await repo.listByProjectId(testProjectId, 'completed');

      expect(sentTasks.length).toBe(0);
      expect(failedTasks.length).toBe(1);
      expect(completedTasks.length).toBe(1);
    });
  });

  describe('getByClaudeTaskId', () => {
    it('should find task by Claude task ID', async () => {
      const created = await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        claudeTaskId: 'claude-123',
        prompt: 'Test',
        context: {
          elementContext: { selectors: [], html: '', styles: {}, boundingRect: { width: 0, height: 0, top: 0, left: 0 } },
          pageUrl: '',
          annotationContent: '',
        },
      });

      const found = await repo.getByClaudeTaskId('claude-123');

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent Claude task ID', async () => {
      const found = await repo.getByClaudeTaskId('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update task fields', async () => {
      const task = await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Test',
        context: {
          elementContext: { selectors: [], html: '', styles: {}, boundingRect: { width: 0, height: 0, top: 0, left: 0 } },
          pageUrl: '',
          annotationContent: '',
        },
      });

      const updated = await repo.update(task.id, {
        status: 'completed',
        response: 'Fix applied successfully',
      });

      expect(updated.status).toBe('completed');
      expect(updated.response).toBe('Fix applied successfully');
    });
  });

  describe('count', () => {
    it('should return correct count', async () => {
      await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Task 1',
        context: {
          elementContext: { selectors: [], html: '', styles: {}, boundingRect: { width: 0, height: 0, top: 0, left: 0 } },
          pageUrl: '',
          annotationContent: '',
        },
      });

      const count = await repo.count(testProjectId);

      expect(count).toBe(1);
    });

    it('should filter count by status', async () => {
      await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Task 1',
        context: {
          elementContext: { selectors: [], html: '', styles: {}, boundingRect: { width: 0, height: 0, top: 0, left: 0 } },
          pageUrl: '',
          annotationContent: '',
        },
        status: 'sent',
      });
      await repo.create({
        annotationId: testAnnotationId,
        projectId: testProjectId,
        prompt: 'Task 2',
        context: {
          elementContext: { selectors: [], html: '', styles: {}, boundingRect: { width: 0, height: 0, top: 0, left: 0 } },
          pageUrl: '',
          annotationContent: '',
        },
        status: 'completed',
      });

      const sentCount = await repo.count(testProjectId, 'sent');
      const completedCount = await repo.count(testProjectId, 'completed');

      expect(sentCount).toBe(1);
      expect(completedCount).toBe(1);
    });
  });
});
