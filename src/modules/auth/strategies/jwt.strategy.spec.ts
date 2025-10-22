import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';
import { RequestContextService } from '../../../shared/request-context/request-context.service';
import { ErrorCode, ErrorMessages } from '@/common/enums/error-codes.enum';
import { Request } from 'express';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'jwt.accessTokenSecret') return 'test-secret';
      return null;
    }),
  };

  const mockAuthService = {
    getTokenBlacklistReason: jest.fn(),
  };

  const mockPayload = {
    sub: MOCK_USER_ID,
    username: 'testuser',
    email: 'test@example.com',
    roles: ['USER', 'ADMIN'],
    permissions: ['USER_READ', 'USER_WRITE', 'ADMIN_READ'],
  };

  const mockRequest = {
    headers: {
      authorization: 'Bearer test-token-123',
    },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);

    // 清除所有 mock 调用记录
    jest.clearAllMocks();

    // Mock RequestContextService 静态方法
    jest.spyOn(RequestContextService, 'setUserId').mockImplementation();
    jest.spyOn(RequestContextService, 'set').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('应该被定义', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('应该成功验证有效的 JWT Payload', async () => {
      mockAuthService.getTokenBlacklistReason.mockResolvedValue(null);

      const result = await strategy.validate(mockRequest, mockPayload);

      expect(result).toBeDefined();
      expect(result.userId).toBe(MOCK_USER_ID);
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
      expect(result.roles).toEqual(['USER', 'ADMIN']);
      expect(RequestContextService.setUserId).toHaveBeenCalledWith(
        MOCK_USER_ID,
      );
      expect(RequestContextService.set).toHaveBeenCalledWith('user', result);
      expect(RequestContextService.set).toHaveBeenCalledWith(
        'accessToken',
        'test-token-123',
      );
    });

    it('当 Token 缺失时应该抛出 UnauthorizedException', async () => {
      const requestWithoutToken = {
        headers: {},
      } as any;

      await expect(
        strategy.validate(requestWithoutToken, mockPayload),
      ).rejects.toThrow(UnauthorizedException);

      try {
        await strategy.validate(requestWithoutToken, mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.TOKEN_MISSING,
          message: ErrorMessages[ErrorCode.TOKEN_MISSING],
        });
      }
    });

    it('当 Token 在黑名单中时应该抛出对应的错误', async () => {
      mockAuthService.getTokenBlacklistReason.mockResolvedValue(
        ErrorCode.SESSION_REVOKED,
      );

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await strategy.validate(mockRequest, mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.SESSION_REVOKED,
          message: ErrorMessages[ErrorCode.SESSION_REVOKED],
        });
      }
    });

    it('当 Token 因超出最大会话数被撤销时应该返回正确的错误', async () => {
      mockAuthService.getTokenBlacklistReason.mockResolvedValue(
        ErrorCode.MAX_SESSIONS_EXCEEDED,
      );

      try {
        await strategy.validate(mockRequest, mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.MAX_SESSIONS_EXCEEDED,
          message: ErrorMessages[ErrorCode.MAX_SESSIONS_EXCEEDED],
        });
      }
    });

    it('应该正确处理空 roles 的 payload', async () => {
      mockAuthService.getTokenBlacklistReason.mockResolvedValue(null);
      const payloadWithEmptyRoles = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        username: 'testuser',
        email: 'test@example.com',
        roles: [],
        permissions: [],
      };

      const result = await strategy.validate(
        mockRequest,
        payloadWithEmptyRoles,
      );

      expect(result.roles).toEqual([]);
      expect(result.permissions).toEqual([]);
    });

    it('应该将用户信息和 Token 存储到 RequestContext', async () => {
      mockAuthService.getTokenBlacklistReason.mockResolvedValue(null);

      await strategy.validate(mockRequest, mockPayload);

      expect(RequestContextService.setUserId).toHaveBeenCalledWith(
        MOCK_USER_ID,
      );
      expect(RequestContextService.set).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({
          userId: MOCK_USER_ID,
          username: 'testuser',
        }),
      );
      expect(RequestContextService.set).toHaveBeenCalledWith(
        'accessToken',
        'test-token-123',
      );
    });
  });
});
