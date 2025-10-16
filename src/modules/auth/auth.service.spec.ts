import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { ErrorCode } from '@/common/enums/error-codes.enum';

describe('AuthService', () => {
  let service: AuthService;

  // Mock 数据
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedPassword123',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    userRoles: [
      {
        role: {
          code: 'USER',
          name: '普通用户',
        },
      },
    ],
  };

  const mockAuthUser = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    avatar: null,
    phone: null,
    isActive: true,
    isVerified: false,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    userRoles: [
      {
        id: 1,
        userId: 1,
        roleId: 1,
        assignedAt: new Date('2025-01-01'),
        assignedBy: 1,
        role: {
          id: 1,
          code: 'USER',
          name: '普通用户',
          description: '普通用户角色',
          isActive: true,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          rolePermissions: [
            {
              id: 1,
              roleId: 1,
              permissionId: 1,
              assignedAt: new Date('2025-01-01'),
              assignedBy: 1,
              permission: {
                id: 1,
                code: 'USER_READ',
                name: '查看用户',
                description: '查看用户信息权限',
                resource: 'user',
                action: 'read',
                isActive: true,
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date('2025-01-01'),
              },
            },
            {
              id: 2,
              roleId: 1,
              permissionId: 2,
              assignedAt: new Date('2025-01-01'),
              assignedBy: 1,
              permission: {
                id: 2,
                code: 'USER_WRITE',
                name: '编辑用户',
                description: '编辑用户信息权限',
                resource: 'user',
                action: 'write',
                isActive: true,
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date('2025-01-01'),
              },
            },
          ],
        },
      },
    ],
  };

  const mockSession = {
    id: 'session-uuid-123',
    userId: 1,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  const mockUsersService = {
    findByUsernameOrEmail: jest.fn(),
    validatePassword: jest.fn(),
    create: jest.fn(),
    updateLastLoginAt: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockPrismaService = {
    userSession: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: any = {
        'jwt.accessTokenExpiresIn': '15m',
        'jwt.refreshTokenExpiresIn': '7d',
        'jwt.refreshTokenSecret': 'test-refresh-secret',
        'jwt.issuer': 'test-issuer',
        'jwt.audience': 'test-audience',
        'security.session.maxConcurrentSessions': 5,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockLoggerService = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('应该成功验证用户并返回用户信息（不含密码）', async () => {
      mockUsersService.findByUsernameOrEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toBeDefined();
      expect(result?.username).toBe('testuser');
      expect(result).not.toHaveProperty('password');
      expect(mockUsersService.findByUsernameOrEmail).toHaveBeenCalledWith(
        'testuser',
      );
      expect(mockUsersService.validatePassword).toHaveBeenCalledWith(
        'password123',
        'hashedPassword123',
      );
    });

    it('当用户不存在时应该返回 null', async () => {
      mockUsersService.findByUsernameOrEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password123');

      expect(result).toBeNull();
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('登录失败: 用户不存在'),
      );
    });

    it('当账户被禁用时应该抛出 UnauthorizedException', async () => {
      mockUsersService.findByUsernameOrEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.validateUser('testuser', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('账户已被禁用'),
      );
    });

    it('当密码错误时应该返回 null', async () => {
      mockUsersService.findByUsernameOrEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrongpassword');

      expect(result).toBeNull();
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('密码错误'),
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
    };

    it('应该成功注册新用户', async () => {
      const createdUser = {
        id: 2,
        ...registerDto,
        password: 'hashedPassword',
      };
      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.username).toBe(registerDto.username);
      expect(result.email).toBe(registerDto.email);
      expect(result.message).toBe('注册成功，请登录');
      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto);
      expect(mockLoggerService.log).toHaveBeenCalledTimes(2);
    });
  });

  describe('login', () => {
    const deviceInfo = {
      userAgent: 'Mozilla/5.0...',
      ipAddress: '127.0.0.1',
    };

    it('应该成功登录并返回 Token', async () => {
      mockJwtService.sign
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');
      mockPrismaService.userSession.findMany.mockResolvedValue([]);
      mockPrismaService.userSession.create.mockResolvedValue(mockSession);
      mockCacheService.set.mockResolvedValue(undefined);
      mockUsersService.updateLastLoginAt.mockResolvedValue(undefined);

      const result = await service.login(mockAuthUser, deviceInfo);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.user.username).toBe('testuser');
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.userSession.create).toHaveBeenCalled();
      expect(mockUsersService.updateLastLoginAt).toHaveBeenCalledWith(1);
    });

    it('当达到最大会话数时应该踢出最早的会话', async () => {
      const oldSessions = Array.from({ length: 5 }, (_, i) => ({
        id: `session-${i}`,
        userId: 1,
        accessToken: `token-${i}`,
        refreshToken: `refresh-${i}`,
        isActive: true,
        expiresAt: new Date(Date.now() + 1000000),
        createdAt: new Date(Date.now() - (5 - i) * 1000),
      }));

      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockPrismaService.userSession.findMany.mockResolvedValue(oldSessions);
      mockPrismaService.userSession.update.mockResolvedValue(oldSessions[0]);
      mockPrismaService.userSession.create.mockResolvedValue(mockSession);
      mockCacheService.set.mockResolvedValue(undefined);
      mockUsersService.updateLastLoginAt.mockResolvedValue(undefined);

      await service.login(mockAuthUser, deviceInfo);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('token:blacklist:'),
        ErrorCode.MAX_SESSIONS_EXCEEDED,
        expect.any(Number),
      );
      expect(mockPrismaService.userSession.update).toHaveBeenCalled();
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('超出最大设备数限制'),
        'AuthService',
      );
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'valid-refresh-token';
    const mockPayload = {
      sub: 1,
      username: 'testuser',
      email: 'test@example.com',
      roles: ['USER'],
    };

    it('应该成功刷新 Token', async () => {
      mockCacheService.get.mockResolvedValue(null); // 不在黑名单中
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUsersService.findOne.mockResolvedValue({
        ...mockAuthUser,
        roles: ['USER'],
      });
      mockPrismaService.userSession.findFirst.mockResolvedValue(mockSession);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.userSession.update.mockResolvedValue(mockSession);

      const result = await service.refreshToken(mockRefreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockJwtService.verify).toHaveBeenCalledWith(mockRefreshToken, {
        secret: 'test-refresh-secret',
      });
      expect(mockPrismaService.userSession.update).toHaveBeenCalled();
    });

    it('当 Token 在黑名单中时应该拒绝刷新', async () => {
      mockCacheService.get.mockResolvedValue(ErrorCode.SESSION_INVALID);

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('当用户账户被禁用时应该拒绝刷新', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUsersService.findOne.mockResolvedValue({
        ...mockAuthUser,
        isActive: false,
        roles: ['USER'],
      });

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('当会话不存在或已失效时应该拒绝刷新', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUsersService.findOne.mockResolvedValue({
        ...mockAuthUser,
        roles: ['USER'],
      });
      mockPrismaService.userSession.findFirst.mockResolvedValue(null);

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    const userId = 1;
    const accessToken = 'test-access-token';

    it('应该成功退出登录', async () => {
      mockPrismaService.userSession.findFirst.mockResolvedValue(mockSession);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.userSession.update.mockResolvedValue({
        ...mockSession,
        isActive: false,
      });
      mockCacheService.del.mockResolvedValue(undefined);

      await service.logout(userId, accessToken);

      expect(mockCacheService.set).toHaveBeenCalledTimes(2); // accessToken + refreshToken 黑名单
      expect(mockPrismaService.userSession.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
        },
      });
      expect(mockCacheService.del).toHaveBeenCalledWith(
        `user:session:${userId}`,
      );
    });

    it('当会话不存在时应该不执行任何操作', async () => {
      mockPrismaService.userSession.findFirst.mockResolvedValue(null);

      await service.logout(userId, accessToken);

      expect(mockCacheService.set).not.toHaveBeenCalled();
      expect(mockPrismaService.userSession.update).not.toHaveBeenCalled();
    });
  });

  describe('logoutOtherSessions', () => {
    const userId = 1;
    const currentSessionId = 'current-session-id';

    it('应该成功注销其他设备会话', async () => {
      const otherSessions = [
        { ...mockSession, id: 'other-session-1' },
        { ...mockSession, id: 'other-session-2' },
      ];
      mockPrismaService.userSession.findMany.mockResolvedValue(otherSessions);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.userSession.updateMany.mockResolvedValue({ count: 2 });

      await service.logoutOtherSessions(userId, currentSessionId);

      expect(mockPrismaService.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
          NOT: {
            id: currentSessionId,
          },
        },
      });
      expect(mockCacheService.set).toHaveBeenCalledTimes(4); // 2 sessions * 2 tokens
      expect(mockPrismaService.userSession.updateMany).toHaveBeenCalled();
    });
  });

  describe('revokeAllUserSessions', () => {
    const userId = 1;

    it('应该成功撤销用户所有会话', async () => {
      const allSessions = [mockSession, { ...mockSession, id: 'session-2' }];
      mockPrismaService.userSession.findMany.mockResolvedValue(allSessions);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.userSession.updateMany.mockResolvedValue({ count: 2 });
      mockCacheService.del.mockResolvedValue(undefined);

      await service.revokeAllUserSessions(userId);

      expect(mockPrismaService.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
        },
      });
      expect(mockCacheService.set).toHaveBeenCalledTimes(4); // 2 sessions * 2 tokens
      expect(mockPrismaService.userSession.updateMany).toHaveBeenCalled();
      expect(mockCacheService.del).toHaveBeenCalledWith(
        `user:session:${userId}`,
      );
    });
  });

  describe('getTokenBlacklistReason', () => {
    it('应该返回黑名单原因', async () => {
      const token = 'test-token';
      mockCacheService.get.mockResolvedValue(ErrorCode.SESSION_REVOKED);

      const result = await service.getTokenBlacklistReason(token);

      expect(result).toBe(ErrorCode.SESSION_REVOKED);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `token:blacklist:${token}`,
      );
    });

    it('当 Token 不在黑名单中时应该返回 null', async () => {
      const token = 'valid-token';
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getTokenBlacklistReason(token);

      expect(result).toBeNull();
    });
  });

  describe('isTokenBlacklisted', () => {
    it('当 Token 在黑名单中时应该返回 true', async () => {
      mockCacheService.get.mockResolvedValue(ErrorCode.SESSION_INVALID);

      const result = await service.isTokenBlacklisted('test-token');

      expect(result).toBe(true);
    });

    it('当 Token 不在黑名单中时应该返回 false', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted('valid-token');

      expect(result).toBe(false);
    });
  });
});
