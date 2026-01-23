/**
 * Anton Annotation Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AntonAnnotationRepository } from '../../../repositories/anton/annotation';
import { AntonPageRepository } from '../../../repositories/anton/page';
import { AntonProjectRepository } from '../../../repositories/anton/project';
import { AntonWorkspaceRepository } from '../../../repositories/anton/workspace';
import { testDb } from '../../setup';
import { createTestUser, createTestId } from '../../helpers';

describe('AntonAnnotationRepository', () => {
  let repo: AntonAnnotationRepository;
  let pageRepo: AntonPageRepository;
  let projectRepo: AntonProjectRepository;
  let workspaceRepo: AntonWorkspaceRepository;
  let testPageId: string;
  let testProjectId: string;
  let testUserId: string;

  beforeEach(async () => {
    repo = new AntonAnnotationRepository(testDb as any);
    pageRepo = new AntonPageRepository(testDb as any);
    projectRepo = new AntonProjectRepository(testDb as any);
    workspaceRepo = new AntonWorkspaceRepository(testDb as any);

    const user = await createTestUser(testDb as any);
    testUserId = user.id;

    const workspace = await workspaceRepo.create({ name: 'Test Workspace', ownerId: user.id });
    const project = await projectRepo.create({ workspaceId: workspace.id, name: 'Test Project' });
    testProjectId = project.id;

    const page = await pageRepo.create({ projectId: project.id, url: 'https://example.com/page' });
    testPageId = page.id;
  });

  describe('create', () => {
    it('should create annotation with required fields', async () => {
      const annotation = await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Test comment',
        position: { x: 100, y: 200 },
      });

      expect(annotation).toBeDefined();
      expect(annotation.id).toBeDefined();
      expect(annotation.content).toBe('Test comment');
      expect(annotation.position).toEqual({ x: 100, y: 200 });
      expect(annotation.isResolved).toBe(false);
      expect(annotation.version).toBe(1);
    });

    it('should create annotation with enhanced element context', async () => {
      const annotation = await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Button issue',
        position: { x: 100, y: 200 },
        elementSelectors: ['#submit-btn', 'button.primary', 'form button', 'div > button', 'button[type="submit"]'],
        screenLocationX: 50.5,
        screenLocationY: 75.2,
        elementHtml: '<button id="submit-btn">Submit</button>',
        elementStyles: { color: 'blue', fontSize: '16px' },
        elementBoundingRect: { width: 100, height: 40, top: 200, left: 500 },
      });

      expect(annotation.elementSelectors).toEqual([
        '#submit-btn',
        'button.primary',
        'form button',
        'div > button',
        'button[type="submit"]',
      ]);
      expect(annotation.screenLocationX).toBe('50.5');
      expect(annotation.screenLocationY).toBe('75.2');
      expect(annotation.elementHtml).toBe('<button id="submit-btn">Submit</button>');
      expect(annotation.elementStyles).toEqual({ color: 'blue', fontSize: '16px' });
    });
  });

  describe('listByPageId', () => {
    it('should return annotations for page', async () => {
      await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Comment 1',
        position: { x: 100, y: 200 },
      });
      await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Comment 2',
        position: { x: 150, y: 250 },
      });

      const annotations = await repo.listByPageId(testPageId);

      expect(annotations.length).toBe(2);
    });
  });

  describe('listByProjectId', () => {
    it('should return all annotations for project', async () => {
      await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Comment 1',
        position: { x: 100, y: 200 },
      });

      const annotations = await repo.listByProjectId(testProjectId);

      expect(annotations.length).toBe(1);
    });

    it('should filter by resolved status', async () => {
      const ann1 = await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Unresolved',
        position: { x: 100, y: 200 },
      });

      await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Resolved',
        position: { x: 150, y: 250 },
      });

      await repo.update(ann1.id, { isResolved: true });

      const resolved = await repo.listByProjectId(testProjectId, true);
      const unresolved = await repo.listByProjectId(testProjectId, false);

      expect(resolved.length).toBe(1);
      expect(unresolved.length).toBe(1);
    });
  });

  describe('findBySelector', () => {
    beforeEach(async () => {
      await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Button annotation',
        position: { x: 100, y: 200 },
        elementSelectors: ['#btn-1', '.button', 'button', 'div > button', '*'],
      });
    });

    it('should find annotation by most specific selector', async () => {
      const found = await repo.findBySelector(testPageId, ['#btn-1']);

      expect(found).toBeDefined();
      expect(found?.content).toBe('Button annotation');
    });

    it('should find annotation by fallback selector', async () => {
      const found = await repo.findBySelector(testPageId, ['.button']);

      expect(found).toBeDefined();
      expect(found?.content).toBe('Button annotation');
    });

    it('should try selectors bottom-up (most specific last)', async () => {
      const found = await repo.findBySelector(testPageId, ['*', 'button', '.button']);

      expect(found).toBeDefined();
    });

    it('should return null if no selector matches', async () => {
      const found = await repo.findBySelector(testPageId, ['#non-existent']);

      expect(found).toBeNull();
    });
  });

  describe('findByLocation', () => {
    beforeEach(async () => {
      await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Located annotation',
        position: { x: 100, y: 200 },
        screenLocationX: 50.0,
        screenLocationY: 75.0,
      });
    });

    it('should find annotation at exact location', async () => {
      const found = await repo.findByLocation(testPageId, 50.0, 75.0);

      expect(found).toBeDefined();
      expect(found?.content).toBe('Located annotation');
    });

    it('should find annotation within tolerance', async () => {
      const found = await repo.findByLocation(testPageId, 52.0, 77.0, 5);

      expect(found).toBeDefined();
      expect(found?.content).toBe('Located annotation');
    });

    it('should not find annotation outside tolerance', async () => {
      const found = await repo.findByLocation(testPageId, 60.0, 85.0, 5);

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update annotation content', async () => {
      const annotation = await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Original',
        position: { x: 100, y: 200 },
      });

      const updated = await repo.update(annotation.id, { content: 'Updated' });

      expect(updated.content).toBe('Updated');
      expect(updated.version).toBe(2);
    });

    it('should mark annotation as resolved with timestamp', async () => {
      const annotation = await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Test',
        position: { x: 100, y: 200 },
      });

      const updated = await repo.update(annotation.id, { isResolved: true, resolvedBy: testUserId });

      expect(updated.isResolved).toBe(true);
      expect(updated.resolvedAt).toBeInstanceOf(Date);
      expect(updated.resolvedBy).toBe(testUserId);
    });
  });

  describe('count', () => {
    it('should return correct count', async () => {
      await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Comment 1',
        position: { x: 100, y: 200 },
      });

      const count = await repo.count(testProjectId);

      expect(count).toBe(1);
    });

    it('should filter count by resolved status', async () => {
      const ann1 = await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Unresolved',
        position: { x: 100, y: 200 },
      });

      await repo.create({
        pageId: testPageId,
        projectId: testProjectId,
        authorId: testUserId,
        content: 'Resolved',
        position: { x: 150, y: 250 },
      });

      await repo.update(ann1.id, { isResolved: true });

      const resolvedCount = await repo.count(testProjectId, true);
      const unresolvedCount = await repo.count(testProjectId, false);

      expect(resolvedCount).toBe(1);
      expect(unresolvedCount).toBe(1);
    });
  });
});
