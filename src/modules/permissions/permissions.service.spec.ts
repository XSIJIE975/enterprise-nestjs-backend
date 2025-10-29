import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { RbacCacheService } from '../../shared/cache/business/rbac-cache.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-codes.enum';
import { ErrorMessages } from '../../common/enums/error-codes.enum';

describe('PermissionsService', () => {
  let service: PermissionsService;

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

  const mockPrismaService = {
    permission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockRbacCacheService = {
    flushAllRbacCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
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
      // Mock Prisma 查询
      mockPrismaService.permission.findUnique.mockResolvedValue(null);
      mockPrismaService.permission.create.mockResolvedValue({
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
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledTimes(2); // name, code
      expect(mockPrismaService.permission.create).toHaveBeenCalledWith({
        data: {
          name: createPermissionDto.name,
          code: createPermissionDto.code,
          resource: createPermissionDto.resource,
          action: createPermissionDto.action,
          description: createPermissionDto.description,
          isActive: true,
        },
      });
    });

    it('当权限名称已存在时应该抛出 BusinessException', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);

      await expect(service.create(createPermissionDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_NAME_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.PERMISSION_NAME_ALREADY_EXISTS],
        ),
      );

      // 重置 mock
      mockPrismaService.permission.findUnique.mockReset();
    });

    it('当权限代码已存在时应该抛出 BusinessException', async () => {
      mockPrismaService.permission.findUnique
        .mockResolvedValueOnce(null) // name 不存在
        .mockResolvedValue(mockPermission); // code 已存在

      await expect(service.create(createPermissionDto)).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.PERMISSION_CODE_ALREADY_EXISTS],
        ),
      );

      mockPrismaService.permission.findUnique.mockReset();
    });
  });

  describe('查找所有', () => {
    it('应该返回所有权限列表', async () => {
      const mockPermissions = [mockPermission, mockPermission2];
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockPermission.id);
      expect(result[1].id).toBe(mockPermission2.id);
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('应该返回空数组当没有权限时', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('查找单个', () => {
    it('应该返回指定ID的权限', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.name).toBe(mockPermission.name);
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('当权限不存在时应该抛出 BusinessException', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

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
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);

      const result = await service.findByCode('user:read');

      expect(result).toBeDefined();
      expect(result.code).toBe('user:read');
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledWith({
        where: { code: 'user:read' },
      });
    });
  });

  describe('更新', () => {
    const updatePermissionDto: UpdatePermissionDto = {
      name: '更新的权限名称',
      description: '更新的描述',
    };

    it('应该成功更新权限', async () => {
      mockPrismaService.permission.findUnique
        .mockResolvedValueOnce(mockPermission) // 原权限存在
        .mockResolvedValueOnce(null) // 新名称不存在
        .mockResolvedValueOnce(null); // 新代码不存在

      mockPrismaService.permission.update.mockResolvedValue({
        ...mockPermission,
        ...updatePermissionDto,
        updatedAt: new Date(),
      });

      const result = await service.update(1, updatePermissionDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updatePermissionDto.name);
      expect(result.description).toBe(updatePermissionDto.description);
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.permission.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updatePermissionDto,
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('当权限不存在时应该抛出 BusinessException', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updatePermissionDto)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.update(999, updatePermissionDto)).rejects.toThrow(
        '权限不存在',
      );
    });

    it('当更新权限名称已存在时应该抛出 BusinessException', async () => {
      mockPrismaService.permission.findUnique
        .mockResolvedValueOnce(mockPermission) // 原权限存在
        .mockResolvedValue(mockPermission2); // 新名称已存在

      await expect(service.update(1, { name: '已存在的名称' })).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_NAME_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.PERMISSION_NAME_ALREADY_EXISTS],
        ),
      );

      mockPrismaService.permission.findUnique.mockReset();
    });

    it('当更新权限代码已存在时应该抛出 BusinessException', async () => {
      mockPrismaService.permission.findUnique
        .mockResolvedValueOnce(mockPermission) // 原权限存在
        .mockResolvedValue(mockPermission2); // 新代码已存在

      await expect(service.update(1, { code: '已存在的代码' })).rejects.toThrow(
        new BusinessException(
          ErrorCode.PERMISSION_CODE_ALREADY_EXISTS,
          ErrorMessages[ErrorCode.PERMISSION_CODE_ALREADY_EXISTS],
        ),
      );

      mockPrismaService.permission.findUnique.mockReset();
    });

    it('应该在更新权限代码与当前代码相同时不进行冲突检查', async () => {
      // Reset mocks
      mockPrismaService.permission.findUnique.mockClear();
      mockPrismaService.permission.update.mockClear();
      mockRbacCacheService.flushAllRbacCache.mockClear();

      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission); // 原权限存在

      mockPrismaService.permission.update.mockResolvedValue({
        ...mockPermission,
        code: mockPermission.code, // 代码没有变化
        updatedAt: new Date(),
      });

      const result = await service.update(1, { code: mockPermission.code });

      expect(result).toBeDefined();
      expect(result.code).toBe(mockPermission.code);
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledTimes(1); // 只检查原权限
      expect(mockPrismaService.permission.update).toHaveBeenCalled();
    });

    it('应该在更新权限代码为不存在的代码时成功更新', async () => {
      // Reset mocks
      mockPrismaService.permission.findUnique.mockClear();
      mockPrismaService.permission.update.mockClear();
      mockRbacCacheService.flushAllRbacCache.mockClear();

      mockPrismaService.permission.findUnique
        .mockResolvedValueOnce(mockPermission) // 原权限存在
        .mockResolvedValueOnce(null); // 新代码不存在

      mockPrismaService.permission.update.mockResolvedValue({
        ...mockPermission,
        code: 'new_unique_code',
        updatedAt: new Date(),
      });

      const result = await service.update(1, { code: 'new_unique_code' });

      expect(result).toBeDefined();
      expect(result.code).toBe('new_unique_code');
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledTimes(2); // 检查原权限和新代码
      expect(mockPrismaService.permission.update).toHaveBeenCalled();
    });
  });

  describe('删除', () => {
    it('应该成功删除权限', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.permission.delete.mockResolvedValue(mockPermission);

      await service.remove(1);

      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.permission.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('当权限不存在时应该抛出 BusinessException', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

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
      mockPrismaService.permission.count.mockResolvedValue(1);
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.findAllPaginated(query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(10);
      expect(mockPrismaService.permission.count).toHaveBeenCalled();
      expect(mockPrismaService.permission.findMany).toHaveBeenCalled();
    });

    it('应该正确处理搜索关键词', async () => {
      mockPrismaService.permission.count.mockResolvedValue(0);
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      await service.findAllPaginated({ keyword: '测试' });

      expect(mockPrismaService.permission.count).toHaveBeenCalledWith({
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
      mockPrismaService.permission.count.mockResolvedValue(0);
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      await service.findAllPaginated({ resource: 'user' });

      expect(mockPrismaService.permission.count).toHaveBeenCalledWith({
        where: {
          resource: 'user',
        },
      });
    });

    it('应该正确处理操作动作筛选', async () => {
      mockPrismaService.permission.count.mockResolvedValue(0);
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      await service.findAllPaginated({ action: 'read' });

      expect(mockPrismaService.permission.count).toHaveBeenCalledWith({
        where: {
          action: 'read',
        },
      });
    });

    it('应该正确处理状态筛选', async () => {
      mockPrismaService.permission.count.mockResolvedValue(0);
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      await service.findAllPaginated({ isActive: false });

      expect(mockPrismaService.permission.count).toHaveBeenCalledWith({
        where: {
          isActive: false,
        },
      });
    });
  });

  describe('更新权限状态', () => {
    it('应该成功更新权限状态', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.permission.update.mockResolvedValue({
        ...mockPermission,
        isActive: false,
      });

      const result = await service.updatePermissionStatus(1, false);

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.permission.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('当权限不存在时应该抛出 BusinessException', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.updatePermissionStatus(999, true)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.updatePermissionStatus(999, true)).rejects.toThrow(
        '权限不存在',
      );
    });
  });

  describe('获取权限统计', () => {
    it('应该返回权限统计信息', async () => {
      mockPrismaService.permission.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8) // active
        .mockResolvedValueOnce(2); // inactive

      mockPrismaService.permission.groupBy.mockResolvedValue([
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
      const mockPermissions = [mockPermission, mockPermission2];
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.permission.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.batchDelete([1, 2]);

      expect(result).toBe(2);
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2] },
        },
      });
      expect(mockPrismaService.permission.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2] },
        },
      });
      expect(mockRbacCacheService.flushAllRbacCache).toHaveBeenCalled();
    });

    it('当没有找到可删除的权限时应该抛出 BusinessException', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([]);

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
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getAllActivePermissionCodes();

      expect(result).toEqual(['user:read', 'user:create', 'role:read']);
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { code: true },
      });
    });

    it('应该返回空数组当没有激活权限时', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      const result = await service.getAllActivePermissionCodes();

      expect(result).toEqual([]);
    });
  });
});
