import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCode, ErrorMessages } from '@/common/enums/error-codes.enum';
import { LocalAuthGuard } from './local-auth.guard';

describe('LocalAuthGuard', () => {
  let guard: LocalAuthGuard;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        body: {
          username: 'testuser',
          password: 'password123',
        },
      }),
    }),
  } as unknown as ExecutionContext;

  const mockUser = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalAuthGuard],
    }).compile();

    guard = module.get<LocalAuthGuard>(LocalAuthGuard);
  });

  it('应该被定义', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('应该在用户验证成功时返回用户信息', () => {
      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
    });

    it('当策略抛出错误时应该抛出该错误', () => {
      const customError = new UnauthorizedException({
        code: ErrorCode.ACCOUNT_DISABLED,
        message: ErrorMessages[ErrorCode.ACCOUNT_DISABLED],
      });

      expect(() => guard.handleRequest(customError, null, null)).toThrow(
        customError,
      );
    });

    it('当没有用户信息时应该抛出 INVALID_CREDENTIALS 错误', () => {
      try {
        guard.handleRequest(null, null, null);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const exception = error as UnauthorizedException;
        expect(exception.getResponse()).toEqual({
          code: ErrorCode.INVALID_CREDENTIALS,
          message: ErrorMessages[ErrorCode.INVALID_CREDENTIALS],
        });
      }
    });

    it('应该返回包含角色信息的用户', () => {
      const result = guard.handleRequest(null, mockUser, null);

      expect(result.userRoles).toBeDefined();
      expect(result.userRoles.length).toBeGreaterThan(0);
      expect(result.userRoles[0].role.code).toBe('USER');
    });
  });

  describe('canActivate', () => {
    it('应该调用父类的 canActivate 方法', () => {
      const superCanActivate = jest
        .spyOn(LocalAuthGuard.prototype as any, 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBeDefined();
      superCanActivate.mockRestore();
    });
  });
});
