import { Test, TestingModule } from '@nestjs/testing';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/enums/error-codes.enum';
import { ErrorMessages } from '@/common/enums/error-codes.enum';
import { PrismaService } from '@/shared/database/prisma.service';
import { RbacCacheService } from '@/shared/cache';
import { RolesService } from './roles.service';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('角色服务', () => {
  let service: RolesService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let rbacCacheService: RbacCacheService;

  const mockPrismaService = {
    role: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    userRole: {
      count: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(callback => callback(mockPrismaService)),
  };

  const mockRbacCacheService = {
    invalidateRoleCache: jest.fn(),
    invalidateUserCache: jest.fn(),
    getRolePermissions: jest.fn(),
    setRolePermissions: jest.fn(),
    flushAllRbacCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RbacCacheService,
          useValue: mockRbacCacheService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    prismaService = module.get<PrismaService>(PrismaService);
    rbacCacheService = module.get<RbacCacheService>(RbacCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('创建角色', () => {
    it('应该成功创建角色', async () => {
      const createRoleDto = {
        name: 'Test Role',
        code: 'test_role',
        description: 'Test role description',
      };

      const expectedRole = {
        id: 1,
        ...createRoleDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.create.mockResolvedValue(expectedRole);

      const result = await service.create(createRoleDto);

      expect(mockPrismaService.role.create).toHaveBeenCalledWith({
        data: {
          name: createRoleDto.name,
          code: createRoleDto.code,
          description: createRoleDto.description,
          isActive: true,
        },
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
      expect(result).toEqual(expectedRole);
    });

    it('应该在角色名称已存在时抛出错误', async () => {
      const createRoleDto = {
        name: 'Existing Role',
        code: 'new_code',
        description: 'Test description',
      };

      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.x.x',
          meta: { target: ['name'] },
        },
      );

      mockPrismaService.role.create.mockRejectedValue(error);

      await expect(service.create(createRoleDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NAME_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.ROLE_NAME_ALREADY_EXISTS],
        ),
      );
    });

    it('应该在角色代码已存在时抛出错误', async () => {
      const createRoleDto = {
        name: 'New Role',
        code: 'existing_code',
        description: 'Test description',
      };

      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.x.x',
          meta: { target: ['code'] },
        },
      );

      mockPrismaService.role.create.mockRejectedValue(error);

      await expect(service.create(createRoleDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
        ),
      );
    });
  });

  describe('获取所有角色', () => {
    it('应该返回所有角色', async () => {
      const roles = [
        {
          id: 1,
          name: 'Admin',
          code: 'admin',
          description: 'Administrator role',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(roles);

      const result = await service.findAll();

      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(roles);
    });
  });

  describe('获取单个角色', () => {
    it('应该根据ID返回角色', async () => {
      const role = {
        id: 1,
        name: 'Admin',
        code: 'admin',
        description: 'Administrator role',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(role);

      const result = await service.findOne(1);

      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(role);
    });

    it('应该在角色不存在时抛出错误', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new BusinessException(ErrorCode.ROLE_NOT_FOUND),
      );
    });

    it('应该在包含权限信息时返回角色及其权限', async () => {
      const roleWithPermissions = {
        id: 1,
        name: 'Admin',
        code: 'admin',
        description: 'Administrator role',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [
          {
            permission: {
              id: 1,
              name: '用户管理',
              code: 'user:manage',
              resource: 'user',
              action: 'manage',
              description: '用户管理权限',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      mockPrismaService.role.findUnique.mockResolvedValue(roleWithPermissions);

      const result = await service.findOne(1, true);

      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });
      expect(result.permissions).toBeDefined();
      expect(result.permissions).toHaveLength(1);
    });
  });

  describe('分页查询角色', () => {
    it('应该返回分页的角色列表', async () => {
      const roles = [
        {
          id: 1,
          name: 'Admin',
          code: 'admin',
          description: 'Administrator role',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const query = {
        page: 1,
        pageSize: 10,
      };

      mockPrismaService.role.count.mockResolvedValue(1);
      mockPrismaService.role.findMany.mockResolvedValue(roles);

      const result = await service.findAllPaginated(query);

      expect(mockPrismaService.role.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual(roles);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(10);
    });

    it('应该支持关键词搜索', async () => {
      const roles = [
        {
          id: 1,
          name: 'Admin Role',
          code: 'admin',
          description: 'Administrator role',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const query = {
        page: 1,
        pageSize: 10,
        keyword: 'Admin',
      };

      mockPrismaService.role.count.mockResolvedValue(1);
      mockPrismaService.role.findMany.mockResolvedValue(roles);

      await service.findAllPaginated(query);

      expect(mockPrismaService.role.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'Admin' } },
            { code: { contains: 'Admin' } },
            { description: { contains: 'Admin' } },
          ],
        },
      });
    });

    it('应该支持状态过滤', async () => {
      const roles = [
        {
          id: 1,
          name: 'Active Role',
          code: 'active',
          description: 'Active role',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const query = {
        page: 1,
        pageSize: 10,
        isActive: true,
      };

      mockPrismaService.role.count.mockResolvedValue(1);
      mockPrismaService.role.findMany.mockResolvedValue(roles);

      await service.findAllPaginated(query);

      expect(mockPrismaService.role.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('应该支持自定义排序', async () => {
      const roles = [
        {
          id: 1,
          name: 'Role A',
          code: 'role_a',
          description: 'Role A',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const query = {
        page: 1,
        pageSize: 10,
        sortBy: 'name',
        order: 'asc' as const,
      };

      mockPrismaService.role.count.mockResolvedValue(1);
      mockPrismaService.role.findMany.mockResolvedValue(roles);

      await service.findAllPaginated(query);

      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' },
      });
    });

    it('应该使用默认参数进行分页查询', async () => {
      const roles = [
        {
          id: 1,
          name: 'Default Role',
          code: 'default',
          description: 'Default role',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const query = {}; // 使用所有默认参数

      mockPrismaService.role.count.mockResolvedValue(1);
      mockPrismaService.role.findMany.mockResolvedValue(roles);

      const result = await service.findAllPaginated(query);

      expect(mockPrismaService.role.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasPreviousPage).toBe(false);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });

  describe('根据代码查询角色', () => {
    it('应该根据代码返回角色', async () => {
      const role = {
        id: 1,
        name: 'Admin',
        code: 'admin',
        description: 'Administrator role',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(role);

      const result = await service.findByCode('admin');

      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { code: 'admin' },
      });
      expect(result).toEqual(role);
    });

    it('应该在角色不存在时抛出错误', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.findByCode('nonexistent')).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NOT_FOUND,
          ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
        ),
      );
    });
  });

  describe('更新角色', () => {
    it('应该成功更新角色', async () => {
      const updateRoleDto = {
        name: 'Updated Role',
        code: 'updated_code',
        description: 'Updated description',
      };

      const existingRole = {
        id: 1,
        name: 'Old Role',
        code: 'old_code',
        description: 'Old description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedRole = {
        ...existingRole,
        ...updateRoleDto,
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique
        .mockResolvedValueOnce(existingRole) // First call: find existing role
        .mockResolvedValueOnce(null) // Second call: check name conflict
        .mockResolvedValueOnce(null); // Third call: check code conflict (no conflict)
      mockPrismaService.role.update.mockResolvedValue(updatedRole);

      const result = await service.update(1, updateRoleDto);

      expect(result).toEqual(updatedRole);
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('应该在角色不存在时抛出错误', async () => {
      const updateRoleDto = {
        name: 'Updated Role',
        description: 'Updated description',
      };

      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateRoleDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NOT_FOUND,
          ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
        ),
      );
    });

    it('应该在更新角色名称时名称已存在抛出错误', async () => {
      // Reset mocks to ensure no leftover state
      mockPrismaService.role.findUnique.mockReset();
      mockPrismaService.role.update.mockReset();

      const updateRoleDto = {
        name: 'Existing Name',
      };

      const existingRole = {
        id: 1,
        name: 'Old Name',
        code: 'old_code',
        description: 'Old description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(existingRole);

      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.x.x',
          meta: { target: ['name'] },
        },
      );
      mockPrismaService.role.update.mockRejectedValue(error);

      await expect(service.update(1, updateRoleDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NAME_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.ROLE_NAME_ALREADY_EXISTS],
        ),
      );
    });

    it('应该在更新角色代码时代码已存在抛出错误', async () => {
      // Reset mocks
      mockPrismaService.role.findUnique.mockClear();
      mockPrismaService.role.update.mockClear();
      mockRbacCacheService.flushAllRbacCache.mockClear();

      const updateRoleDto = {
        code: 'existing_code',
      };

      const existingRole = {
        id: 1,
        name: 'Old Name',
        code: 'old_code',
        description: 'Old description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(existingRole);

      const error = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.x.x',
          meta: { target: ['code'] },
        },
      );
      mockPrismaService.role.update.mockRejectedValue(error);

      await expect(service.update(1, updateRoleDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
        ),
      );
    });

    it('应该在更新角色代码与当前代码相同时不进行冲突检查', async () => {
      // Reset mocks
      mockPrismaService.role.findUnique.mockClear();
      mockPrismaService.role.update.mockClear();
      mockRbacCacheService.flushAllRbacCache.mockClear();

      const updateRoleDto = {
        name: 'Updated Name',
        code: 'old_code', // Same as current code
        description: 'Updated description',
      };

      const existingRole = {
        id: 1,
        name: 'Old Name',
        code: 'old_code',
        description: 'Old description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedRole = {
        ...existingRole,
        ...updateRoleDto,
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(existingRole);
      // No extra findUnique call because check is implicit in update
      mockPrismaService.role.update.mockResolvedValue(updatedRole);

      const result = await service.update(1, updateRoleDto);

      expect(result).toEqual(updatedRole);
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
      // Should only call findUnique once to check existence, conflict check is now implicit in update
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('删除角色', () => {
    it('应该成功删除角色', async () => {
      const role = {
        id: 1,
        name: 'Test Role',
        code: 'test_role',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(role);
      mockPrismaService.userRole.count.mockResolvedValue(0);
      mockPrismaService.role.delete.mockResolvedValue(role);

      await service.remove(1);

      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('应该在角色正在使用时抛出错误', async () => {
      const role = {
        id: 1,
        name: 'Test Role',
        code: 'test_role',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(role);
      mockPrismaService.userRole.count.mockResolvedValue(1); // Role is in use

      await expect(service.remove(1)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_IN_USE,
          ErrorMessages[ErrorCode.ROLE_IN_USE],
        ),
      );
    });

    it('应该在角色不存在时抛出错误', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NOT_FOUND,
          ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
        ),
      );
    });
  });

  describe('更新角色状态', () => {
    it('应该成功更新角色状态', async () => {
      const existingRole = {
        id: 1,
        name: 'Test Role',
        code: 'test_role',
        description: 'Test description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedRole = {
        ...existingRole,
        isActive: false,
        updatedAt: new Date(),
      };

      mockPrismaService.role.findUnique.mockResolvedValue(existingRole);
      mockPrismaService.role.update.mockResolvedValue(updatedRole);

      const result = await service.updateRoleStatus(1, false);

      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.role.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
      expect(result).toEqual(updatedRole);
    });

    it('应该在角色不存在时抛出错误', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.updateRoleStatus(999, true)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NOT_FOUND,
          ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
        ),
      );
    });
  });

  describe('分配权限', () => {
    it('应该成功为角色分配权限', async () => {
      const role = {
        id: 1,
        name: 'Test Role',
        code: 'test_role',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const assignPermissionsDto = {
        permissionIds: [1, 2, 3],
      };

      const permissions = [
        { id: 1, code: 'perm1', name: 'Permission 1' },
        { id: 2, code: 'perm2', name: 'Permission 2' },
        { id: 3, code: 'perm3', name: 'Permission 3' },
      ];

      mockPrismaService.role.findUnique.mockResolvedValue(role);
      mockPrismaService.permission.count.mockResolvedValue(3); // Mock count to match permissionIds length
      mockPrismaService.permission.findMany.mockResolvedValue(permissions);
      mockPrismaService.rolePermission.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.rolePermission.createMany.mockResolvedValue({
        count: 3,
      });

      await service.assignPermissions(1, assignPermissionsDto);

      expect(mockPrismaService.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { roleId: 1 },
      });
      expect(mockPrismaService.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 1, permissionId: 1 },
          { roleId: 1, permissionId: 2 },
          { roleId: 1, permissionId: 3 },
        ],
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('应该在角色不存在时抛出错误', async () => {
      const assignPermissionsDto = {
        permissionIds: [1, 2, 3],
      };

      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(
        service.assignPermissions(999, assignPermissionsDto),
      ).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NOT_FOUND,
          ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
        ),
      );
    });

    it('应该在权限不存在时抛出错误', async () => {
      const role = {
        id: 1,
        name: 'Test Role',
        code: 'test_role',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const assignPermissionsDto = {
        permissionIds: [1, 2, 999], // 999 不存在
      };

      mockPrismaService.role.findUnique.mockResolvedValue(role);
      mockPrismaService.permission.count.mockResolvedValue(2); // Only 2 exist
      mockPrismaService.permission.findMany.mockResolvedValue([
        { id: 1, code: 'perm1', name: 'Permission 1' },
        { id: 2, code: 'perm2', name: 'Permission 2' },
        // 缺少 id: 999 的权限
      ]);

      await expect(
        service.assignPermissions(1, assignPermissionsDto),
      ).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_NOT_FOUND,
          ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
        ),
      );
    });
  });

  describe('获取角色权限', () => {
    it('应该返回角色的权限列表', async () => {
      const role = {
        id: 1,
        name: 'Test Role',
        code: 'test_role',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rolePermissions = [
        {
          permission: {
            id: 1,
            name: '用户管理',
            code: 'user:manage',
            resource: 'user',
            action: 'manage',
            description: '用户管理权限',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      mockPrismaService.role.findUnique.mockResolvedValue(role);
      mockPrismaService.rolePermission.findMany.mockResolvedValue(
        rolePermissions,
      );

      const result = await service.getRolePermissions(1);

      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.rolePermission.findMany).toHaveBeenCalledWith({
        where: { roleId: 1 },
        include: {
          permission: true,
        },
      });
      expect(result).toEqual([rolePermissions[0].permission]);
    });

    it('应该在角色不存在时抛出错误', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.getRolePermissions(999)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NOT_FOUND,
          ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
        ),
      );
    });
  });

  describe('获取角色统计', () => {
    it('应该返回角色统计信息', async () => {
      const statusCounts = [
        { isActive: true, _count: 7 },
        { isActive: false, _count: 3 },
      ];

      mockPrismaService.role.groupBy.mockResolvedValue(statusCounts);

      const result = await service.getRoleStatistics();

      expect(mockPrismaService.role.groupBy).toHaveBeenCalledWith({
        by: ['isActive'],
        _count: true,
      });
      expect(result).toEqual({
        total: 10,
        active: 7,
        inactive: 3,
      });
    });
  });

  describe('批量删除角色', () => {
    it('应该成功批量删除角色', async () => {
      const roles = [
        {
          id: 1,
          name: 'Role 1',
          code: 'role1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [], // 没有用户使用
        },
        {
          id: 2,
          name: 'Role 2',
          code: 'role2',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [], // 没有用户使用
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(roles);
      mockPrismaService.role.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.batchDelete([1, 2]);

      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        include: {
          userRoles: true,
        },
      });
      expect(mockPrismaService.role.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('应该在角色不存在时抛出错误', async () => {
      mockPrismaService.role.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Role 1',
          code: 'role1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [],
        },
        // 缺少 id: 2 的角色
      ]);

      await expect(service.batchDelete([1, 2])).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NOT_FOUND,
          ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
        ),
      );
    });

    it('应该在角色正在使用时抛出错误', async () => {
      const roles = [
        {
          id: 1,
          name: 'Role 1',
          code: 'role1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [
            {
              id: 1,
              userId: 1,
              roleId: 1,
              assignedAt: new Date(),
              assignedBy: 1,
            },
          ], // 有用户使用
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(roles);

      await expect(service.batchDelete([1])).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_IN_USE,
          ErrorMessages[ErrorCode.ROLE_IN_USE],
        ),
      );
    });
  });

  describe('获取激活角色代码列表', () => {
    it('应该返回所有激活角色的代码列表', async () => {
      const roles = [
        {
          id: 1,
          name: 'Admin',
          code: 'admin',
        },
        {
          id: 2,
          name: 'User',
          code: 'user',
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(roles);

      const result = await service.getAllActiveRoleCodes();

      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { code: true },
      });
      expect(result).toEqual(['admin', 'user']);
    });
  });
});
