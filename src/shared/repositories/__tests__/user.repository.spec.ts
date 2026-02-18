import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '@/shared/database/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prismaService: DeepMockProxy<PrismaService>;

  // Mock user data
  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashed_password',
    firstName: 'Test',
    lastName: 'User',
    phone: '13800138000',
    isActive: true,
    isVerified: false,
    avatar: null,
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockUserWithRoles = {
    ...mockUser,
    userRoles: [
      {
        id: 1,
        userId: mockUser.id,
        roleId: 1,
        createdAt: new Date('2024-01-01'),
        role: {
          id: 1,
          code: 'admin',
          name: '管理员',
          description: '系统管理员',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          rolePermissions: [
            {
              id: 1,
              roleId: 1,
              permissionId: 1,
              assignedAt: new Date('2024-01-01'),
              assignedBy: null,
              createdAt: new Date('2024-01-01'),
              permission: {
                id: 1,
                code: 'user:read',
                name: '读取用户',
                description: '读取用户信息',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
              },
            },
          ],
        },
      },
    ],
  };

  const mockUserWithRolesAndPermissions = {
    ...mockUser,
    userRoles: [
      {
        id: 1,
        userId: mockUser.id,
        roleId: 1,
        createdAt: new Date('2024-01-01'),
        role: {
          id: 1,
          code: 'admin',
          name: '管理员',
          description: '系统管理员',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          rolePermissions: [
            {
              id: 1,
              roleId: 1,
              permissionId: 1,
              assignedAt: new Date('2024-01-01'),
              assignedBy: null,
              createdAt: new Date('2024-01-01'),
              permission: {
                id: 1,
                code: 'user:read',
                name: '读取用户',
                description: '读取用户信息',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
              },
            },
          ],
        },
      },
    ],
  };

  beforeEach(() => {
    prismaService = mockDeep<PrismaService>();
    repository = new UserRepository(prismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被正确定义', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('成功: 应该返回用户', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await repository.findById('user-uuid-1');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1', deletedAt: null },
      });
    });

    it('未找到: 应该返回 null', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('事务: 应该使用传入的事务客户端', async () => {
      const mockTx = mockDeep<PrismaService>();
      mockTx.user.findFirst.mockResolvedValue(mockUser);

      const result = await repository.findById('user-uuid-1', mockTx);

      expect(result).toEqual(mockUser);
      expect(mockTx.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1', deletedAt: null },
      });
      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('成功: 应该返回用户', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: null },
      });
    });

    it('未找到: 应该返回 null', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('成功: 应该返回用户（含角色）', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUserWithRoles as any);

      const result = await repository.findByUsername('testuser');

      expect(result).toEqual(mockUserWithRoles);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { username: 'testuser', deletedAt: null },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    it('未找到: 应该返回 null', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByIdWithRoles', () => {
    it('成功: 应该返回用户（含角色和权限）', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUserWithRoles as any);

      const result = await repository.findByIdWithRoles('user-uuid-1');

      expect(result).toEqual(mockUserWithRoles);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1', deletedAt: null },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('未找到: 应该返回 null', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdWithRoles('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUsernameOrEmail', () => {
    it('成功: 应该返回用户（含角色和权限）', async () => {
      prismaService.user.findFirst.mockResolvedValue(
        mockUserWithRolesAndPermissions as any,
      );

      const result = await repository.findByUsernameOrEmail('test@example.com');

      expect(result).toEqual(mockUserWithRolesAndPermissions);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'test@example.com' }, { username: 'test@example.com' }],
          deletedAt: null,
        },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('通过用户名: 应该返回用户', async () => {
      prismaService.user.findFirst.mockResolvedValue(
        mockUserWithRolesAndPermissions as any,
      );

      const result = await repository.findByUsernameOrEmail('testuser');

      expect(result).toEqual(mockUserWithRolesAndPermissions);
    });

    it('未找到: 应该返回 null', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByUsernameOrEmail('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('成功: 应该创建并返回用户', async () => {
      const createData = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'hashed_password',
        nickname: 'New User',
      };
      const newUser = { ...mockUser, ...createData, id: 'new-user-uuid' };
      prismaService.user.create.mockResolvedValue(newUser);

      const result = await repository.create(createData);

      expect(result).toEqual(newUser);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('邮箱冲突: 应该抛出 ConflictException', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: { target: ['email'] },
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.create.mockRejectedValue(error);

      await expect(
        repository.create({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'password',
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        repository.create({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'password',
        }),
      ).rejects.toThrow('邮箱已存在');
    });

    it('用户名冲突: 应该抛出 ConflictException', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: { target: ['username'] },
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.create.mockRejectedValue(error);

      await expect(
        repository.create({
          email: 'new@example.com',
          username: 'existinguser',
          password: 'password',
        }),
      ).rejects.toThrow('用户名已存在');
    });

    it('手机号冲突: 应该抛出 ConflictException', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: { target: ['phone'] },
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.create.mockRejectedValue(error);

      await expect(
        repository.create({
          email: 'new@example.com',
          username: 'newuser',
          password: 'password',
          phone: '13800138001',
        }),
      ).rejects.toThrow('手机号已存在');
    });

    it('未知错误: 应该重新抛出', async () => {
      const error = new Error('Unknown error');
      prismaService.user.create.mockRejectedValue(error);

      await expect(
        repository.create({
          email: 'new@example.com',
          username: 'newuser',
          password: 'password',
        }),
      ).rejects.toThrow('Unknown error');
    });
  });

  describe('update', () => {
    it('成功: 应该更新并返回用户', async () => {
      const updateData = { firstName: 'Updated' };
      const updatedUser = { ...mockUser, ...updateData };
      prismaService.user.updateMany.mockResolvedValue({ count: 1 });
      prismaService.user.findUniqueOrThrow.mockResolvedValue(updatedUser);

      const result = await repository.update('user-uuid-1', updateData);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1', deletedAt: null },
        data: updateData,
      });
      expect(prismaService.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
      });
    });

    it('未找到: 应该抛出 NotFoundException', async () => {
      prismaService.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        repository.update('non-existent-id', { firstName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        repository.update('non-existent-id', { firstName: 'New Name' }),
      ).rejects.toThrow('用户不存在');
    });

    it('邮箱冲突: 应该抛出 ConflictException', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: { target: ['email'] },
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.updateMany.mockRejectedValue(error);

      await expect(
        repository.update('user-uuid-1', { email: 'existing@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('成功: 应该软删除并返回用户', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      prismaService.user.updateMany.mockResolvedValue({ count: 1 });
      prismaService.user.findUniqueOrThrow.mockResolvedValue(deletedUser);

      const result = await repository.delete('user-uuid-1');

      expect(result).toEqual(deletedUser);
      expect(prismaService.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1', deletedAt: null },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      });
    });

    it('未找到: 应该抛出 NotFoundException', async () => {
      prismaService.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );

      await expect(repository.delete('non-existent-id')).rejects.toThrow(
        '用户不存在',
      );
    });

    it('事务: 应该使用传入的事务客户端', async () => {
      const mockTx = mockDeep<PrismaService>();
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      mockTx.user.updateMany.mockResolvedValue({ count: 1 });
      mockTx.user.findUniqueOrThrow.mockResolvedValue(deletedUser);

      const result = await repository.delete('user-uuid-1', mockTx);

      expect(result).toEqual(deletedUser);
      expect(mockTx.user.updateMany).toHaveBeenCalled();
      expect(prismaService.user.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('成功: 应该返回所有未删除的用户', async () => {
      const mockUsers = [
        mockUserWithRoles,
        { ...mockUserWithRoles, id: 'user-uuid-2' },
      ];
      prismaService.user.findMany.mockResolvedValue(mockUsers as any);

      const result = await repository.findAll();

      expect(result).toEqual(mockUsers);
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('空列表: 应该返回空数组', async () => {
      prismaService.user.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('checkConflict', () => {
    it('无冲突: 应该返回空对象', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      const result = await repository.checkConflict({
        email: 'new@example.com',
      });

      expect(result).toEqual({});
    });

    it('邮箱冲突: 应该返回 { email: true }', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        email: 'test@example.com',
        username: 'other',
        phone: null,
      } as any);

      const result = await repository.checkConflict({
        email: 'test@example.com',
      });

      expect(result).toEqual({ email: true });
    });

    it('用户名冲突: 应该返回 { username: true }', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        email: 'other@example.com',
        username: 'testuser',
        phone: null,
      } as any);

      const result = await repository.checkConflict({ username: 'testuser' });

      expect(result).toEqual({ username: true });
    });

    it('手机号冲突: 应该返回 { phone: true }', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        email: 'other@example.com',
        username: 'other',
        phone: '13800138000',
      } as any);

      const result = await repository.checkConflict({ phone: '13800138000' });

      expect(result).toEqual({ phone: true });
    });

    it('多字段冲突: 应该返回多个冲突字段', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        email: 'test@example.com',
        username: 'testuser',
        phone: null,
      } as any);

      const result = await repository.checkConflict({
        email: 'test@example.com',
        username: 'testuser',
      });

      expect(result).toEqual({ email: true, username: true });
    });

    it('排除 ID: 应该在查询中排除指定用户', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await repository.checkConflict(
        { email: 'test@example.com' },
        'user-uuid-1',
      );

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'test@example.com' }],
          deletedAt: null,
          id: { not: 'user-uuid-1' },
        },
        select: {
          email: true,
          username: true,
          phone: true,
        },
      });
    });

    it('无检查字段: 应该返回空对象', async () => {
      const result = await repository.checkConflict({});

      expect(result).toEqual({});
      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('成功: 应该返回用户数量', async () => {
      prismaService.user.count.mockResolvedValue(10);

      const result = await repository.count();

      expect(result).toBe(10);
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('带条件: 应该返回符合条件的用户数量', async () => {
      prismaService.user.count.mockResolvedValue(5);

      const result = await repository.count({ isActive: true });

      expect(result).toBe(5);
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: { isActive: true, deletedAt: null },
      });
    });
  });

  describe('findManyPaginated', () => {
    it('成功: 应该返回分页的用户列表', async () => {
      const mockUsers = [mockUser];
      prismaService.user.findMany.mockResolvedValue(mockUsers as any);

      const result = await repository.findManyPaginated({
        skip: 0,
        take: 10,
      });

      expect(result).toEqual(mockUsers);
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 0,
        take: 10,
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: undefined,
      });
    });

    it('带条件和排序: 应该正确应用条件', async () => {
      prismaService.user.findMany.mockResolvedValue([]);

      await repository.findManyPaginated({
        where: { isActive: true },
        skip: 10,
        take: 20,
        orderBy: { createdAt: 'asc' },
      });

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true, deletedAt: null },
        skip: 10,
        take: 20,
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('handleKnownError (通过 create/update 间接测试)', () => {
    it('P2025 错误: 应该抛出 NotFoundException', async () => {
      const error = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      prismaService.user.create.mockRejectedValue(error);

      await expect(
        repository.create({
          email: 'new@example.com',
          username: 'newuser',
          password: 'password',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('P2002 无 target 信息: 应该抛出默认邮箱冲突', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: {},
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.create.mockRejectedValue(error);

      await expect(
        repository.create({
          email: 'new@example.com',
          username: 'newuser',
          password: 'password',
        }),
      ).rejects.toThrow('邮箱已存在');
    });

    it('P2002 target 为字符串: 应该正确处理', async () => {
      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          meta: { target: 'username' },
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.create.mockRejectedValue(error);

      await expect(
        repository.create({
          email: 'new@example.com',
          username: 'existinguser',
          password: 'password',
        }),
      ).rejects.toThrow('用户名已存在');
    });
  });
});
