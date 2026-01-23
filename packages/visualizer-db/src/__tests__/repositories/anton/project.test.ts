/**
 * Anton Project Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AntonProjectRepository } from '../../../repositories/anton/project';
import { AntonWorkspaceRepository } from '../../../repositories/anton/workspace';
import { testDb } from '../../setup';
import { createTestUser, createTestId } from '../../helpers';

describe('AntonProjectRepository', () => {
  let repo: AntonProjectRepository;
  let workspaceRepo: AntonWorkspaceRepository;
  let testWorkspaceId: string;

  beforeEach(async () => {
    repo = new AntonProjectRepository(testDb as any);
    workspaceRepo = new AntonWorkspaceRepository(testDb as any);

    const user = await createTestUser(testDb as any);
    const workspace = await workspaceRepo.create({ name: 'Test Workspace', ownerId: user.id });
    testWorkspaceId = workspace.id;
  });

  describe('create', () => {
    it('should create a project with required fields', async () => {
      const project = await repo.create({
        workspaceId: testWorkspaceId,
        name: 'Test Project',
      });

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.workspaceId).toBe(testWorkspaceId);
      expect(project.urlPatterns).toEqual([]);
      expect(project.version).toBe(1);
    });

    it('should create a project with all fields', async () => {
      const project = await repo.create({
        workspaceId: testWorkspaceId,
        name: 'Full Project',
        description: 'Project description',
        urlPatterns: ['https://example.com/*', 'https://app.example.com/**'],
      });

      expect(project.name).toBe('Full Project');
      expect(project.description).toBe('Project description');
      expect(project.urlPatterns).toEqual(['https://example.com/*', 'https://app.example.com/**']);
    });
  });

  describe('listByWorkspaceId', () => {
    it('should return projects for workspace', async () => {
      await repo.create({ workspaceId: testWorkspaceId, name: 'Project A' });
      await repo.create({ workspaceId: testWorkspaceId, name: 'Project B' });

      const projects = await repo.listByWorkspaceId(testWorkspaceId);

      expect(projects.length).toBe(2);
      expect(projects.map((p) => p.name).sort()).toEqual(['Project A', 'Project B']);
    });

    it('should return empty array for workspace with no projects', async () => {
      const projects = await repo.listByWorkspaceId(testWorkspaceId);

      expect(projects).toEqual([]);
    });
  });

  describe('matchByUrl', () => {
    beforeEach(async () => {
      await repo.create({
        workspaceId: testWorkspaceId,
        name: 'Exact Match Project',
        urlPatterns: ['https://example.com/app'],
      });

      await repo.create({
        workspaceId: testWorkspaceId,
        name: 'Wildcard Project',
        urlPatterns: ['https://example.com/*'],
      });

      await repo.create({
        workspaceId: testWorkspaceId,
        name: 'Deep Wildcard Project',
        urlPatterns: ['https://example.com/**'],
      });

      await repo.create({
        workspaceId: testWorkspaceId,
        name: 'No Pattern Project',
        urlPatterns: [],
      });
    });

    it('should match exact URL', async () => {
      const matches = await repo.matchByUrl(testWorkspaceId, 'https://example.com/app');

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((p) => p.name === 'Exact Match Project')).toBe(true);
    });

    it('should match wildcard pattern', async () => {
      const matches = await repo.matchByUrl(testWorkspaceId, 'https://example.com/page');

      expect(matches.some((p) => p.name === 'Wildcard Project')).toBe(true);
    });

    it('should match deep wildcard pattern', async () => {
      const matches = await repo.matchByUrl(testWorkspaceId, 'https://example.com/deep/nested/page');

      expect(matches.some((p) => p.name === 'Deep Wildcard Project')).toBe(true);
    });

    it('should not match projects without patterns', async () => {
      const matches = await repo.matchByUrl(testWorkspaceId, 'https://example.com/anything');

      expect(matches.every((p) => p.name !== 'No Pattern Project')).toBe(true);
    });

    it('should return empty array for non-matching URL', async () => {
      const matches = await repo.matchByUrl(testWorkspaceId, 'https://other.com/page');

      expect(matches).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update project fields', async () => {
      const project = await repo.create({ workspaceId: testWorkspaceId, name: 'Test Project' });

      const updated = await repo.update(project.id, {
        name: 'Updated Project',
        description: 'New description',
      });

      expect(updated.name).toBe('Updated Project');
      expect(updated.description).toBe('New description');
      expect(updated.version).toBe(2);
    });
  });

  describe('count', () => {
    it('should return correct project count', async () => {
      await repo.create({ workspaceId: testWorkspaceId, name: 'Project 1' });
      await repo.create({ workspaceId: testWorkspaceId, name: 'Project 2' });

      const count = await repo.count(testWorkspaceId);

      expect(count).toBe(2);
    });

    it('should return 0 for workspace with no projects', async () => {
      const count = await repo.count(testWorkspaceId);

      expect(count).toBe(0);
    });
  });
});
