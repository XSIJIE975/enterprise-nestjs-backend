import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '@/shared/database/prisma.service';
import { RoleRepository } from '../role.repository';

describe('RoleRepository', () => {
  let repository: RoleRepository;
  let prismaService: DeepMockProxy<PrismaService>;

  // Mock role data
  const mockRole = {
    id: 1,
    name: '管理员',
    code: 'admin',
    description: '系统管理员',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPermission = {
    id: 1,
    name: '读取用户',
    code: 'user:read',
    resource: 'user',
    action: 'read',
    description: '读取用户信息',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRoleWithPermissions = {
    ...mockRole,
    rolePermissions: [
      {
        id: 1,
        roleId: 1,
        permissionId: 1,
        assignedAt: new Date('2024-01-01'),
        assignedBy: null,
        permission: mockPermission,
      },
    ],
  };

  const mockRolePermission = {
    id: 1,
    roleId: 1,
    permissionId: 1,
    assignedAt: new Date('2024-01-01'),
    assignedBy: null,
  };

  beforeEach(() => {
    prismaService = mockDeep<PrismaService>();
    repository = new RoleRepository(prismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被正确定义', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('成功: 应该返回角色', async () => {
      prismaService.role.findUnique.mockResolvedValue(mockRole);

      const result = await repository.findById(1);

      expect(result).toEqual(mockRole);
      expect(prismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('未找到: 应该返回 null', async () => {
      prismaService.role.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('事务: 应该使用传入的事务客户端', async () => {
      const mockTx = mockDeep<PrismaService>();
      mockTx.role.findUnique.mockResolvedValue(mockRole);

      const result = await repository.findById(1, mockTx);

      expect(result).toEqual(mockRole);
      expect(mockTx.role.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.role.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findByCode', () => {
    it('成功: 应该返回角色', async () => {
      prismaService.role.findUnique.mockResolvedValue(mockRole);

      const result = await repository.findByCode('admin');

      expect(result).toEqual(mockRole);
      expect(prismaService.role.findUnique).toHaveBeenCalledWith({
        where: { code: 'admin' },
      });
    });

    it('未找到: 应该返回 null', async () => {
      prismaService.role.findUnique.mockResolvedValue(null);

      const result = await repository.findByCode('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('成功: 应该返回所有角色（含权限）', async () => {
      const mockRoles = [mockRoleWithPermissions];
      prismaService.role.findMany.mockResolvedValue(mockRoles as any);

      const result = await repository.findAll();

      expect(result).toEqual(mockRoles);
      expect(prismaService.role.findMany).toHaveBeenCalledWith({
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('空列表: 应该返回空数组', async () => {
      prismaService.role.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('成功: 应该创建并返回角色', async () => {
      const createData = {
        name: '新角色',
        code: 'new_role',
        description: '新建的角色',
      };
      const newRole = { ...mockRole, ...createData, id: 2 };
      prismaService.role.create.mockResolvedValue(newRole);

      const result = await repository.create(createData);

      expect(result).toEqual(newRole);
      expect(prismaService.role.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('代码冲突: 应该抛出 ConflictException', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: { target: ['code'] },
          clientVersion: '5.0.0',
        },
      );
      prismaService.role.create.mockRejectedValue(error);

      await expect(
        repository.create({
          name: '新角色',
          code: 'admin',
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        repository.create({
          name: '新角色',
          code: 'admin',
        }),
      ).rejects.toThrow('角色代码已存在');
    });

    it('名称冲突: 应该抛出 ConflictException', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: { target: ['name'] },
          clientVersion: '5.0.0',
        },
      );
      prismaService.role.create.mockRejectedValue(error);

      await expect(
        repository.create({
          name: '管理员',
          code: 'new_role',
        }),
      ).rejects.toThrow('角色名称已存在');
    });

    it('未知唯一约束冲突: 应该抛出默认冲突异常', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: {},
          clientVersion: '5.0.0',
        },
      );
      prismaService.role.create.mockRejectedValue(error);

      await expect(
        repository.create({
          name: '新角色',
          code: 'new_role',
        }),
      ).rejects.toThrow('角色唯一字段冲突');
    });

    it('未知错误: 应该重新抛出', async () => {
      const error = new Error('Unknown error');
      prismaService.role.create.mockRejectedValue(error);

      await expect(
        repository.create({
          name: '新角色',
          code: 'new_role',
        }),
      ).rejects.toThrow('Unknown error');
    });
  });

  describe('update', () => {
    it('成功: 应该更新并返回角色', async () => {
      const updateData = { description: '更新的描述' };
      const updatedRole = { ...mockRole, ...updateData };
      prismaService.role.update.mockResolvedValue(updatedRole);

      const result = await repository.update(1, updateData);

      expect(result).toEqual(updatedRole);
      expect(prismaService.role.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
    });

    it('未找到: 应该抛出 NotFoundException', async () => {
      const error = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      prismaService.role.update.mockRejectedValue(error);

      await expect(
        repository.update(999, { description: '更新' }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        repository.update(999, { description: '更新' }),
      ).rejects.toThrow('角色不存在');
    });

    it('代码冲突: 应该抛出 ConflictException', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: { target: ['code'] },
          clientVersion: '5.0.0',
        },
      );
      prismaService.role.update.mockRejectedValue(error);

      await expect(
        repository.update(1, { code: 'existing_code' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('成功: 应该删除并返回角色', async () => {
      prismaService.role.delete.mockResolvedValue(mockRole);

      const result = await repository.delete(1);

      expect(result).toEqual(mockRole);
      expect(prismaService.role.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('未找到: 应该抛出 NotFoundException', async () => {
      const error = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      prismaService.role.delete.mockRejectedValue(error);

      await expect(repository.delete(999)).rejects.toThrow(NotFoundException);

      await expect(repository.delete(999)).rejects.toThrow('角色不存在');
    });

    it('事务: 应该使用传入的事务客户端', async () => {
      const mockTx = mockDeep<PrismaService>();
      mockTx.role.delete.mockResolvedValue(mockRole);

      const result = await repository.delete(1, mockTx);

      expect(result).toEqual(mockRole);
      expect(mockTx.role.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.role.delete).not.toHaveBeenCalled();
    });
  });

  describe('assignPermissions', () => {
    it('成功: 应该分配权限并返回数量', async () => {
      prismaService.rolePermission.createMany.mockResolvedValue({ count: 2 });

      const result = await repository.assignPermissions(1, [1, 2]);

      expect(result).toEqual({ count: 2 });
      expect(prismaService.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 1, permissionId: 1 },
          { roleId: 1, permissionId: 2 },
        ],
        skipDuplicates: true,
      });
    });

    it('空数组: 应该返回 count: 0', async () => {
      const result = await repository.assignPermissions(1, []);

      expect(result).toEqual({ count: 0 });
      expect(prismaService.rolePermission.createMany).not.toHaveBeenCalled();
    });

    it('去重: 应该自动去重权限 ID', async () => {
      prismaService.rolePermission.createMany.mockResolvedValue({ count: 1 });

      await repository.assignPermissions(1, [1, 1, 1]);

      expect(prismaService.rolePermission.createMany).toHaveBeenCalledWith({
        data: [{ roleId: 1, permissionId: 1 }],
        skipDuplicates: true,
      });
    });

    it('事务: 应该使用传入的事务客户端', async () => {
      const mockTx = mockDeep<PrismaService>();
      mockTx.rolePermission.createMany.mockResolvedValue({ count: 1 });

      await repository.assignPermissions(1, [1], mockTx);

      expect(mockTx.rolePermission.createMany).toHaveBeenCalled();
      expect(prismaService.rolePermission.createMany).not.toHaveBeenCalled();
    });
  });

  describe('removePermissions', () => {
    it('成功: 应该移除权限并返回数量', async () => {
      prismaService.rolePermission.deleteMany.mockResolvedValue({ count: 2 });

      const result = await repository.removePermissions(1, [1, 2]);

      expect(result).toEqual({ count: 2 });
      expect(prismaService.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: {
          roleId: 1,
          permissionId: { in: [1, 2] },
        },
      });
    });

    it('空数组: 应该返回 count: 0', async () => {
      const result = await repository.removePermissions(1, []);

      expect(result).toEqual({ count: 0 });
      expect(prismaService.rolePermission.deleteMany).not.toHaveBeenCalled();
    });

    it('去重: 应该自动去重权限 ID', async () => {
      prismaService.rolePermission.deleteMany.mockResolvedValue({ count: 1 });

      await repository.removePermissions(1, [1, 1, 1]);

      expect(prismaService.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: {
          roleId: 1,
          permissionId: { in: [1] },
        },
      });
    });
  });

  describe('findRolePermissions', () => {
    it('成功: 应该返回角色的权限关联', async () => {
      const mockRolePermissions = [mockRolePermission];
      prismaService.rolePermission.findMany.mockResolvedValue(
        mockRolePermissions,
      );

      const result = await repository.findRolePermissions(1);

      expect(result).toEqual(mockRolePermissions);
      expect(prismaService.rolePermission.findMany).toHaveBeenCalledWith({
        where: { roleId: 1 },
      });
    });

    it('空列表: 应该返回空数组', async () => {
      prismaService.rolePermission.findMany.mockResolvedValue([]);

      const result = await repository.findRolePermissions(999);

      expect(result).toEqual([]);
    });
  });

  describe('handleKnownError (通过各方法间接测试)', () => {
    it('P2002 target 为字符串: 应该正确处理', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: { target: 'code' },
          clientVersion: '5.0.0',
        },
      );
      prismaService.role.create.mockRejectedValue(error);

      await expect(
        repository.create({
          name: '新角色',
          code: 'existing_code',
        }),
      ).rejects.toThrow('角色代码已存在');
    });

    it('Prisma 非已知错误: 应该原样抛出', async () => {
      const error = new PrismaClientKnownRequestError('Unknown Prisma error', {
        code: 'P9999',
        clientVersion: '5.0.0',
      });
      prismaService.role.create.mockRejectedValue(error);

      await expect(
        repository.create({
          name: '新角色',
          code: 'new_role',
        }),
      ).rejects.toThrow(error);
    });
  });
});
