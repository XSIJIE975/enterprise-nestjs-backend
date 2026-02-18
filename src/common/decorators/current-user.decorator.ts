import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '@/modules/auth/interfaces/jwt-payload.interface';
import { RequestContextService } from '@/shared/request-context/request-context.service';

/**
 * 当前用户装饰器
 * 从全局 RequestContext 中提取当前登录用户信息
 *
 * 使用 AsyncLocalStorage 实现，无需从 request 对象中读取
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: JwtUser) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): JwtUser | undefined => {
    // 从全局 RequestContext 中获取用户信息（由 JwtStrategy 设置）
    return RequestContextService.get<JwtUser>('user');
  },
);
