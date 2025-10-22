import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import { JwtUser } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * 所有者或管理员守卫
 * 验证用户是否为资源所有者或拥有管理员角色
 *
 * 使用 RequestContext 全局上下文获取用户信息
 *
 * 适用场景：
 * - 用户只能访问自己的资源
 * - 管理员可以访问所有资源
 *
 * @example
 * ```typescript
 * @Get('users/:id/profile')
 * @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
 * getProfile(@Param('id') id: string) {
 *   // 只有本人或管理员可以访问
 * }
 * ```
 */
@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 从 RequestContext 中获取用户信息（由 JwtStrategy 设置）
    const user = RequestContextService.get<JwtUser>('user');

    // 如果用户未登录，拒绝访问
    if (!user || !user.userId) {
      return false;
    }

    // 检查是否为管理员
    if (user.roles && user.roles.includes('admin')) {
      return true;
    }

    // 检查是否为资源所有者
    // 从路由参数中获取资源的用户 ID
    const request = context.switchToHttp().getRequest();
    const resourceUserId = this.extractResourceUserId(request, user.userId);

    if (resourceUserId === null) {
      // 无法确定资源所有者，拒绝访问
      return false;
    }

    // 验证是否为本人
    return user.userId === resourceUserId;
  }

  /**
   * 从请求中提取资源的用户 ID
   * @param request HTTP 请求对象
   * @param currentUserId 当前登录用户 ID
   * @returns 资源所有者的用户 ID
   */
  private extractResourceUserId(
    request: any,
    currentUserId: string,
  ): string | null {
    // 尝试从路由参数中获取 userId 或 id
    const params = request.params;

    if (params.userId) {
      return params.userId;
    }

    if (params.id) {
      return params.id;
    }

    // 如果是个人资料接口（如 /users/profile/me），直接返回当前用户 ID
    if (request.url.includes('/profile/me')) {
      return currentUserId;
    }

    return null;
  }
}
