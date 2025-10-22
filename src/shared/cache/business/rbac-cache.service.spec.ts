import { Test, TestingModule } from '@nestjs/testing';
import { RbacCacheService } from './rbac-cache.service';
import { ICacheService } from '../interfaces/cache.interface';
import { LoggerService } from '@/shared/logger/logger.service';

describe('RBAC 缓存服务', () => {
  let service: RbacCacheService;
  let mockCacheService: jest.Mocked<ICacheService>;
  let mockLoggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    // Mock ICacheService
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      delPattern: jest.fn(),
      flush: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      expire: jest.fn(),
      getOrSet: jest.fn(),
      generateKey: jest.fn((prefix, suffix) =>
        suffix !== undefined ? `${prefix}:${suffix}` : prefix,
      ),
      sadd: jest.fn(),
      smembers: jest.fn(),
      srem: jest.fn(),
      isAvailable: jest.fn().mockReturnValue(true),
      getType: jest.fn().mockReturnValue('redis'),
    } as any;

    // Mock LoggerService
    mockLoggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'CACHE_SERVICE',
          useValue: mockCacheService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        RbacCacheService,
      ],
    }).compile();

    service = module.get<RbacCacheService>(RbacCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被正确定义', () => {
    expect(service).toBeDefined();
  });

  describe('获取用户角色', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('应该能从缓存中获取用户角色', async () => {
      const roles = ['admin', 'user'];
      mockCacheService.get.mockResolvedValue(roles);

      const result = await service.getUserRoles(userId);

      expect(result).toEqual(roles);
      expect(mockCacheService.get).toHaveBeenCalledWith(`user:roles:${userId}`);
    });

    it('如果角色未缓存应该返回 null', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getUserRoles(userId);

      expect(result).toBeNull();
    });
  });

  describe('设置用户角色', () => {
    it('应该使用默认 TTL 在缓存中设置用户角色', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const roles = ['admin', 'user'];
      mockCacheService.set.mockResolvedValue('OK');

      await service.setUserRoles(userId, roles);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:roles:${userId}`,
        roles,
        3600,
      );
    });

    it('应该使用自定义 TTL 设置用户角色', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const roles = ['admin'];
      mockCacheService.set.mockResolvedValue('OK');

      await service.setUserRoles(userId, roles, 7200);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:roles:${userId}`,
        roles,
        7200,
      );
    });

    it('应该更新每个角色的反向索引', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const roles = ['admin', 'editor'];
      mockCacheService.set.mockResolvedValue('OK');
      mockCacheService.sadd.mockResolvedValue(1);

      await service.setUserRoles(userId, roles);

      expect(mockCacheService.sadd).toHaveBeenCalledWith(
        'role:users:admin',
        userId,
      );
      expect(mockCacheService.sadd).toHaveBeenCalledWith(
        'role:users:editor',
        userId,
      );
    });
  });

  describe('获取用户权限', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('应该能从缓存中获取用户权限', async () => {
      const permissions = ['user:read', 'user:write'];
      mockCacheService.get.mockResolvedValue(permissions);

      const result = await service.getUserPermissions(userId);

      expect(result).toEqual(permissions);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
      );
    });

    it('如果权限未缓存应该返回 null', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getUserPermissions(userId);

      expect(result).toBeNull();
    });
  });

  describe('设置用户权限', () => {
    it('应该使用默认 TTL 在缓存中设置用户权限', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const permissions = ['user:read', 'user:write'];
      mockCacheService.set.mockResolvedValue('OK');

      await service.setUserPermissions(userId, permissions);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        permissions,
        3600,
      );
    });

    it('应该使用自定义 TTL 设置用户权限', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const permissions = ['user:read'];
      mockCacheService.set.mockResolvedValue('OK');

      await service.setUserPermissions(userId, permissions, 7200);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        permissions,
        7200,
      );
    });

    it('应该更新每个权限的反向索引', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const permissions = ['user:read', 'user:write'];
      mockCacheService.set.mockResolvedValue('OK');
      mockCacheService.sadd.mockResolvedValue(1);

      await service.setUserPermissions(userId, permissions);

      expect(mockCacheService.sadd).toHaveBeenCalledWith(
        'permission:users:user:read',
        userId,
      );
      expect(mockCacheService.sadd).toHaveBeenCalledWith(
        'permission:users:user:write',
        userId,
      );
    });
  });

  describe('删除用户缓存', () => {
    it('应该删除用户的角色和权限缓存', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockCacheService.del.mockResolvedValue(1);
      mockCacheService.get.mockResolvedValue(['admin']);
      mockCacheService.smembers.mockResolvedValue([]);

      await service.deleteUserCache(userId);

      expect(mockCacheService.del).toHaveBeenCalledWith(`user:roles:${userId}`);
      expect(mockCacheService.del).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
      );
    });

    it('应该从角色反向索引中移除用户', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockCacheService.del.mockResolvedValue(1);
      mockCacheService.get.mockResolvedValueOnce(['admin', 'editor']);
      mockCacheService.get.mockResolvedValueOnce([]);
      mockCacheService.srem.mockResolvedValue(1);

      await service.deleteUserCache(userId);

      expect(mockCacheService.srem).toHaveBeenCalledWith(
        'role:users:admin',
        userId,
      );
      expect(mockCacheService.srem).toHaveBeenCalledWith(
        'role:users:editor',
        userId,
      );
    });

    it('应该从权限反向索引中移除用户', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockCacheService.del.mockResolvedValue(1);
      mockCacheService.get.mockResolvedValueOnce([]);
      mockCacheService.get.mockResolvedValueOnce(['user:read', 'user:write']);
      mockCacheService.srem.mockResolvedValue(1);

      await service.deleteUserCache(userId);

      expect(mockCacheService.srem).toHaveBeenCalledWith(
        'permission:users:user:read',
        userId,
      );
      expect(mockCacheService.srem).toHaveBeenCalledWith(
        'permission:users:user:write',
        userId,
      );
    });
  });

  describe('使拥有指定角色的用户缓存失效', () => {
    it('应该删除所有拥有特定角色的用户的缓存', async () => {
      const roleCode = 'admin';
      const userIds = ['1', '2', '3'];
      mockCacheService.smembers.mockResolvedValue(userIds);
      mockCacheService.del.mockResolvedValue(1);
      mockCacheService.get.mockResolvedValue([]);

      await service.invalidateRoleUsers(roleCode);

      expect(mockCacheService.smembers).toHaveBeenCalledWith(
        'role:users:admin',
      );
      expect(mockCacheService.del).toHaveBeenCalledWith('user:roles:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('user:permissions:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('user:roles:2');
      expect(mockCacheService.del).toHaveBeenCalledWith('user:permissions:2');
      expect(mockCacheService.del).toHaveBeenCalledWith('user:roles:3');
      expect(mockCacheService.del).toHaveBeenCalledWith('user:permissions:3');
    });

    it('使用户失效后应该清理反向索引', async () => {
      const roleCode = 'admin';
      mockCacheService.smembers.mockResolvedValue(['1', '2']);
      mockCacheService.del.mockResolvedValue(1);
      mockCacheService.get.mockResolvedValue([]);

      await service.invalidateRoleUsers(roleCode);

      expect(mockCacheService.del).toHaveBeenCalledWith('role:users:admin');
    });

    it('应该能优雅地处理空用户列表', async () => {
      const roleCode = 'admin';
      mockCacheService.smembers.mockResolvedValue([]);

      await service.invalidateRoleUsers(roleCode);

      expect(mockCacheService.smembers).toHaveBeenCalledWith(
        'role:users:admin',
      );
      // 空用户列表时只记录日志，不需要验证 del 调用
      expect(mockLoggerService.log).toHaveBeenCalled();
    });
  });

  describe('使拥有指定权限的用户缓存失效', () => {
    it('应该删除所有拥有特定权限的用户的缓存', async () => {
      const permissionCode = 'user:read';
      const userIds = ['1', '2'];
      mockCacheService.smembers.mockResolvedValue(userIds);
      mockCacheService.del.mockResolvedValue(1);
      mockCacheService.get.mockResolvedValue([]);

      await service.invalidatePermissionUsers(permissionCode);

      expect(mockCacheService.smembers).toHaveBeenCalledWith(
        'permission:users:user:read',
      );
      expect(mockCacheService.del).toHaveBeenCalledWith('user:roles:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('user:permissions:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('user:roles:2');
      expect(mockCacheService.del).toHaveBeenCalledWith('user:permissions:2');
    });

    it('使用户失效后应该清理反向索引', async () => {
      const permissionCode = 'user:read';
      mockCacheService.smembers.mockResolvedValue(['1']);
      mockCacheService.del.mockResolvedValue(1);
      mockCacheService.get.mockResolvedValue([]);

      await service.invalidatePermissionUsers(permissionCode);

      expect(mockCacheService.del).toHaveBeenCalledWith(
        'permission:users:user:read',
      );
    });
  });

  describe('使多个角色的用户缓存失效', () => {
    it('应该使多个角色的缓存失效', async () => {
      const roleCodes = ['admin', 'editor'];
      mockCacheService.smembers
        .mockResolvedValueOnce(['1', '2'])
        .mockResolvedValueOnce(['2', '3']);
      mockCacheService.del.mockResolvedValue(1);
      mockCacheService.get.mockResolvedValue([]);

      const result = await service.invalidateMultipleRoles(roleCodes);

      expect(result).toBeGreaterThan(0);
      expect(mockCacheService.smembers).toHaveBeenCalledWith(
        'role:users:admin',
      );
      expect(mockCacheService.smembers).toHaveBeenCalledWith(
        'role:users:editor',
      );
    });

    it('应该能处理空角色列表', async () => {
      const result = await service.invalidateMultipleRoles([]);

      expect(result).toBe(0);
      expect(mockCacheService.smembers).not.toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该能处理没有角色的用户', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockCacheService.set.mockResolvedValue('OK');

      await service.setUserRoles(userId, []);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:roles:${userId}`,
        [],
        3600,
      );
      expect(mockCacheService.sadd).not.toHaveBeenCalled();
    });

    it('应该能处理没有权限的用户', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockCacheService.set.mockResolvedValue('OK');

      await service.setUserPermissions(userId, []);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        [],
        3600,
      );
      expect(mockCacheService.sadd).not.toHaveBeenCalled();
    });

    it('应该能优雅地处理缓存服务错误', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getUserRoles(userId);

      expect(result).toBeNull();
    });
  });

  describe('构造函数', () => {
    it('使用内存缓存时应该记录警告日志', () => {
      mockCacheService.getType.mockReturnValue('memory');

      new RbacCacheService(mockCacheService, mockLoggerService);

      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('使用内存缓存'),
        'RbacCacheService',
      );
    });

    it('使用 Redis 缓存时应该记录成功日志', () => {
      mockCacheService.getType.mockReturnValue('redis');
      jest.clearAllMocks();

      new RbacCacheService(mockCacheService, mockLoggerService);

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('使用 Redis 缓存'),
        'RbacCacheService',
      );
    });
  });
});
