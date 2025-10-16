import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import { PrismaService } from '../../shared/database/prisma.service';

/**
 * 角色守卫
 * 验证用户是否拥有访问路由所需的角色
 *
 * 安全策略：实时从数据库查询角色，确保角色变更立即生效
 * 避免依赖 JWT 中的角色信息，防止角色撤销后仍可在 token 有效期内使用旧角色
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

    // 实时从数据库查询用户角色，确保角色变更立即生效
    const userRoles = await this.getUserRoles(userId);

    // 检查用户是否拥有所需的任意一个角色（OR 逻辑）
    return requiredRoles.some(role => userRoles.includes(role));
  }

  /**
   * 从数据库实时查询用户的所有角色代码
   * @param userId 用户 ID
   * @returns 角色代码数组
   */
  private async getUserRoles(userId: number): Promise<string[]> {
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
