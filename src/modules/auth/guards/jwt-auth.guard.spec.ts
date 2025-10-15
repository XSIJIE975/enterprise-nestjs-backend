import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ErrorCode, ErrorMessages } from '@/common/enums/error-codes.enum';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        headers: {
          authorization: 'Bearer valid-token',
        },
      }),
    }),
  } as unknown as ExecutionContext;

  const mockUser = {
    userId: 1,
    username: 'testuser',
    email: 'test@example.com',
    roles: ['USER'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('应该被定义', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('应该在用户验证成功时返回用户信息', () => {
      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toBeDefined();
      expect(result.userId).toBe(1);
      expect(result.username).toBe('testuser');
    });

    it('当策略抛出错误时应该抛出该错误', () => {
      const customError = new UnauthorizedException({
        code: ErrorCode.SESSION_REVOKED,
        message: ErrorMessages[ErrorCode.SESSION_REVOKED],
      });

      expect(() => guard.handleRequest(customError, null, null)).toThrow(
        customError,
      );
    });

    it('当 Token 过期时应该抛出 TOKEN_EXPIRED 错误', () => {
      const info = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
      };

      try {
        guard.handleRequest(null, null, info);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.TOKEN_EXPIRED,
          message: ErrorMessages[ErrorCode.TOKEN_EXPIRED],
        });
      }
    });

    it('当 Token 格式错误时应该抛出 TOKEN_MALFORMED 错误', () => {
      const info = {
        name: 'JsonWebTokenError',
        message: 'jwt malformed',
      };

      try {
        guard.handleRequest(null, null, info);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.TOKEN_MALFORMED,
          message: ErrorMessages[ErrorCode.TOKEN_MALFORMED],
        });
      }
    });

    it('当 Token 签名无效时应该抛出 TOKEN_INVALID 错误', () => {
      const info = {
        name: 'JsonWebTokenError',
        message: 'invalid signature',
      };

      try {
        guard.handleRequest(null, null, info);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.TOKEN_INVALID,
          message: ErrorMessages[ErrorCode.TOKEN_INVALID],
        });
      }
    });

    it('当 Token 还未生效时应该抛出 TOKEN_INVALID 错误', () => {
      const info = {
        name: 'NotBeforeError',
        message: 'jwt not active',
      };

      try {
        guard.handleRequest(null, null, info);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.TOKEN_INVALID,
          message: ErrorMessages[ErrorCode.TOKEN_INVALID],
        });
      }
    });

    it('当缺少 Token 时应该抛出 TOKEN_MISSING 错误', () => {
      const info = {
        message: 'No auth token',
      };

      try {
        guard.handleRequest(null, null, info);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.TOKEN_MISSING,
          message: ErrorMessages[ErrorCode.TOKEN_MISSING],
        });
      }
    });

    it('当没有用户信息时应该抛出 TOKEN_INVALID 错误', () => {
      try {
        guard.handleRequest(null, null, null);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.TOKEN_INVALID,
          message: ErrorMessages[ErrorCode.TOKEN_INVALID],
        });
      }
    });

    it('当有未知错误信息时应该抛出 TOKEN_INVALID 错误', () => {
      const info = {
        name: 'UnknownError',
        message: 'Some unknown error',
      };

      try {
        guard.handleRequest(null, null, info);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.TOKEN_INVALID,
          message: ErrorMessages[ErrorCode.TOKEN_INVALID],
        });
      }
    });
  });

  describe('canActivate', () => {
    it('应该调用父类的 canActivate 方法', () => {
      const superCanActivate = jest
        .spyOn(JwtAuthGuard.prototype as any, 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBeDefined();
      superCanActivate.mockRestore();
    });
  });
});
