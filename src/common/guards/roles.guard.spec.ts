import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import type { JwtUser } from '../../modules/auth/interfaces/jwt-payload.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
    }),
  } as unknown as ExecutionContext;

  const mockUser: JwtUser = {
    userId: 1,
    username: 'testuser',
    email: 'test@example.com',
    roles: ['USER', 'EDITOR'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('应该被定义', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('当路由没有设置角色要求时应该允许访问', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('当路由设置了空角色数组时应该允许访问', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('当用户未登录时应该拒绝访问', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      jest.spyOn(RequestContextService, 'get').mockReturnValue(null);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('当用户没有 roles 字段时应该拒绝访问', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      jest
        .spyOn(RequestContextService, 'get')
        .mockReturnValue({ userId: 1, username: 'test' } as any);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('当用户拥有所需角色时应该允许访问', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER']);
      jest.spyOn(RequestContextService, 'get').mockReturnValue(mockUser);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(RequestContextService.get).toHaveBeenCalledWith('user');
    });

    it('当用户拥有多个所需角色中的一个时应该允许访问（OR逻辑）', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['ADMIN', 'EDITOR']);
      jest.spyOn(RequestContextService, 'get').mockReturnValue(mockUser);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('当用户拥有多个所需角色时应该允许访问', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['USER', 'EDITOR']);
      jest.spyOn(RequestContextService, 'get').mockReturnValue(mockUser);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('当用户不拥有任何所需角色时应该拒绝访问', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      jest.spyOn(RequestContextService, 'get').mockReturnValue(mockUser);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('当用户角色为空数组时应该拒绝访问', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER']);
      jest.spyOn(RequestContextService, 'get').mockReturnValue({
        ...mockUser,
        roles: [],
      });

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('应该从类和方法级别获取角色元数据', () => {
      const getAllAndOverrideSpy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['USER']);
      jest.spyOn(RequestContextService, 'get').mockReturnValue(mockUser);

      guard.canActivate(mockExecutionContext);

      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(ROLES_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('角色检查应该是大小写敏感的', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user']); // 小写
      jest.spyOn(RequestContextService, 'get').mockReturnValue({
        ...mockUser,
        roles: ['USER'], // 大写
      });

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });
  });
});
