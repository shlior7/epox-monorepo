/**
 * Anton Workspace Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AntonWorkspaceRepository } from '../../../repositories/anton/workspace';
import { AntonWorkspaceMemberRepository } from '../../../repositories/anton/workspace-member';
import { AntonProjectRepository } from '../../../repositories/anton/project';
import { testDb } from '../../setup';
import { createTestUser, createTestId } from '../../helpers';

describe('AntonWorkspaceRepository', () => {
  let repo: AntonWorkspaceRepository;
  let memberRepo: AntonWorkspaceMemberRepository;
  let projectRepo: AntonProjectRepository;
  let testUserId: string;

  beforeEach(async () => {
    repo = new AntonWorkspaceRepository(testDb as any);
    memberRepo = new AntonWorkspaceMemberRepository(testDb as any);
    projectRepo = new AntonProjectRepository(testDb as any);

    const user = await createTestUser(testDb as any);
    testUserId = user.id;
  });

  describe('create', () => {
    it('should create a workspace with default free tier limits', async () => {
      const workspace = await repo.create({
        name: 'Test Workspace',
        ownerId: testUserId,
      });

      expect(workspace).toBeDefined();
      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe('Test Workspace');
      expect(workspace.ownerId).toBe(testUserId);
      expect(workspace.maxProjects).toBe(3);
      expect(workspace.maxMembers).toBe(5);
      expect(workspace.isPremium).toBe(false);
      expect(workspace.version).toBe(1);
    });

    it('should create a workspace with custom limits', async () => {
      const workspace = await repo.create({
        name: 'Premium Workspace',
        ownerId: testUserId,
        maxProjects: 10,
        maxMembers: 20,
      });

      expect(workspace.maxProjects).toBe(10);
      expect(workspace.maxMembers).toBe(20);
    });

    it('should automatically add owner as member with owner role', async () => {
      const workspace = await repo.create({
        name: 'Test Workspace',
        ownerId: testUserId,
      });

      const member = await memberRepo.getByWorkspaceAndUser(workspace.id, testUserId);

      expect(member).toBeDefined();
      expect(member?.role).toBe('owner');
    });
  });

  describe('listByUserId', () => {
    it('should return workspaces where user is a member', async () => {
      await repo.create({ name: 'Workspace A', ownerId: testUserId });
      await repo.create({ name: 'Workspace B', ownerId: testUserId });

      const workspaces = await repo.listByUserId(testUserId);

      expect(workspaces.length).toBe(2);
      expect(workspaces.map((w) => w.name).sort()).toEqual(['Workspace A', 'Workspace B']);
    });

    it('should return empty array for user with no workspaces', async () => {
      const anotherUser = await createTestUser(testDb as any);
      const workspaces = await repo.listByUserId(anotherUser.id);

      expect(workspaces).toEqual([]);
    });
  });

  describe('countProjects', () => {
    it('should return 0 for workspace with no projects', async () => {
      const workspace = await repo.create({ name: 'Test Workspace', ownerId: testUserId });
      const count = await repo.countProjects(workspace.id);

      expect(count).toBe(0);
    });

    it('should return correct project count', async () => {
      const workspace = await repo.create({ name: 'Test Workspace', ownerId: testUserId });

      await projectRepo.create({ workspaceId: workspace.id, name: 'Project 1' });
      await projectRepo.create({ workspaceId: workspace.id, name: 'Project 2' });

      const count = await repo.countProjects(workspace.id);

      expect(count).toBe(2);
    });
  });

  describe('countMembers', () => {
    it('should return 1 for workspace with only owner', async () => {
      const workspace = await repo.create({ name: 'Test Workspace', ownerId: testUserId });
      const count = await repo.countMembers(workspace.id);

      expect(count).toBe(1);
    });

    it('should return correct member count', async () => {
      const workspace = await repo.create({ name: 'Test Workspace', ownerId: testUserId });
      const user2 = await createTestUser(testDb as any);
      const user3 = await createTestUser(testDb as any);

      await memberRepo.create({ workspaceId: workspace.id, userId: user2.id });
      await memberRepo.create({ workspaceId: workspace.id, userId: user3.id });

      const count = await repo.countMembers(workspace.id);

      expect(count).toBe(3);
    });
  });

  describe('canAddProject', () => {
    it('should return true when under project limit', async () => {
      const workspace = await repo.create({ name: 'Test Workspace', ownerId: testUserId });

      const canAdd = await repo.canAddProject(workspace.id);

      expect(canAdd).toBe(true);
    });

    it('should return false when at project limit', async () => {
      const workspace = await repo.create({ name: 'Test Workspace', ownerId: testUserId, maxProjects: 2 });

      await projectRepo.create({ workspaceId: workspace.id, name: 'Project 1' });
      await projectRepo.create({ workspaceId: workspace.id, name: 'Project 2' });

      const canAdd = await repo.canAddProject(workspace.id);

      expect(canAdd).toBe(false);
    });
  });

  describe('canAddMember', () => {
    it('should return true when under member limit', async () => {
      const workspace = await repo.create({ name: 'Test Workspace', ownerId: testUserId, maxMembers: 2 });

      const canAdd = await repo.canAddMember(workspace.id);

      expect(canAdd).toBe(true);
    });

    it('should return false when at member limit', async () => {
      const workspace = await repo.create({ name: 'Test Workspace', ownerId: testUserId, maxMembers: 2 });
      const user2 = await createTestUser(testDb as any);

      await memberRepo.create({ workspaceId: workspace.id, userId: user2.id });

      const canAdd = await repo.canAddMember(workspace.id);

      expect(canAdd).toBe(false);
    });
  });

  describe('update', () => {
    it('should update workspace fields', async () => {
      const workspace = await repo.create({ name: 'Test Workspace', ownerId: testUserId });

      const updated = await repo.update(workspace.id, {
        name: 'Updated Workspace',
        maxProjects: 10,
      });

      expect(updated.name).toBe('Updated Workspace');
      expect(updated.maxProjects).toBe(10);
      expect(updated.version).toBe(2);
    });
  });

  describe('getById', () => {
    it('should return workspace by id', async () => {
      const created = await repo.create({ name: 'Test Workspace', ownerId: testUserId });
      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent id', async () => {
      const found = await repo.getById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete workspace', async () => {
      const workspace = await repo.create({ name: 'Test Workspace', ownerId: testUserId });

      await repo.delete(workspace.id);

      const found = await repo.getById(workspace.id);
      expect(found).toBeNull();
    });
  });
});
