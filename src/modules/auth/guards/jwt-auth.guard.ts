import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { ErrorCode, ErrorMessages } from '@/common/enums/error-codes.enum';
import type { JwtUser } from '../interfaces/jwt-payload.interface';

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

  handleRequest<TUser = JwtUser>(err: any, user: TUser, info: any): TUser {
    // 优先处理策略中主动抛出的错误（如黑名单检查）
    if (err) {
      throw err;
    }

    // 处理 passport-jwt 自动检测到的错误
    if (info) {
      // Token 过期
      if (info.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          code: ErrorCode.TOKEN_EXPIRED,
          message: ErrorMessages[ErrorCode.TOKEN_EXPIRED],
        });
      }
      // Token 格式错误
      if (info.name === 'JsonWebTokenError') {
        if (info.message === 'jwt malformed') {
          throw new UnauthorizedException({
            code: ErrorCode.TOKEN_MALFORMED,
            message: ErrorMessages[ErrorCode.TOKEN_MALFORMED],
          });
        }
        // Token 签名无效
        throw new UnauthorizedException({
          code: ErrorCode.TOKEN_INVALID,
          message: ErrorMessages[ErrorCode.TOKEN_INVALID],
        });
      }
      // Token 还未生效
      if (info.name === 'NotBeforeError') {
        throw new UnauthorizedException({
          code: ErrorCode.TOKEN_INVALID,
          message: ErrorMessages[ErrorCode.TOKEN_INVALID],
        });
      }
      // 缺少 Token
      if (info.message === 'No auth token') {
        throw new UnauthorizedException({
          code: ErrorCode.TOKEN_MISSING,
          message: ErrorMessages[ErrorCode.TOKEN_MISSING],
        });
      }
      // 其他错误
      throw new UnauthorizedException({
        code: ErrorCode.TOKEN_INVALID,
        message: ErrorMessages[ErrorCode.TOKEN_INVALID],
      });
    }

    // 没有用户信息
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.TOKEN_INVALID,
        message: ErrorMessages[ErrorCode.TOKEN_INVALID],
      });
    }

    // 验证成功，返回用户信息
    return user;
  }
}
