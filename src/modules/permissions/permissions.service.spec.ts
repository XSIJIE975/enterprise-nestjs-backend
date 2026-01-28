import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/enums/error-codes.enum';
import { ErrorMessages } from '@/common/enums/error-codes.enum';
import { PrismaService } from '@/shared/database/prisma.service';
import { PermissionRepository } from '@/shared/repositories/permission.repository';
import { RbacCacheService } from '@/shared/cache';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from '@/modules/permissions/dto';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionRepository: MockProxy<PermissionRepository>;
  let prismaService: any;

  // Mock 数据
  const mockPermission = {
    id: 1,
    name: '查看用户',
    code: 'user:read',
    resource: 'user',
    action: 'read',
    description: '查看用户信息的权限',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockPermission2 = {
    id: 2,
    name: '创建用户',
    code: 'user:create',
    resource: 'user',
    action: 'create',
    description: '创建新用户的权限',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockRbacCacheService = {
    flushAllRbacCache: jest.fn(),
  };

  beforeEach(async () => {
    permissionRepository = mockDeep<PermissionRepository>();

    // Create mock Prisma service with jest.fn() for all methods
    const mockPrismaService = {
      permission: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PermissionRepository,
          useValue: permissionRepository,
        },
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

    service = module.get<PermissionsService>(PermissionsService);
    prismaService = mockPrismaService;

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('创建', () => {
    const createPermissionDto: CreatePermissionDto = {
      name: '测试权限',
      code: 'test:create',
      resource: 'test',
      action: 'create',
      description: '测试权限描述',
    };

    it('应该成功创建新权限', async () => {
      // Mock Repository 创建
      permissionRepository.create.mockResolvedValue({
        ...mockPermission,
        name: createPermissionDto.name,
        code: createPermissionDto.code,
        resource: createPermissionDto.resource,
        action: createPermissionDto.action,
        description: createPermissionDto.description,
      });

      const result = await service.create(createPermissionDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createPermissionDto.name);
      expect(result.code).toBe(createPermissionDto.code);
      expect(permissionRepository.create).toHaveBeenCalledWith({
        name: createPermissionDto.name,
        code: createPermissionDto.code,
        resource: createPermissionDto.resource,
        action: createPermissionDto.action,
        description: createPermissionDto.description,
        isActive: true,
      });
    });

    it('当权限名称已存在时应该抛出 BusinessException', async () => {
      permissionRepository.create.mockRejectedValue(
        new ConflictException('权限名称已存在'),
      );

      await expect(service.create(createPermissionDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_NAME_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.PERMISSION_NAME_ALREADY_EXISTS],
        ),
      );
    });

    it('当权限代码已存在时应该抛出 BusinessException', async () => {
      permissionRepository.create.mockRejectedValue(
        new ConflictException('权限代码已存在'),
      );

      await expect(service.create(createPermissionDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.PERMISSION_CODE_ALREADY_EXISTS],
        ),
      );
    });
  });

  describe('查找所有', () => {
    it('应该返回所有权限列表', async () => {
      const mockPermissions = [mockPermission, mockPermission2];
      permissionRepository.findAll.mockResolvedValue(mockPermissions);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockPermission.id);
      expect(result[1].id).toBe(mockPermission2.id);
      expect(permissionRepository.findAll).toHaveBeenCalled();
    });

    it('应该返回空数组当没有权限时', async () => {
      permissionRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('查找单个', () => {
    it('应该返回指定ID的权限', async () => {
      permissionRepository.findById.mockResolvedValue(mockPermission);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.name).toBe(mockPermission.name);
      expect(permissionRepository.findById).toHaveBeenCalledWith(1);
    });

    it('当权限不存在时应该抛出 BusinessException', async () => {
      permissionRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_NOT_FOUND,
          ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
        ),
      );
    });
  });

  describe('根据代码查找', () => {
    it('应该根据代码查找权限', async () => {
      permissionRepository.findByCode.mockResolvedValue(mockPermission);

      const result = await service.findByCode('user:read');

      expect(result).toBeDefined();
      expect(result.code).toBe('user:read');
      expect(permissionRepository.findByCode).toHaveBeenCalledWith('user:read');
    });
  });

  describe('更新', () => {
    const updatePermissionDto: UpdatePermissionDto = {
      name: '更新的权限名称',
      description: '更新的描述',
    };

    it('应该成功更新权限', async () => {
      permissionRepository.update.mockResolvedValue({
        ...mockPermission,
        ...updatePermissionDto,
        updatedAt: new Date(),
      });

      const result = await service.update(1, updatePermissionDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updatePermissionDto.name);
      expect(result.description).toBe(updatePermissionDto.description);
      expect(permissionRepository.update).toHaveBeenCalledWith(
        1,
        updatePermissionDto,
      );
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('当权限不存在时应该抛出 BusinessException', async () => {
      permissionRepository.update.mockRejectedValue(
        new NotFoundException('权限不存在'),
      );

      await expect(service.update(999, updatePermissionDto)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.update(999, updatePermissionDto)).rejects.toThrow(
        '权限不存在',
      );
    });

    it('当更新权限名称已存在时应该抛出 BusinessException', async () => {
      permissionRepository.update.mockRejectedValue(
        new ConflictException('权限名称已存在'),
      );

      await expect(service.update(1, { name: '已存在的名称' })).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_NAME_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.PERMISSION_NAME_ALREADY_EXISTS],
        ),
      );
    });

    it('当更新权限代码已存在时应该抛出 BusinessException', async () => {
      permissionRepository.update.mockRejectedValue(
        new ConflictException('权限代码已存在'),
      );

      await expect(service.update(1, { code: '已存在的代码' })).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.PERMISSION_CODE_ALREADY_EXISTS],
        ),
      );
    });

    it('应该在更新权限代码与当前代码相同时不进行冲突检查', async () => {
      // Reset mocks
      permissionRepository.update.mockClear();
      mockRbacCacheService.flushAllRbacCache.mockClear();

      permissionRepository.update.mockResolvedValue({
        ...mockPermission,
        code: mockPermission.code, // 代码没有变化
        updatedAt: new Date(),
      });

      const result = await service.update(1, { code: mockPermission.code });

      expect(result).toBeDefined();
      expect(result.code).toBe(mockPermission.code);
      expect(permissionRepository.update).toHaveBeenCalled();
    });

    it('应该在更新权限代码为不存在的代码时成功更新', async () => {
      // Reset mocks
      permissionRepository.update.mockClear();
      mockRbacCacheService.flushAllRbacCache.mockClear();

      permissionRepository.update.mockResolvedValue({
        ...mockPermission,
        code: 'new_unique_code',
        updatedAt: new Date(),
      });

      const result = await service.update(1, { code: 'new_unique_code' });

      expect(result).toBeDefined();
      expect(result.code).toBe('new_unique_code');
      expect(permissionRepository.update).toHaveBeenCalled();
    });
  });

  describe('删除', () => {
    it('应该成功删除权限', async () => {
      permissionRepository.delete.mockResolvedValue(undefined);

      await service.remove(1);

      expect(permissionRepository.delete).toHaveBeenCalledWith(1);
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('当权限不存在时应该抛出 BusinessException', async () => {
      permissionRepository.delete.mockRejectedValue(
        new NotFoundException('权限不存在'),
      );

      await expect(service.remove(999)).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_NOT_FOUND,
          ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
        ),
      );
    });
  });

  describe('分页查找所有', () => {
    const query = {
      page: 1,
      pageSize: 10,
      keyword: '用户',
      resource: 'user',
      action: 'read',
      isActive: true,
      sortBy: 'createdAt',
      order: 'desc' as const,
    };

    it('应该返回分页的权限列表', async () => {
      const mockPermissions = [mockPermission];
      prismaService.permission.count.mockResolvedValue(1);
      prismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.findAllPaginated(query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(10);
      expect(prismaService.permission.count).toHaveBeenCalled();
      expect(prismaService.permission.findMany).toHaveBeenCalled();
    });

    it('应该正确处理搜索关键词', async () => {
      prismaService.permission.count.mockResolvedValue(0);
      prismaService.permission.findMany.mockResolvedValue([]);

      await service.findAllPaginated({ keyword: '测试' });

      expect(prismaService.permission.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: '测试' } },
            { code: { contains: '测试' } },
            { description: { contains: '测试' } },
          ],
        },
      });
    });

    it('应该正确处理资源类型筛选', async () => {
      prismaService.permission.count.mockResolvedValue(0);
      prismaService.permission.findMany.mockResolvedValue([]);

      await service.findAllPaginated({ resource: 'user' });

      expect(prismaService.permission.count).toHaveBeenCalledWith({
        where: {
          resource: 'user',
        },
      });
    });

    it('应该正确处理操作动作筛选', async () => {
      prismaService.permission.count.mockResolvedValue(0);
      prismaService.permission.findMany.mockResolvedValue([]);

      await service.findAllPaginated({ action: 'read' });

      expect(prismaService.permission.count).toHaveBeenCalledWith({
        where: {
          action: 'read',
        },
      });
    });

    it('应该正确处理状态筛选', async () => {
      prismaService.permission.count.mockResolvedValue(0);
      prismaService.permission.findMany.mockResolvedValue([]);

      await service.findAllPaginated({ isActive: false });

      expect(prismaService.permission.count).toHaveBeenCalledWith({
        where: {
          isActive: false,
        },
      });
    });
  });

  describe('更新权限状态', () => {
    it('应该成功更新权限状态', async () => {
      prismaService.permission.update.mockResolvedValue({
        ...mockPermission,
        isActive: false,
      });

      const result = await service.updatePermissionStatus(1, false);

      expect(result.isActive).toBe(false);
      expect(prismaService.permission.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('当权限不存在时应该抛出 BusinessException', async () => {
      // 模拟 Prisma P2025 错误
      const p2025Error: any = new Error('Record to update not found');
      p2025Error.code = 'P2025';

      prismaService.permission.update.mockRejectedValue(p2025Error);

      await expect(service.updatePermissionStatus(999, true)).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_NOT_FOUND,
          ErrorMessages[ErrorCode.PERMISSION_NOT_FOUND],
        ),
      );
    });
  });

  describe('获取权限统计', () => {
    it('应该返回权限统计信息', async () => {
      // Mock groupBy calls
      // Call 1: Status counts
      prismaService.permission.groupBy.mockResolvedValueOnce([
        { isActive: true, _count: { id: 8 } },
        { isActive: false, _count: { id: 2 } },
      ]);

      // Call 2: Resource counts
      prismaService.permission.groupBy.mockResolvedValueOnce([
        { resource: 'user', _count: { id: 5 } },
        { resource: 'role', _count: { id: 3 } },
      ]);

      const result = await service.getPermissionStatistics();

      expect(result.total).toBe(10);
      expect(result.active).toBe(8);
      expect(result.inactive).toBe(2);
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toEqual({ resource: 'user', count: 5 });
    });
  });

  describe('批量删除', () => {
    it('应该成功批量删除权限', async () => {
      prismaService.permission.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.batchDelete([1, 2]);

      expect(result).toBe(2);
      expect(prismaService.permission.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2] },
        },
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('当没有找到可删除的权限时应该抛出 BusinessException', async () => {
      prismaService.permission.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.batchDelete([999])).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_BATCH_DELETE_EMPTY,
          ErrorMessages[ErrorCode.PERMISSION_BATCH_DELETE_EMPTY],
        ),
      );
    });
  });

  describe('获取所有激活权限代码', () => {
    it('应该返回所有激活权限的代码列表', async () => {
      const mockPermissions = [
        { code: 'user:read' },
        { code: 'user:create' },
        { code: 'role:read' },
      ];
      prismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getAllActivePermissionCodes();

      expect(result).toEqual(['user:read', 'user:create', 'role:read']);
      expect(prismaService.permission.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { code: true },
      });
    });

    it('应该返回空数组当没有激活权限时', async () => {
      prismaService.permission.findMany.mockResolvedValue([]);

      const result = await service.getAllActivePermissionCodes();

      expect(result).toEqual([]);
    });
  });
});
