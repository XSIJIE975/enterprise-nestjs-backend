/**
 * RoleAdapter 单元测试
 * 测试 Role 资源适配器的所有功能：findById、findByIds、权限查询、空数据处理
 */

import { RoleAdapter } from './role.adapter';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditResource } from '@/common/constants/audit.constants';

describe('RoleAdapter', () => {
  let adapter: RoleAdapter;
  let mockPrisma: any;

  beforeEach(() => {
    // 创建 PrismaService 的 mock
    mockPrisma = {
      role: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      rolePermission: {
        findMany: jest.fn(),
      },
    };

    adapter = new RoleAdapter(mockPrisma as PrismaService);
  });

  describe('resource getter', () => {
    it('应该返回 AuditResource.role', () => {
      expect(adapter.resource).toBe(AuditResource.role);
    });
  });

  describe('findById', () => {
    it('应该返回单个角色及其权限ID', async () => {
      const mockRole = {
        id: 1,
        name: 'Admin',
        code: 'ADMIN',
        description: 'System Administrator',
        isActive: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-15'),
      };

      const mockPermissions = [
        { permissionId: 1 },
        { permissionId: 2 },
        { permissionId: 3 },
      ];

      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce(mockPermissions);

      const result = await adapter.findById(1);

      expect(result).toEqual({
        ...mockRole,
        permissionIds: [1, 2, 3],
      });
    });

    it('应该处理权限ID为空的情况', async () => {
      const mockRole = {
        id: 2,
        name: 'Guest',
        code: 'GUEST',
        description: 'Guest User',
        isActive: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-15'),
      };

      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce([]);

      const result = await adapter.findById(2);

      expect(result).toEqual({
        ...mockRole,
        permissionIds: [],
      });
    });

    it('应该当角色不存在时返回 null', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce(null);

      const result = await adapter.findById(999);

      expect(result).toBeNull();
      expect(mockPrisma.rolePermission.findMany).not.toHaveBeenCalled();
    });

    it('应该将字符串ID转换为数字', async () => {
      const mockRole = {
        id: 5,
        name: 'User',
        code: 'USER',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce([
        { permissionId: 1 },
      ]);

      await adapter.findById('5');

      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: 5 },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('应该包含多个权限ID', async () => {
      const mockRole = {
        id: 3,
        name: 'Manager',
        code: 'MANAGER',
        description: 'Manager Role',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPermissions = [
        { permissionId: 10 },
        { permissionId: 20 },
        { permissionId: 30 },
        { permissionId: 40 },
      ];

      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce(mockPermissions);

      const result = await adapter.findById(3);

      expect(result.permissionIds).toEqual([10, 20, 30, 40]);
    });
  });

  describe('findByIds', () => {
    it('应该返回多个角色的数组', async () => {
      const mockRoles = [
        {
          id: 1,
          name: 'Admin',
          code: 'ADMIN',
          description: 'Administrator',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'User',
          code: 'USER',
          description: 'Regular User',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockPermissions = [
        { roleId: 1, permissionId: 1 },
        { roleId: 1, permissionId: 2 },
        { roleId: 2, permissionId: 3 },
      ];

      mockPrisma.role.findMany.mockResolvedValueOnce(mockRoles);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce(mockPermissions);

      const result = await adapter.findByIds([1, 2]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...mockRoles[0],
        permissionIds: [1, 2],
      });
      expect(result[1]).toEqual({
        ...mockRoles[1],
        permissionIds: [3],
      });
    });

    it('应该处理空ID数组', async () => {
      const result = await adapter.findByIds([]);

      expect(result).toEqual([]);
      expect(mockPrisma.role.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.rolePermission.findMany).not.toHaveBeenCalled();
    });

    it('应该返回空数组当没有角色匹配时', async () => {
      mockPrisma.role.findMany.mockResolvedValueOnce([]);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce([]);

      const result = await adapter.findByIds([999, 1000]);

      expect(result).toEqual([]);
    });

    it('应该处理只有一个ID的情况', async () => {
      const mockRole = [
        {
          id: 1,
          name: 'Admin',
          code: 'ADMIN',
          description: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.role.findMany.mockResolvedValueOnce(mockRole);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce([]);

      const result = await adapter.findByIds([1]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].permissionIds).toEqual([]);
    });

    it('应该处理混合的有权限和无权限的角色', async () => {
      const mockRoles = [
        {
          id: 1,
          name: 'Admin',
          code: 'ADMIN',
          description: 'Admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'Guest',
          code: 'GUEST',
          description: 'Guest',
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockPermissions = [{ roleId: 1, permissionId: 1 }];

      mockPrisma.role.findMany.mockResolvedValueOnce(mockRoles);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce(mockPermissions);

      const result = await adapter.findByIds([1, 2]);

      expect(result[0].permissionIds).toEqual([1]);
      expect(result[1].permissionIds).toEqual([]);
    });

    it('应该将字符串IDs转换为数字', async () => {
      const mockRoles = [
        {
          id: 5,
          name: 'Role5',
          code: 'ROLE5',
          description: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.role.findMany.mockResolvedValueOnce(mockRoles);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce([]);

      await adapter.findByIds(['5', '10', '15']);

      expect(mockPrisma.role.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: [5, 10, 15] },
        },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('应该直接从rolePermission查询权限', async () => {
      const mockRoles = [
        {
          id: 1,
          name: 'Admin',
          code: 'ADMIN',
          description: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.role.findMany.mockResolvedValueOnce(mockRoles);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce([
        { roleId: 1, permissionId: 1 },
        { roleId: 1, permissionId: 2 },
      ]);

      await adapter.findByIds([1]);

      expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledWith({
        where: {
          roleId: { in: [1] },
        },
        select: {
          roleId: true,
          permissionId: true,
        },
      });
    });
  });

  describe('assignPermissions 场景验证', () => {
    it('应该返回包含 permissionIds 的数据以支持 assignPermissions oldData', async () => {
      const mockRole = {
        id: 1,
        name: 'Admin',
        code: 'ADMIN',
        description: 'Administrator',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPermissions = [
        { permissionId: 101 },
        { permissionId: 102 },
        { permissionId: 103 },
      ];

      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce(mockPermissions);

      const result = await adapter.findById(1);

      // assignPermissions 需要的 oldData 结构
      expect(result).toHaveProperty('permissionIds');
      expect(result.permissionIds).toEqual([101, 102, 103]);
    });

    it('应该支持权限变化对比（oldData中包含先前的权限ID）', async () => {
      // 模拟老数据中有权限 [1, 2, 3]，新数据要改为 [2, 3, 4]
      const mockRole = {
        id: 1,
        name: 'Admin',
        code: 'ADMIN',
        description: 'Administrator',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce([
        { permissionId: 1 },
        { permissionId: 2 },
        { permissionId: 3 },
      ]);

      const result = await adapter.findById(1);

      // oldData 包含旧权限列表，用于对比变化
      expect(result.permissionIds).toEqual([1, 2, 3]);
    });
  });

  describe('边界情况', () => {
    it('应该处理 description 为 null 的情况', async () => {
      const mockRole = {
        id: 1,
        name: 'TestRole',
        code: 'TEST',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce([]);

      const result = await adapter.findById(1);

      expect(result.description).toBeNull();
    });

    it('应该处理非常大数字的ID', async () => {
      const mockRole = {
        id: 2147483647, // 32位整数最大值
        name: 'MaxRole',
        code: 'MAX',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce([]);

      const result = await adapter.findById(2147483647);

      expect(result.id).toBe(2147483647);
    });

    it('应该处理大量权限ID', async () => {
      const mockRole = {
        id: 1,
        name: 'SuperAdmin',
        code: 'SUPER_ADMIN',
        description: 'Super Administrator',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const largePermissionList = Array.from({ length: 100 }, (_, i) => ({
        permissionId: i + 1,
      }));

      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce(
        largePermissionList,
      );

      const result = await adapter.findById(1);

      expect(result.permissionIds).toHaveLength(100);
      expect(result.permissionIds[0]).toBe(1);
      expect(result.permissionIds[99]).toBe(100);
    });

    it('应该处理批量查询中部分角色无权限的情况', async () => {
      const mockRoles = [
        {
          id: 1,
          name: 'Role1',
          code: 'ROLE1',
          description: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'Role2',
          code: 'ROLE2',
          description: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          name: 'Role3',
          code: 'ROLE3',
          description: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockPermissions = [
        { roleId: 1, permissionId: 1 },
        { roleId: 3, permissionId: 5 },
        { roleId: 3, permissionId: 6 },
      ];

      mockPrisma.role.findMany.mockResolvedValueOnce(mockRoles);
      mockPrisma.rolePermission.findMany.mockResolvedValueOnce(mockPermissions);

      const result = await adapter.findByIds([1, 2, 3]);

      expect(result[0].permissionIds).toEqual([1]);
      expect(result[1].permissionIds).toEqual([]);
      expect(result[2].permissionIds).toEqual([5, 6]);
    });
  });
});
