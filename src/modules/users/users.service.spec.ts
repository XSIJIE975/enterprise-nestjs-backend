import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RbacCacheService } from '../../shared/cache/business/rbac-cache.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  // Mock 数据
  const mockUser = {
    id: 1,
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
        role: {
          id: 1,
          code: 'USER',
          name: '普通用户',
        },
      },
    ],
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userSession: {
      findFirst: jest.fn(),
    },
  };

  const mockAuthService = {
    logoutOtherSessions: jest.fn(),
    revokeAllUserSessions: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'security.bcrypt.rounds') return 10;
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
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
          provide: ConfigService,
          useValue: mockConfigService,
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

    it('应该成功创建新用户', async () => {
      // Mock bcrypt.hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      // Mock Prisma 查询
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
        username: createUserDto.username,
      });

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDto.email);
      expect(result.username).toBe(createUserDto.username);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(3); // email, username, phone
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          username: createUserDto.username,
          password: 'hashedPassword',
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          phone: createUserDto.phone,
          isActive: true,
          isVerified: false,
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
    });

    it('当邮箱已存在时应该抛出 ConflictException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        '该邮箱已被注册',
      );

      // 重置 mock
      mockPrismaService.user.findUnique.mockReset();
    });

    it('当用户名已存在时应该抛出 ConflictException', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // email 不存在
        .mockResolvedValue(mockUser); // username 已存在

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );

      // 重置 mock 并重新设置
      mockPrismaService.user.findUnique.mockReset();
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        '该用户名已被使用',
      );

      mockPrismaService.user.findUnique.mockReset();
    });

    it('当手机号已存在时应该抛出 ConflictException', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // email 不存在
        .mockResolvedValueOnce(null) // username 不存在
        .mockResolvedValue(mockUser); // phone 已存在

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );

      // 重置并重新设置
      mockPrismaService.user.findUnique.mockReset();
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        '该手机号已被注册',
      );

      mockPrismaService.user.findUnique.mockReset();
    });
  });

  describe('findAll', () => {
    it('应该返回所有用户列表', async () => {
      const mockUsers = [
        mockUser,
        { ...mockUser, id: 2, email: 'user2@example.com' },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('应该返回空数组当没有用户时', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('应该根据 ID 返回用户', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('password');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    it('当用户不存在时应该抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('用户不存在');
    });

    it('当用户已被软删除时应该抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('应该根据邮箱返回用户（含密码）', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('hashedPassword123');
    });
  });

  describe('findByUsername', () => {
    it('应该根据用户名返回用户（含密码）', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByUsername('testuser');

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.password).toBe('hashedPassword123');
    });
  });

  describe('findByUsernameOrEmail', () => {
    it('应该根据邮箱查找用户', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findByUsernameOrEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'test@example.com' }, { username: 'test@example.com' }],
          deletedAt: null,
        },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('应该根据用户名查找用户', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

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
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      });

      const result = await service.update(1, updateUserDto);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateUserDto,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    it('当用户不存在时应该抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('当更新邮箱且邮箱已被使用时应该抛出 ConflictException', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // 查找目标用户
        .mockResolvedValueOnce({ ...mockUser, id: 2 }); // 邮箱已被其他用户使用

      await expect(
        service.update(1, { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updatePassword', () => {
    it('应该成功更新密码', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.updatePassword(1, 'NewPassword123!');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'newHashedPassword' },
      });
    });
  });

  describe('updateLastLoginAt', () => {
    it('应该成功更新最后登录时间', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.updateLastLoginAt(1);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { lastLoginAt: expect.any(Date) },
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
      // Mock 旧密码验证为 true，新密码不同返回 false
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // 验证旧密码
        .mockResolvedValueOnce(false); // 检查新旧密码是否相同
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockAuthService.revokeAllUserSessions.mockResolvedValue(undefined);

      await service.changePassword(1, 'OldPassword123!', 'NewPassword123!');

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'OldPassword123!',
        mockUser.password,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockAuthService.revokeAllUserSessions).toHaveBeenCalledWith(1);
    });

    it('当用户不存在时应该抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(999, 'OldPassword123!', 'NewPassword123!'),
      ).rejects.toThrow(NotFoundException);
    });

    it('当旧密码错误时应该抛出错误', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.changePassword(1, 'WrongPassword', 'NewPassword123!'),
      ).rejects.toThrow('旧密码不正确');
    });
  });

  describe('logoutOtherSessions', () => {
    it('应该成功注销其他设备会话', async () => {
      const mockSession = {
        id: 'session-uuid-123',
        userId: 1,
        accessToken: 'token123',
      };
      mockPrismaService.userSession.findFirst.mockResolvedValue(mockSession);
      mockAuthService.logoutOtherSessions.mockResolvedValue(undefined);

      await service.logoutOtherSessions(1, 'token123');

      expect(mockPrismaService.userSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 1,
          accessToken: 'token123',
          isActive: true,
        },
      });
      expect(mockAuthService.logoutOtherSessions).toHaveBeenCalledWith(
        1,
        'session-uuid-123',
      );
    });

    it('当会话不存在时应该抛出 NotFoundException', async () => {
      mockPrismaService.userSession.findFirst.mockResolvedValue(null);

      await expect(
        service.logoutOtherSessions(1, 'invalidToken'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (软删除)', () => {
    it('应该成功软删除用户', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await service.remove(1);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('当用户不存在时应该抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
