import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import type { AuthUser } from '../types/user.types';
import { ErrorCode, ErrorMessages } from '@/common/enums/error-codes.enum';

/**
 * 本地认证策略
 * 用于用户名/邮箱 + 密码登录
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'username', // 可以是用户名或邮箱
      passwordField: 'password',
    });
  }

  /**
   * 验证用户凭证
   * @param username 用户名或邮箱
   * @param password 密码
   * @returns 用户信息（不含密码，包含角色）
   */
  async validate(username: string, password: string): Promise<AuthUser> {
    const user = await this.authService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: ErrorMessages[ErrorCode.INVALID_CREDENTIALS],
      });
    }

    return user;
  }
}
