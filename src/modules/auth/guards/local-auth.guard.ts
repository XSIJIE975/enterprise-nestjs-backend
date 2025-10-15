import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import type { AuthUser } from '../types/user.types';
import { ErrorCode, ErrorMessages } from '@/common/enums/error-codes.enum';

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

  handleRequest<TUser = AuthUser>(err: any, user: TUser, _info: any): TUser {
    // 如果有错误，优先抛出该错误
    if (err) {
      throw err;
    }

    // 如果没有用户信息，说明认证失败
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: ErrorMessages[ErrorCode.INVALID_CREDENTIALS],
      });
    }

    return user;
  }
}
