import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import {
  PermissionLogic,
  PermissionsOptions,
} from '../decorators/permissions.decorator';
import { PrismaService } from '@/shared/database/prisma.service';
import { RbacCacheService } from '@/shared/cache';
import { LoggerService } from '@/shared/logger/logger.service';
import { RequestContextService } from '@/shared/request-context/request-context.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  // Mock UUID 常量
  const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
    }),
  } as unknown as ExecutionContext;

  const mockUserRolesWithPermissions = [
    {
      id: 1,
      userId: MOCK_USER_ID,
      roleId: 1,
      assignedAt: new Date(),
      assignedBy: 1,
      role: {
        id: 1,
        code: 'USER',
        name: '普通用户',
        isActive: true,
        rolePermissions: [
          {
            id: 1,
            roleId: 1,
            permissionId: 1,
            assignedAt: new Date(),
            assignedBy: 1,
            permission: {
              code: 'user:read',
              isActive: true,
            },
          },
          {
            id: 2,
            roleId: 1,
            permissionId: 2,
            assignedAt: new Date(),
            assignedBy: 1,
            permission: {
              code: 'user:write',
              isActive: true,
            },
          },
        ],
      },
    },
  ];

  const mockPrismaService = {
    userRole: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        Reflector,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RbacCacheService,
          useValue: {
            getUserRoles: jest.fn(),
            setUserRoles: jest.fn(),
            getUserPermissions: jest.fn(),
            setUserPermissions: jest.fn(),
            deleteUserCache: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('应该被定义', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('当没有设置权限要求时应该允许访问', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('当权限要求为空数组时应该允许访问', async () => {
      const permissionsOptions: PermissionsOptions = {
        permissions: [],
        logic: PermissionLogic.AND,
      };
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(permissionsOptions);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('当用户未登录时应该拒绝访问', async () => {
      const permissionsOptions: PermissionsOptions = {
        permissions: ['user:read'],
        logic: PermissionLogic.AND,
      };
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(permissionsOptions);
      jest.spyOn(RequestContextService, 'getUserId').mockReturnValue(null);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('当用户拥有所需权限时应该允许访问（AND逻辑）', async () => {
      const permissionsOptions: PermissionsOptions = {
        permissions: ['user:read', 'user:write'],
        logic: PermissionLogic.AND,
      };
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(permissionsOptions);
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue(
        mockUserRolesWithPermissions,
      );

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockPrismaService.userRole.findMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: {
                    select: {
                      code: true,
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('当用户缺少部分权限时应该拒绝访问（AND逻辑）', async () => {
      const permissionsOptions: PermissionsOptions = {
        permissions: ['user:read', 'user:delete'], // 用户没有 user:delete
        logic: PermissionLogic.AND,
      };
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(permissionsOptions);
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue(
        mockUserRolesWithPermissions,
      );

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('当用户拥有任意一个权限时应该允许访问（OR逻辑）', async () => {
      const permissionsOptions: PermissionsOptions = {
        permissions: ['user:read', 'user:delete'], // 用户有 user:read
        logic: PermissionLogic.OR,
      };
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(permissionsOptions);
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue(
        mockUserRolesWithPermissions,
      );

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('当用户没有任何所需权限时应该拒绝访问（OR逻辑）', async () => {
      const permissionsOptions: PermissionsOptions = {
        permissions: ['user:delete', 'admin:read'],
        logic: PermissionLogic.OR,
      };
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(permissionsOptions);
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue(
        mockUserRolesWithPermissions,
      );

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('应该只包含激活的角色和权限', async () => {
      const mockUserRolesWithInactive = [
        {
          ...mockUserRolesWithPermissions[0],
          role: {
            ...mockUserRolesWithPermissions[0].role,
            isActive: false, // 角色未激活
          },
        },
      ];

      const permissionsOptions: PermissionsOptions = {
        permissions: ['user:read'],
        logic: PermissionLogic.AND,
      };
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(permissionsOptions);
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue(
        mockUserRolesWithInactive,
      );

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false); // 因为角色未激活，所以拒绝访问
    });

    it('应该过滤掉未激活的权限', async () => {
      const mockUserRolesWithInactivePermission = [
        {
          ...mockUserRolesWithPermissions[0],
          role: {
            ...mockUserRolesWithPermissions[0].role,
            rolePermissions: [
              {
                ...mockUserRolesWithPermissions[0].role.rolePermissions[0],
                permission: {
                  code: 'user:read',
                  isActive: false, // 权限未激活
                },
              },
            ],
          },
        },
      ];

      const permissionsOptions: PermissionsOptions = {
        permissions: ['user:read'],
        logic: PermissionLogic.AND,
      };
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(permissionsOptions);
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue(
        mockUserRolesWithInactivePermission,
      );

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false); // 因为权限未激活，所以拒绝访问
    });
  });
});
