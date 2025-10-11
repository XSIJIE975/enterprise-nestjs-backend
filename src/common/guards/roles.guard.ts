import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import { JwtUser } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * 角色守卫
 * 验证用户是否拥有访问路由所需的角色
 *
 * 使用 RequestContext 全局上下文获取用户信息，无需从 request 中读取
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
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 从路由元数据中获取所需角色
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有设置角色要求，则允许访问
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 从 RequestContext 中获取用户信息（由 JwtStrategy 设置）
    const user = RequestContextService.get<JwtUser>('user');

    // 如果用户未登录，拒绝访问
    if (!user || !user.roles) {
      return false;
    }

    // 检查用户是否拥有所需的任意一个角色（OR 逻辑）
    return requiredRoles.some(role => user.roles.includes(role));
  }
}
