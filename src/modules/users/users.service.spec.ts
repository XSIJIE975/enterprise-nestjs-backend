import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { ErrorCode } from '@/common/enums/error-codes.enum';
import { RbacCacheService } from '@/shared/cache';
import { PrismaService } from '@/shared/database/prisma.service';
import { UserRepository } from '@/shared/repositories/user.repository';
import { PermissionRepository } from '@/shared/repositories/permission.repository';
import { AuditLogService } from '@/shared/audit/audit-log.service';
import { LogsService } from '../logs/logs.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from './users.service';

// Mock bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: MockProxy<UserRepository>;
  let permissionRepository: MockProxy<PermissionRepository>;

  // Mock UUID 常量
  const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const MOCK_USER_ID_2 = '660e8400-e29b-41d4-a716-446655440001';
  const NON_EXISTENT_UUID = '999e8400-e29b-41d4-a716-446655440999';

  // Mock 数据
  const mockUser = {
    id: MOCK_USER_ID,
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedPassword123',
    firstName: 'Test',
    lastName: 'User',
    phone: '13800138000',
    avatar: null,
    isActive: true,
    isVerified: false,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    userRoles: [
      {
        id: 1,
        userId: MOCK_USER_ID,
        roleId: 1,
        assignedAt: new Date('2025-01-01'),
        assignedBy: 'system',
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
              assignedBy: 'system',
              createdAt: new Date('2025-01-01'),
              permission: {
                id: 1,
                code: 'user:read',
                name: '读取用户',
                description: '读取用户信息',
                resource: 'user',
                action: 'read',
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

  const mockAuthService = {
    logoutOtherSessions: jest.fn(),
    revokeAllUserSessions: jest.fn(),
  };

  const mockRbacCacheService = {
    getUserRoles: jest.fn(),
    setUserRoles: jest.fn(),
    getUserPermissions: jest.fn(),
    setUserPermissions: jest.fn(),
    deleteUserCache: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'security.bcrypt.rounds') return 10;
      return defaultValue;
    }),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    role: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    userRole: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
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
    userRepository = mockDeep<UserRepository>();
    permissionRepository = mockDeep<PermissionRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: RbacCacheService,
          useValue: mockRbacCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: UserRepository,
          useValue: userRepository,
        },
        {
          provide: PermissionRepository,
          useValue: permissionRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
      phone: '13900139000',
    };

    it('应该成功创建新用户（含 permissions）', async () => {
      // Mock bcrypt.hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      // Mock Repository 查询
      userRepository.checkConflict.mockResolvedValue({
        email: false,
        username: false,
        phone: false,
      });
      userRepository.create.mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
        username: createUserDto.username,
        phone: createUserDto.phone,
      });
      userRepository.findByIdWithRoles.mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
        username: createUserDto.username,
        phone: createUserDto.phone,
      });

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDto.email);
      expect(result.username).toBe(createUserDto.username);
      expect(result.permissions).toEqual(['user:read']);

      expect(userRepository.checkConflict).toHaveBeenCalledWith({
        email: createUserDto.email,
        username: createUserDto.username,
        phone: createUserDto.phone,
      });
      expect(userRepository.create).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
    });

    it('当邮箱已存在时应该抛出 ConflictException', async () => {
      userRepository.checkConflict.mockResolvedValue({
        email: true,
        username: false,
        phone: false,
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        '该邮箱已被注册',
      );
    });

    it('当用户名已存在时应该抛出 ConflictException', async () => {
      userRepository.checkConflict.mockResolvedValue({
        email: false,
        username: true,
        phone: false,
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        '该用户名已被使用',
      );
    });

    it('当手机号已存在时应该抛出 ConflictException', async () => {
      userRepository.checkConflict.mockResolvedValue({
        email: false,
        username: false,
        phone: true,
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        '该手机号已被注册',
      );
    });
  });

  describe('findAll', () => {
    it('应该返回所有用户列表', async () => {
      const mockUsers = [
        mockUser,
        { ...mockUser, id: MOCK_USER_ID_2, email: 'user2@example.com' },
      ];
      userRepository.findAll.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(userRepository.findAll).toHaveBeenCalled();
    });

    it('应该返回空数组当没有用户时', async () => {
      userRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('应该根据 ID 返回用户（含 roles 和 permissions）', async () => {
      userRepository.findByIdWithRoles.mockResolvedValue(mockUser);

      const result = await service.findOne(MOCK_USER_ID);

      expect(result).toBeDefined();
      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('password');
      expect(result.roles).toEqual(['USER']);
      expect(result.permissions).toEqual(['user:read']);
      expect(userRepository.findByIdWithRoles).toHaveBeenCalledWith(
        MOCK_USER_ID,
      );
    });

    it('当用户不存在时应该抛出 NotFoundException', async () => {
      userRepository.findByIdWithRoles.mockResolvedValue(null);

      await expect(service.findOne(NON_EXISTENT_UUID)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(NON_EXISTENT_UUID)).rejects.toThrow(
        '用户不存在',
      );
    });

    it('当用户已被软删除时应该抛出 NotFoundException', async () => {
      userRepository.findByIdWithRoles.mockResolvedValue(null);

      await expect(service.findOne(MOCK_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('应该根据邮箱返回用户（含密码）', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('hashedPassword123');
    });
  });

  describe('findByUsername', () => {
    it('应该根据用户名返回用户（含密码）', async () => {
      userRepository.findByUsername.mockResolvedValue(mockUser);

      const result = await service.findByUsername('testuser');

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.password).toBe('hashedPassword123');
    });
  });

  describe('findByUsernameOrEmail', () => {
    it('应该根据邮箱查找用户', async () => {
      userRepository.findByUsernameOrEmail.mockResolvedValue(mockUser as any);

      const result = await service.findByUsernameOrEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(userRepository.findByUsernameOrEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('应该根据用户名查找用户', async () => {
      userRepository.findByUsernameOrEmail.mockResolvedValue(mockUser as any);

      const result = await service.findByUsernameOrEmail('testuser');

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
    });
  });

  describe('update', () => {
    const updateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('应该成功更新用户信息', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      });
      userRepository.findByIdWithRoles.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      });

      const result = await service.update(MOCK_USER_ID, updateUserDto);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('当用户不存在时应该抛出 NotFoundException', async () => {
      userRepository.findByIdWithRoles.mockResolvedValue(null);

      await expect(
        service.update(NON_EXISTENT_UUID, updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('当更新邮箱且邮箱已被使用时应该抛出 ConflictException', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.checkConflict.mockResolvedValue({
        email: true,
        username: false,
        phone: false,
      });

      await expect(
        service.update(MOCK_USER_ID, { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updatePassword', () => {
    it('应该成功更新密码', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      userRepository.update.mockResolvedValue(mockUser);

      await service.updatePassword(MOCK_USER_ID, 'NewPassword123!');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(userRepository.update).toHaveBeenCalledWith(MOCK_USER_ID, {
        password: 'newHashedPassword',
      });
    });
  });

  describe('updateLastLoginAt', () => {
    it('应该成功更新最后登录时间', async () => {
      userRepository.update.mockResolvedValue(mockUser);

      await service.updateLastLoginAt(MOCK_USER_ID);

      expect(userRepository.update).toHaveBeenCalledWith(MOCK_USER_ID, {
        lastLoginAt: expect.any(Date),
      });
    });
  });

  describe('validatePassword', () => {
    it('当密码正确时应该返回 true', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword(
        'password',
        'hashedPassword',
      );

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    });

    it('当密码错误时应该返回 false', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword(
        'wrongpassword',
        'hashedPassword',
      );

      expect(result).toBe(false);
    });
  });

  describe('changePassword', () => {
    it('应该成功修改密码并撤销所有会话', async () => {
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);
      mockAuthService.revokeAllUserSessions.mockResolvedValue(undefined);

      await service.changePassword(
        MOCK_USER_ID,
        'OldPassword123!',
        'NewPassword123!',
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'OldPassword123!',
        mockUser.password,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(userRepository.update).toHaveBeenCalledWith(MOCK_USER_ID, {
        password: 'newHashedPassword',
      });
      expect(mockAuthService.revokeAllUserSessions).toHaveBeenCalledWith(
        MOCK_USER_ID,
        ErrorCode.SESSION_EXPIRED,
      );
    });

    it('当用户不存在时应该抛出 NotFoundException', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(
          NON_EXISTENT_UUID,
          'OldPassword123!',
          'NewPassword123!',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('当旧密码错误时应该抛出错误', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      userRepository.findById.mockResolvedValue(mockUser);

      await expect(
        service.changePassword(
          MOCK_USER_ID,
          'WrongPassword',
          'NewPassword123!',
        ),
      ).rejects.toThrow('旧密码不正确');
    });
  });

  describe('logoutOtherSessions', () => {
    it('应该成功注销其他设备会话', async () => {
      const mockSession = {
        id: 'session-uuid-123',
      };
      userRepository.findById.mockResolvedValue(mockUser);
      mockPrismaService.userSession.findFirst.mockResolvedValue(mockSession);
      mockAuthService.logoutOtherSessions.mockResolvedValue(undefined);

      await service.logoutOtherSessions(MOCK_USER_ID, 'token123');

      expect(mockPrismaService.userSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId: MOCK_USER_ID,
          accessToken: 'token123',
          isActive: true,
        },
        select: { id: true },
      });
      expect(mockAuthService.logoutOtherSessions).toHaveBeenCalledWith(
        MOCK_USER_ID,
        'session-uuid-123',
      );
    });

    it('当会话不存在时应该抛出 NotFoundException', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      mockPrismaService.userSession.findFirst.mockResolvedValue(null);

      await expect(
        service.logoutOtherSessions(MOCK_USER_ID, 'invalidToken'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (软删除)', () => {
    it('应该成功软删除用户 (当用户非激活状态时)', async () => {
      userRepository.findById.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      userRepository.delete.mockResolvedValue({
        ...mockUser,
        isActive: false,
        deletedAt: new Date(),
      });

      await service.remove(MOCK_USER_ID);

      expect(userRepository.delete).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('当用户处于激活状态时应该抛出 BadRequestException', async () => {
      userRepository.findById.mockResolvedValue({
        ...mockUser,
        isActive: true,
      });

      await expect(service.remove(MOCK_USER_ID)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove(MOCK_USER_ID)).rejects.toThrow(
        '激活状态的用户不能被删除',
      );
    });

    it('当用户不存在时应该抛出 NotFoundException', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.remove(NON_EXISTENT_UUID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProfile', () => {
    it('应该返回用户个人资料（含 permissions，不含 createdAt/updatedAt）', async () => {
      userRepository.findByIdWithRoles.mockResolvedValue(mockUser as any);

      const result = await service.getProfile(MOCK_USER_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(MOCK_USER_ID);
      expect(result.email).toBe(mockUser.email);
      expect(result.username).toBe(mockUser.username);
      expect(result.roles).toEqual(['USER']);
      expect(result.permissions).toEqual(['user:read']);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
      expect(userRepository.findByIdWithRoles).toHaveBeenCalledWith(
        MOCK_USER_ID,
      );
    });

    it('当用户不存在时应该抛出 NotFoundException', async () => {
      userRepository.findByIdWithRoles.mockResolvedValue(null);

      await expect(service.getProfile(NON_EXISTENT_UUID)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProfile(NON_EXISTENT_UUID)).rejects.toThrow(
        '用户不存在',
      );
    });
  });
});
