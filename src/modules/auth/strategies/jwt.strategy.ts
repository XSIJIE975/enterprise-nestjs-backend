import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { JwtPayload, JwtUser } from '../interfaces/jwt-payload.interface';
import { RequestContextService } from '../../../shared/request-context/request-context.service';

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
  async validate(req: Request, payload: JwtPayload): Promise<JwtUser> {
    // 提取 Token
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!token) {
      throw new UnauthorizedException('Token 不存在');
    }

    // 检查 Token 是否在黑名单中
    const isBlacklisted = await this.authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token 已失效，请重新登录');
    }

    // 构建用户信息
    const user: JwtUser = {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles || [],
    };

    // 将用户信息存储到 RequestContext 中，方便全局访问
    RequestContextService.setUserId(user.userId);
    RequestContextService.set('user', user);
    RequestContextService.set('accessToken', token);

    // 返回用户信息（会附加到 request.user，兼容旧代码）
    return user;
  }
}
