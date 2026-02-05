import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { ConflictException } from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/enums/error-codes.enum';
import { ErrorMessages } from '@/common/enums/error-codes.enum';
import { RbacCacheService } from '@/shared/cache';
import { RolesService } from './roles.service';
import { RoleRepository } from '@/shared/repositories/role.repository';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditLogService } from '@/shared/audit/audit-log.service';
import { LogsService } from '../logs/logs.service';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('角色服务', () => {
  let service: RolesService;
  let roleRepository: MockProxy<RoleRepository>;
  let prismaService: any;

  const mockRbacCacheService = {
    invalidateRoleCache: jest.fn(),
    invalidateUserCache: jest.fn(),
    getRolePermissions: jest.fn(),
    setRolePermissions: jest.fn(),
    flushAllRbacCache: jest.fn(),
  };

  const mockAuditLogService = {
    execute: jest.fn((options, originalMethod, args, context) =>
      originalMethod.apply(context, args),
    ),
  };

  const mockLogsService = {
    createAuditLog: jest.fn(),
  };

  beforeEach(async () => {
    roleRepository = mockDeep<RoleRepository>();

    // Create mock Prisma service with jest.fn() for all methods
    const mockPrismaService = {
      role: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        groupBy: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      userRole: {
        count: jest.fn(),
      },
      permission: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      rolePermission: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RoleRepository,
          useValue: roleRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RbacCacheService,
          useValue: mockRbacCacheService,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    prismaService = mockPrismaService as any;
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

      roleRepository.create.mockResolvedValue(expectedRole);

      const result = await service.create(createRoleDto);

      expect(roleRepository.create).toHaveBeenCalledWith({
        name: createRoleDto.name,
        code: createRoleDto.code,
        description: createRoleDto.description,
        isActive: true,
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

      roleRepository.create.mockRejectedValue(error);

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

      roleRepository.create.mockRejectedValue(error);

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

      roleRepository.findAll.mockResolvedValue(roles);

      const result = await service.findAll();

      expect(roleRepository.findAll).toHaveBeenCalled();
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

      roleRepository.findById.mockResolvedValue(role);

      const result = await service.findOne(1);

      expect(roleRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(role);
    });

    it('应该在角色不存在时抛出错误', async () => {
      roleRepository.findById.mockResolvedValue(null);

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

      roleRepository.findById.mockResolvedValue(roleWithPermissions);

      const result = await service.findOne(1, true);

      expect(roleRepository.findById).toHaveBeenCalledWith(1);
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

      prismaService.role.count.mockResolvedValue(1);
      prismaService.role.findMany.mockResolvedValue(roles);

      const result = await service.findAllPaginated(query);

      expect(prismaService.role.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(prismaService.role.findMany).toHaveBeenCalledWith({
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

      prismaService.role.count.mockResolvedValue(1);
      prismaService.role.findMany.mockResolvedValue(roles);

      await service.findAllPaginated(query);

      expect(prismaService.role.count).toHaveBeenCalledWith({
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

      prismaService.role.count.mockResolvedValue(1);
      prismaService.role.findMany.mockResolvedValue(roles);

      await service.findAllPaginated(query);

      expect(prismaService.role.count).toHaveBeenCalledWith({
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

      prismaService.role.count.mockResolvedValue(1);
      prismaService.role.findMany.mockResolvedValue(roles);

      await service.findAllPaginated(query);

      expect(prismaService.role.findMany).toHaveBeenCalledWith({
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

      prismaService.role.count.mockResolvedValue(1);
      prismaService.role.findMany.mockResolvedValue(roles);

      const result = await service.findAllPaginated(query);

      expect(prismaService.role.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(prismaService.role.findMany).toHaveBeenCalledWith({
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

      roleRepository.findByCode.mockResolvedValue(role);

      const result = await service.findByCode('admin');

      expect(roleRepository.findByCode).toHaveBeenCalledWith('admin');
      expect(result).toEqual(role);
    });

    it('应该在角色不存在时抛出错误', async () => {
      roleRepository.findByCode.mockResolvedValue(null);

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

      roleRepository.findById.mockResolvedValue(existingRole);
      roleRepository.update.mockResolvedValue(updatedRole);

      const result = await service.update(1, updateRoleDto);

      expect(result).toEqual(updatedRole);
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('应该在角色不存在时抛出错误', async () => {
      const updateRoleDto = {
        name: 'Updated Role',
        description: 'Updated description',
      };

      roleRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, updateRoleDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NOT_FOUND,
          ErrorMessages[ErrorCode.ROLE_NOT_FOUND],
        ),
      );
    });

    it('应该在更新角色名称时名称已存在抛出错误', async () => {
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

      roleRepository.findById.mockResolvedValue(existingRole);

      const error = new ConflictException('角色名称已存在');
      roleRepository.update.mockRejectedValue(error);

      await expect(service.update(1, updateRoleDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_NAME_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.ROLE_NAME_ALREADY_EXISTS],
        ),
      );
    });

    it('应该在更新角色代码时代码已存在抛出错误', async () => {
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

      roleRepository.findById.mockResolvedValue(existingRole);

      const error = new ConflictException('角色代码已存在');
      roleRepository.update.mockRejectedValue(error);

      await expect(service.update(1, updateRoleDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.ROLE_CODE_ALREADY_EXISTS],
        ),
      );
    });

    it('应该在更新角色代码与当前代码相同时不进行冲突检查', async () => {
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

      roleRepository.findById.mockResolvedValue(existingRole);
      roleRepository.update.mockResolvedValue(updatedRole);

      const result = await service.update(1, updateRoleDto);

      expect(result).toEqual(updatedRole);
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });
  });

  describe('删除角色', () => {
    it('应该成功删除角色', async () => {
      const role = {
        id: 1,
        name: 'Test Role',
        code: 'test_role',
        description: 'Test description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTx = {
        role: {
          findUnique: jest.fn().mockResolvedValue(role),
        },
        userRole: {
          count: jest.fn().mockResolvedValue(0),
        },
      };

      roleRepository.findById.mockResolvedValue(role);
      prismaService.$transaction.mockImplementation((callback: any) =>
        callback(mockTx),
      );
      roleRepository.delete.mockResolvedValue(role);

      await service.remove(1);

      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('应该在角色正在使用时抛出错误', async () => {
      const role = {
        id: 1,
        name: 'Test Role',
        code: 'test_role',
        description: 'Test description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTx = {
        role: {
          findUnique: jest.fn().mockResolvedValue(role),
        },
        userRole: {
          count: jest.fn().mockResolvedValue(1), // Role is in use
        },
      };

      roleRepository.findById.mockResolvedValue(role);
      prismaService.$transaction.mockImplementation((callback: any) =>
        callback(mockTx),
      );

      await expect(service.remove(1)).rejects.toThrow(
        new BusinessException(
          ErrorCode.ROLE_IN_USE,
          ErrorMessages[ErrorCode.ROLE_IN_USE],
        ),
      );
    });

    it('应该在角色不存在时抛出错误', async () => {
      const mockTx = {
        role: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      prismaService.$transaction.mockImplementation((callback: any) =>
        callback(mockTx),
      );

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

      roleRepository.findById.mockResolvedValue(existingRole);
      roleRepository.update.mockResolvedValue(updatedRole);

      const result = await service.updateRoleStatus(1, false);

      expect(roleRepository.findById).toHaveBeenCalledWith(1);
      expect(roleRepository.update).toHaveBeenCalledWith(1, {
        isActive: false,
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
      expect(result).toEqual(updatedRole);
    });

    it('应该在角色不存在时抛出错误', async () => {
      roleRepository.findById.mockResolvedValue(null);

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
        description: 'Test description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const assignPermissionsDto = {
        permissionIds: [1, 2, 3],
      };

      roleRepository.findById.mockResolvedValue(role);
      roleRepository.findRolePermissions.mockResolvedValue([]);
      prismaService.permission.count.mockResolvedValue(3);

      const mockTx = {};
      prismaService.$transaction.mockImplementation((callback: any) =>
        callback(mockTx),
      );

      roleRepository.removePermissions.mockResolvedValue({ count: 0 });
      roleRepository.assignPermissions.mockResolvedValue({ count: 3 });

      await service.assignPermissions(1, assignPermissionsDto);

      expect(roleRepository.findById).toHaveBeenCalledWith(1);
      expect(prismaService.permission.count).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2, 3] },
          isActive: true,
        },
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('应该在角色不存在时抛出错误', async () => {
      const assignPermissionsDto = {
        permissionIds: [1, 2, 3],
      };

      roleRepository.findById.mockResolvedValue(null);

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
        description: 'Test description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const assignPermissionsDto = {
        permissionIds: [1, 2, 999], // 999 不存在
      };

      roleRepository.findById.mockResolvedValue(role);
      roleRepository.findRolePermissions.mockResolvedValue([]);
      prismaService.permission.count.mockResolvedValue(2); // Only 2 exist

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
        description: 'Test description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rolePermissions = [
        {
          id: 1,
          roleId: 1,
          permissionId: 1,
          assignedAt: new Date(),
          assignedBy: 'admin',
        },
      ];

      const permissions = [
        {
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
      ];

      roleRepository.findById.mockResolvedValue(role);
      roleRepository.findRolePermissions.mockResolvedValue(rolePermissions);
      prismaService.permission.findMany.mockResolvedValue(permissions);

      const result = await service.getRolePermissions(1);

      expect(roleRepository.findById).toHaveBeenCalledWith(1);
      expect(roleRepository.findRolePermissions).toHaveBeenCalledWith(1);
      expect(prismaService.permission.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1] } },
      });
      expect(result).toEqual(permissions);
    });

    it('应该在角色不存在时抛出错误', async () => {
      roleRepository.findById.mockResolvedValue(null);

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

      prismaService.role.groupBy.mockResolvedValue(statusCounts);

      const result = await service.getRoleStatistics();

      expect(prismaService.role.groupBy).toHaveBeenCalledWith({
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
          description: 'Role 1 description',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [], // 没有用户使用
        },
        {
          id: 2,
          name: 'Role 2',
          code: 'role2',
          description: 'Role 2 description',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [], // 没有用户使用
        },
      ];

      const mockTx = {
        role: {
          findMany: jest.fn().mockResolvedValue(roles),
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };

      prismaService.$transaction.mockImplementation((callback: any) =>
        callback(mockTx),
      );

      const result = await service.batchDelete([1, 2]);

      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('应该在角色不存在时抛出错误', async () => {
      const roles = [
        {
          id: 1,
          name: 'Role 1',
          code: 'role1',
          description: 'Role 1 description',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [],
        },
        // 缺少 id: 2 的角色
      ];

      const mockTx = {
        role: {
          findMany: jest.fn().mockResolvedValue(roles),
        },
      };

      prismaService.$transaction.mockImplementation((callback: any) =>
        callback(mockTx),
      );

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
          description: 'Role 1 description',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [
            {
              id: 1,
              userId: 1,
              roleId: 1,
              assignedAt: new Date(),
              assignedBy: 'admin',
            },
          ], // 有用户使用
        },
      ];

      const mockTx = {
        role: {
          findMany: jest.fn().mockResolvedValue(roles),
        },
      };

      prismaService.$transaction.mockImplementation((callback: any) =>
        callback(mockTx),
      );

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

      prismaService.role.findMany.mockResolvedValue(roles);

      const result = await service.getAllActiveRoleCodes();

      expect(prismaService.role.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { code: true },
      });
      expect(result).toEqual(['admin', 'user']);
    });
  });
});
