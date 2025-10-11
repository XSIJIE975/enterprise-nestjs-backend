import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionsOptions,
  PermissionLogic,
} from '../decorators/permissions.decorator';
import { PrismaService } from '../../shared/database/prisma.service';
import { RequestContextService } from '../../shared/request-context/request-context.service';

/**
 * 权限守卫
 * 验证用户是否拥有访问路由所需的权限
 *
 * 支持两种逻辑：
 * - AND: 用户需要拥有所有指定权限
 * - OR: 用户只需拥有任意一个权限
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

    // 从 RequestContext 中获取用户 ID（由 JwtStrategy 设置）
    const userId = RequestContextService.getUserId();

    // 如果用户未登录，拒绝访问
    if (!userId) {
      return false;
    }

    // 查询用户的所有权限
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
   * 获取用户的所有权限代码
   * @param userId 用户 ID
   * @returns 权限代码数组
   */
  private async getUserPermissions(userId: number): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
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
    });

    // 提取所有权限代码（去重）
    const permissions = new Set<string>();
    userRoles.forEach(userRole => {
      userRole.role.rolePermissions.forEach(rp => {
        if (rp.permission.isActive) {
          permissions.add(rp.permission.code);
        }
      });
    });

    return Array.from(permissions);
  }
}
