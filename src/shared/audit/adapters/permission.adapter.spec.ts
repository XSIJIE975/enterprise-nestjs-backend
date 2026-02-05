/**
 * PermissionAdapter 单元测试
 */

import { PermissionAdapter } from './permission.adapter';
import { AuditResource } from '@/common/constants/audit.constants';

describe('PermissionAdapter', () => {
  let adapter: PermissionAdapter;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      permission: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    adapter = new PermissionAdapter(mockPrisma);
  });

  describe('resource getter', () => {
    it('should return AuditResource.permission', () => {
      expect(adapter.resource).toBe(AuditResource.permission);
    });
  });

  describe('findById', () => {
    it('should return permission data when found', async () => {
      const permissionData = {
        id: 1,
        code: 'create_user',
        name: 'Create User',
        description: 'Permission to create user',
        resource: 'user',
        action: 'create',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.permission.findUnique.mockResolvedValue(permissionData);

      const result = await adapter.findById(1);

      expect(result).toEqual(permissionData);
      expect(mockPrisma.permission.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          resource: true,
          action: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return null when permission not found', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);

      const result = await adapter.findById(999);

      expect(result).toBeNull();
    });

    it('should convert string id to number', async () => {
      const permissionData = {
        id: 1,
        code: 'delete_user',
        name: 'Delete User',
        description: 'Permission to delete user',
        resource: 'user',
        action: 'delete',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.permission.findUnique.mockResolvedValue(permissionData);

      await adapter.findById('1');

      expect(mockPrisma.permission.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          resource: true,
          action: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('findByIds', () => {
    it('should return empty array when ids array is empty', async () => {
      const result = await adapter.findByIds([]);

      expect(result).toEqual([]);
      expect(mockPrisma.permission.findMany).not.toHaveBeenCalled();
    });

    it('should batch query multiple permissions', async () => {
      const permissionsData = [
        {
          id: 1,
          code: 'create_user',
          name: 'Create User',
          description: 'Permission to create user',
          resource: 'user',
          action: 'create',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          code: 'delete_user',
          name: 'Delete User',
          description: 'Permission to delete user',
          resource: 'user',
          action: 'delete',
          isActive: true,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.permission.findMany.mockResolvedValue(permissionsData);

      const result = await adapter.findByIds([1, 2]);

      expect(result).toEqual(permissionsData);
      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2] },
        },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          resource: true,
          action: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should convert string ids to numbers', async () => {
      const permissionsData = [];

      mockPrisma.permission.findMany.mockResolvedValue(permissionsData);

      await adapter.findByIds(['1', '2', '3']);

      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2, 3] },
        },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          resource: true,
          action: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return empty array when no permissions found', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([]);

      const result = await adapter.findByIds([999, 1000]);

      expect(result).toEqual([]);
    });

    it('should handle mixed string and number ids', async () => {
      const permissionsData = [
        {
          id: 1,
          code: 'create_user',
          name: 'Create User',
          description: 'Permission to create user',
          resource: 'user',
          action: 'create',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      mockPrisma.permission.findMany.mockResolvedValue(permissionsData);

      await adapter.findByIds([1, '2', 3]);

      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2, 3] },
        },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          resource: true,
          action: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });
});
