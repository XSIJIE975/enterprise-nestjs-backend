import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionsOptions,
  PermissionLogic,
} from '../decorators/permissions.decorator';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import { PrismaService } from '../../shared/database/prisma.service';

/**
 * 权限守卫
 * 验证用户是否拥有访问路由所需的权限
 *
 * 支持两种逻辑：
 * - AND: 用户需要拥有所有指定权限
 * - OR: 用户只需拥有任意一个权限
 *
 * 安全策略：实时从数据库查询权限，确保权限变更立即生效
 * 避免依赖 JWT 中的权限信息，防止权限撤销后仍可在 token 有效期内使用旧权限
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

    // 实时从数据库查询用户权限，确保权限变更立即生效
    const userPermissions = await this.getUserPermissions(userId);

    // 根据逻辑类型验证权限
    if (permissionsOptions.logic === PermissionLogic.OR) {
      // OR 逻辑：拥有任意一个权限即可
      return permissionsOptions.permissions.some(permission =>
        userPermissions.includes(permission),
      );
    } else {
      // AND 逻辑：需要拥有所有权限
      return permissionsOptions.permissions.every(permission =>
        userPermissions.includes(permission),
      );
    }
  }

  /**
   * 从数据库实时查询用户的所有权限代码
   * @param userId 用户 ID
   * @returns 权限代码数组
   */
  private async getUserPermissions(userId: number): Promise<string[]> {
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
