import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionsOptions,
  PermissionLogic,
} from '../decorators/permissions.decorator';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { RbacCacheService } from '../../shared/cache/business/rbac-cache.service';
import { LoggerService } from '../../shared/logger/logger.service';

/**
 * 权限守卫
 * 验证用户是否拥有访问路由所需的权限
 *
 * 支持两种逻辑：
 * - AND: 用户需要拥有所有指定权限
 * - OR: 用户只需拥有任意一个权限
 *
 * 性能优化策略：缓存优先（Cache-First with DB Fallback）
 * 1. 首先从 RBAC 缓存中查询用户权限
 * 2. 如果缓存未命中，从数据库查询并写入缓存
 * 3. 确保权限变更能在刷新 token 或缓存失效时立即生效
 *
 * @example
 * ```typescript
 * @Get('users')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permissions('user:read')
 * getUsers() { }
 * ```
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private rbacCacheService: RbacCacheService,
    private logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 从路由元数据中获取所需权限
    const permissionsOptions =
      this.reflector.getAllAndOverride<PermissionsOptions>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // 如果没有设置权限要求，则允许访问
    if (!permissionsOptions || permissionsOptions.permissions.length === 0) {
      return true;
    }

    // 从 RequestContext 中获取用户 ID
    const userId = RequestContextService.getUserId();

    // 如果用户未登录，拒绝访问
    if (!userId) {
      return false;
    }

    // 缓存优先策略：先从缓存获取，缓存未命中则查询数据库
    const userPermissions = await this.getUserPermissionsWithCache(userId);

    // 根据逻辑类型验证权限
    let hasPermission = false;
    if (permissionsOptions.logic === PermissionLogic.OR) {
      // OR 逻辑：拥有任意一个权限即可
      hasPermission = permissionsOptions.permissions.some(permission =>
        userPermissions.includes(permission),
      );
    } else {
      // AND 逻辑：需要拥有所有权限
      hasPermission = permissionsOptions.permissions.every(permission =>
        userPermissions.includes(permission),
      );
    }

    if (!hasPermission) {
      this.logger.warn(
        `权限拒绝: 用户 ${userId} 缺少所需权限 [${permissionsOptions.permissions.join(', ')}] (${permissionsOptions.logic}), 当前权限: [${userPermissions.join(', ')}]`,
        'PermissionsGuard',
      );
    }

    return hasPermission;
  }

  /**
   * 缓存优先获取用户权限
   * @param userId 用户 ID
   * @returns 权限代码数组
   */
  private async getUserPermissionsWithCache(userId: number): Promise<string[]> {
    // 1. 尝试从缓存获取
    const cachedPermissions =
      await this.rbacCacheService.getUserPermissions(userId);
    if (cachedPermissions) {
      return cachedPermissions;
    }

    // 2. 缓存未命中，从数据库查询
    const userPermissions = await this.getUserPermissionsFromDB(userId);

    // 3. 写入缓存（Write-Through 策略）
    await this.rbacCacheService.setUserPermissions(userId, userPermissions);

    return userPermissions;
  }

  /**
   * 从数据库查询用户的所有权限代码
   * @param userId 用户 ID
   * @returns 权限代码数组
   */
  private async getUserPermissionsFromDB(userId: number): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  select: {
                    code: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 提取所有权限代码（去重，只包含激活的角色和权限）
    const permissions = Array.from(
      new Set(
        userRoles
          .filter(ur => ur.role.isActive) // 只包含激活的角色
          .flatMap(ur => ur.role.rolePermissions)
          .filter(rp => rp.permission.isActive) // 只包含激活的权限
          .map(rp => rp.permission.code),
      ),
    );

    return permissions;
  }
}
