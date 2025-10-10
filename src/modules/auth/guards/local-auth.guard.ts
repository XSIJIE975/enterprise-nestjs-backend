import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * 本地认证守卫
 * 用于用户名密码登录
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any) {
    // 如果有错误或没有用户信息，抛出未授权异常
    if (err || !user) {
      throw err || new UnauthorizedException('用户名或密码错误');
    }
    return user;
  }
}
