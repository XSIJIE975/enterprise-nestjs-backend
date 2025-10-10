import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

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
   * @returns 用户信息
   */
  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return user;
  }
}
