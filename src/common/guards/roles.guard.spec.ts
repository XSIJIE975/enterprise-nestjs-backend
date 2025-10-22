import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { RbacCacheService } from '../../shared/cache/business/rbac-cache.service';
import { LoggerService } from '../../shared/logger/logger.service';

describe('RolesGuard', () => {
  let guard: RolesGuard;
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

  const mockUserRoles = [
    {
      id: 1,
      userId: MOCK_USER_ID,
      roleId: 1,
      assignedAt: new Date(),
      assignedBy: MOCK_USER_ID,
      role: {
        code: 'USER',
        isActive: true,
      },
    },
    {
      id: 2,
      userId: MOCK_USER_ID,
      roleId: 2,
      assignedAt: new Date(),
      assignedBy: MOCK_USER_ID,
      role: {
        code: 'EDITOR',
        isActive: true,
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
        RolesGuard,
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

    guard = module.get<RolesGuard>(RolesGuard);
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
    it('当路由没有设置角色要求时应该允许访问', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('当角色要求为空数组时应该允许访问', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('当用户未登录时应该拒绝访问', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      jest.spyOn(RequestContextService, 'getUserId').mockReturnValue(null);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('当用户拥有所需角色时应该允许访问', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER']);
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockPrismaService.userRole.findMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID },
        include: {
          role: {
            select: {
              code: true,
              isActive: true,
            },
          },
        },
      });
    });

    it('当用户拥有多个角色中的任意一个时应该允许访问', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['ADMIN', 'EDITOR']); // 用户有 EDITOR
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('当用户没有所需角色时应该拒绝访问', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['ADMIN', 'SUPER_ADMIN']);
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('应该只包含激活的角色', async () => {
      const mockUserRolesWithInactive = [
        {
          ...mockUserRoles[0],
          role: {
            code: 'USER',
            isActive: false, // 角色未激活
          },
        },
      ];

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER']);
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue(
        mockUserRolesWithInactive,
      );

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false); // 因为角色未激活，所以拒绝访问
    });

    it('应该正确处理用户没有任何角色的情况', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER']);
      jest
        .spyOn(RequestContextService, 'getUserId')
        .mockReturnValue(MOCK_USER_ID);
      mockPrismaService.userRole.findMany.mockResolvedValue([]); // 用户没有角色

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });
  });
});
