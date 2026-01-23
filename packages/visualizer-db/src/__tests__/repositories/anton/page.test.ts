/**
 * Anton Page Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AntonPageRepository } from '../../../repositories/anton/page';
import { AntonProjectRepository } from '../../../repositories/anton/project';
import { AntonWorkspaceRepository } from '../../../repositories/anton/workspace';
import { testDb } from '../../setup';
import { createTestUser } from '../../helpers';

describe('AntonPageRepository', () => {
  let repo: AntonPageRepository;
  let projectRepo: AntonProjectRepository;
  let testProjectId: string;

  beforeEach(async () => {
    repo = new AntonPageRepository(testDb as any);
    projectRepo = new AntonProjectRepository(testDb as any);
    const workspaceRepo = new AntonWorkspaceRepository(testDb as any);

    const user = await createTestUser(testDb as any);
    const workspace = await workspaceRepo.create({ name: 'Test Workspace', ownerId: user.id });
    const project = await projectRepo.create({ workspaceId: workspace.id, name: 'Test Project' });
    testProjectId = project.id;
  });

  describe('create', () => {
    it('should create page with normalized URL', async () => {
      const page = await repo.create({
        projectId: testProjectId,
        url: 'https://example.com/page?query=1#section',
      });

      expect(page).toBeDefined();
      expect(page.url).toBe('https://example.com/page?query=1#section');
      expect(page.normalizedUrl).toBe('https://example.com/page');
    });

    it('should create page with title and thumbnail', async () => {
      const page = await repo.create({
        projectId: testProjectId,
        url: 'https://example.com/page',
        title: 'Test Page',
        thumbnail: 'https://r2.example.com/thumb.png',
      });

      expect(page.title).toBe('Test Page');
      expect(page.thumbnail).toBe('https://r2.example.com/thumb.png');
    });
  });

  describe('getByProjectAndUrl', () => {
    it('should find page by normalized URL', async () => {
      await repo.create({
        projectId: testProjectId,
        url: 'https://example.com/page?query=1',
      });

      const found = await repo.getByProjectAndUrl(testProjectId, 'https://example.com/page?query=2');

      expect(found).toBeDefined();
      expect(found?.normalizedUrl).toBe('https://example.com/page');
    });

    it('should return null for non-existent page', async () => {
      const found = await repo.getByProjectAndUrl(testProjectId, 'https://example.com/other');

      expect(found).toBeNull();
    });
  });

  describe('getOrCreate', () => {
    it('should return existing page if found', async () => {
      const created = await repo.create({ projectId: testProjectId, url: 'https://example.com/page' });

      const page = await repo.getOrCreate({ projectId: testProjectId, url: 'https://example.com/page?new=1' });

      expect(page.id).toBe(created.id);
    });

    it('should create new page if not found', async () => {
      const page = await repo.getOrCreate({ projectId: testProjectId, url: 'https://example.com/new' });

      expect(page).toBeDefined();
      expect(page.normalizedUrl).toBe('https://example.com/new');
    });
  });

  describe('listByProjectId', () => {
    it('should return pages for project', async () => {
      await repo.create({ projectId: testProjectId, url: 'https://example.com/page1' });
      await repo.create({ projectId: testProjectId, url: 'https://example.com/page2' });

      const pages = await repo.listByProjectId(testProjectId);

      expect(pages.length).toBe(2);
    });
  });

  describe('count', () => {
    it('should return correct page count', async () => {
      await repo.create({ projectId: testProjectId, url: 'https://example.com/page1' });
      await repo.create({ projectId: testProjectId, url: 'https://example.com/page2' });

      const count = await repo.count(testProjectId);

      expect(count).toBe(2);
    });
  });
});
