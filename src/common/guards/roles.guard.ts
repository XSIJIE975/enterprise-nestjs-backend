import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { RbacCacheService } from '../../shared/cache/business/rbac-cache.service';
import { LoggerService } from '../../shared/logger/logger.service';

/**
 * 角色守卫
 * 验证用户是否拥有访问路由所需的角色
 *
 * 性能优化策略：缓存优先（Cache-First with DB Fallback）
 * 1. 首先从 RBAC 缓存中查询用户角色
 * 2. 如果缓存未命中，从数据库查询并写入缓存
 * 3. 确保角色变更能在刷新 token 或缓存失效时立即生效
 *
 * 使用方式：
 * 1. 在路由上使用 @Roles('admin') 装饰器
 * 2. 应用 @UseGuards(JwtAuthGuard, RolesGuard)
 *
 * @example
 * ```typescript
 * @Get('admin/users')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * getUsers() { }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private rbacCacheService: RbacCacheService,
    private logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 从路由元数据中获取所需角色
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有设置角色要求，则允许访问
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 从 RequestContext 中获取用户 ID
    const userId = RequestContextService.getUserId();

    // 如果用户未登录，拒绝访问
    if (!userId) {
      return false;
    }

    // 缓存优先策略：先从缓存获取，缓存未命中则查询数据库
    const userRoles = await this.getUserRolesWithCache(userId);

    // 检查用户是否拥有所需的任意一个角色（OR 逻辑）
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `权限拒绝: 用户 ${userId} 缺少所需角色 [${requiredRoles.join(', ')}], 当前角色: [${userRoles.join(', ')}]`,
        'RolesGuard',
      );
    }

    return hasRole;
  }

  /**
   * 缓存优先获取用户角色
   * @param userId 用户 ID（UUID格式）
   * @returns 角色代码数组
   */
  private async getUserRolesWithCache(userId: string): Promise<string[]> {
    // 1. 尝试从缓存获取
    const cachedRoles = await this.rbacCacheService.getUserRoles(userId);
    if (cachedRoles) {
      return cachedRoles;
    }

    // 2. 缓存未命中，从数据库查询
    const userRoles = await this.getUserRolesFromDB(userId);

    // 3. 写入缓存（Write-Through 策略）
    await this.rbacCacheService.setUserRoles(userId, userRoles);

    return userRoles;
  }

  /**
   * 从数据库查询用户的所有角色代码
   * @param userId 用户 ID（UUID格式）
   * @returns 角色代码数组
   */
  private async getUserRolesFromDB(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
      },
      include: {
        role: {
          select: {
            code: true,
            isActive: true,
          },
        },
      },
    });

    // 提取所有激活的角色代码
    return userRoles.filter(ur => ur.role.isActive).map(ur => ur.role.code);
  }
}
