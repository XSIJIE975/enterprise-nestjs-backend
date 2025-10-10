import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT 认证守卫
 * 用于保护需要认证的路由
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any) {
    // 如果有错误或没有用户信息，抛出未授权异常
    if (err || !user) {
      throw err || new UnauthorizedException('认证失败，请重新登录');
    }
    return user;
  }
}
