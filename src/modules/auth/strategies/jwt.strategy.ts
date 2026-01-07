import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { AuthJwtPayload, JwtUser } from '../interfaces/jwt-payload.interface';
import { RequestContextService } from '../../../shared/request-context/request-context.service';
import { ErrorCode, ErrorMessages } from '@/common/enums/error-codes.enum';

/**
 * JWT 认证策略
 * 验证 Access Token 的有效性
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.accessTokenSecret'),
      passReqToCallback: true, // 将 request 对象传递给 validate 方法
    });
  }

  /**
   * 验证 JWT Payload
   * @param req Express Request 对象
   * @param payload JWT Payload
   * @returns 用户信息
   */
  async validate(req: Request, payload: AuthJwtPayload): Promise<JwtUser> {
    // 提取 Token
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCode.TOKEN_MISSING,
        message: ErrorMessages[ErrorCode.TOKEN_MISSING],
      });
    }

    // 检查 Token 是否在黑名单中，并获取具体原因
    const blacklistReason =
      await this.authService.getTokenBlacklistReason(token);
    if (blacklistReason) {
      // 根据黑名单原因返回不同的错误信息
      throw new UnauthorizedException({
        code: blacklistReason,
        message: ErrorMessages[blacklistReason],
      });
    }

    // 构建用户信息
    const user: JwtUser = {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };

    // 将用户信息存储到 RequestContext 中，方便全局访问
    RequestContextService.setUserId(user.userId);
    RequestContextService.set('user', user);
    RequestContextService.set('accessToken', token);
    return user;
  }
}
