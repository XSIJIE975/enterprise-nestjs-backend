import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ErrorCode, ErrorMessages } from '@/common/enums/error-codes.enum';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;

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
        },
      },
    ],
  };

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('应该成功验证有效的用户凭证', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockAuthUser);

      const result = await strategy.validate('testuser', 'password123');

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'testuser',
        'password123',
      );
    });

    it('当用户凭证无效时应该抛出 UnauthorizedException', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate('wronguser', 'wrongpass')).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await strategy.validate('wronguser', 'wrongpass');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.INVALID_CREDENTIALS,
          message: ErrorMessages[ErrorCode.INVALID_CREDENTIALS],
        });
      }
    });

    it('应该支持使用邮箱登录', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockAuthUser);

      const result = await strategy.validate('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
    });

    it('当密码为空时应该调用 validateUser', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate('testuser', '')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockAuthService.validateUser).toHaveBeenCalledWith('testuser', '');
    });

    it('当用户名为空时应该调用 validateUser', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate('', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        '',
        'password123',
      );
    });

    it('应该返回包含角色信息的用户', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockAuthUser);

      const result = await strategy.validate('testuser', 'password123');

      expect(result.userRoles).toBeDefined();
      expect(result.userRoles.length).toBeGreaterThan(0);
      expect(result.userRoles[0].role.code).toBe('USER');
    });
  });
});
