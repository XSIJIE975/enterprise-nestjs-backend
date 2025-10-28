import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { RbacCacheService } from '../../shared/cache/business/rbac-cache.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-codes.enum';
import { ErrorMessages } from '../../common/enums/error-codes.enum';

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
      count: jest.fn(),
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
    },
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

      mockPrismaService.role.findUnique.mockResolvedValue({ id: 1 });

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

      mockPrismaService.role.findUnique
        .mockResolvedValueOnce(null) // name check passes
        .mockResolvedValueOnce({ id: 1 }); // code check fails

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
  });

  describe('更新角色', () => {
    it('应该成功更新角色', async () => {
      const updateRoleDto = {
        name: 'Updated Role',
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
        .mockResolvedValueOnce(null); // Second call: check name conflict
      mockPrismaService.role.update.mockResolvedValue(updatedRole);

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
  });

  describe('获取角色统计', () => {
    it('应该返回角色统计信息', async () => {
      mockPrismaService.role.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // active
        .mockResolvedValueOnce(3); // inactive

      const result = await service.getRoleStatistics();

      expect(result).toEqual({
        total: 10,
        active: 7,
        inactive: 3,
      });
    });
  });
});
