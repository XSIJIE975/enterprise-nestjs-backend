import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * 认证服务
 */
@Injectable()
export class AuthService {
  private readonly accessTokenExpires: string;
  private readonly refreshTokenExpires: string;
  private readonly refreshTokenSecret: string;
  private readonly jwtIssuer: string;
  private readonly jwtAudience: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.accessTokenExpires = this.configService.get(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    this.refreshTokenExpires = this.configService.get(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    this.refreshTokenSecret = this.configService.get('JWT_REFRESH_SECRET');
    this.jwtIssuer = this.configService.get(
      'JWT_ISSUER',
      'enterprise-nestjs-backend',
    );
    this.jwtAudience = this.configService.get(
      'JWT_AUDIENCE',
      'enterprise-nestjs-backend',
    );
  }

  /**
   * 验证用户（用于本地策略）
   * @param usernameOrEmail 用户名或邮箱
   * @param password 密码
   * @returns 用户信息（不含密码）
   */
  async validateUser(usernameOrEmail: string, password: string) {
    const user = await this.usersService.findByUsernameOrEmail(usernameOrEmail);

    if (!user) {
      this.logger.warn(`登录失败: 用户不存在 - ${usernameOrEmail}`);
      return null;
    }

    // 检查账户是否被禁用
    if (!user.isActive) {
      this.logger.warn(`登录失败: 账户已被禁用 - ${usernameOrEmail}`);
      throw new UnauthorizedException('账户已被禁用，请联系管理员');
    }

    // 验证密码
    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`登录失败: 密码错误 - ${usernameOrEmail}`);
      return null;
    }

    // 移除密码字段
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  /**
   * 用户注册
   * @param registerDto 注册信息
   * @returns 认证响应（包含 Token 和用户信息）
   */
  async register(
    registerDto: RegisterDto,
    deviceInfo?: any,
  ): Promise<AuthResponseDto> {
    this.logger.log(`用户注册: ${registerDto.email}`, 'AuthService');

    // 创建用户
    const user = await this.usersService.create(registerDto);

    // 生成 Token
    return this.login(user, deviceInfo);
  }

  /**
   * 用户登录
   * @param user 用户信息
   * @param deviceInfo 设备信息
   * @returns 认证响应（包含 Token 和用户信息）
   */
  async login(user: any, deviceInfo?: any): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles || [],
    };

    // 生成 Access Token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpires,
      issuer: this.jwtIssuer,
      audience: this.jwtAudience,
    });

    // 生成 Refresh Token
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpires,
      issuer: this.jwtIssuer,
      audience: this.jwtAudience,
    });

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Refresh Token 7天后过期

    // 将旧的会话设置为失效（单设备登录策略）
    await this.revokeAllUserSessions(user.id);

    // 保存会话信息到数据库
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        accessToken,
        refreshToken,
        deviceInfo: deviceInfo?.userAgent || null,
        ipAddress: deviceInfo?.ipAddress || null,
        userAgent: deviceInfo?.userAgent || null,
        isActive: true,
        expiresAt,
      },
    });

    // 缓存 Token 信息到 Redis（用于快速验证）
    await this.cacheTokenToRedis(user.id, accessToken, refreshToken);

    // 更新最后登录时间
    await this.usersService.updateLastLoginAt(user.id);

    this.logger.log(
      `用户登录成功: ${user.username} (ID: ${user.id})`,
      'AuthService',
    );

    // 解析过期时间（秒）
    const expiresIn = this.parseExpiresIn(this.accessTokenExpires);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        roles: user.roles || [],
      },
    };
  }

  /**
   * 刷新 Token
   * @param refreshToken Refresh Token
   * @param deviceInfo 设备信息
   * @returns 新的认证响应
   */
  async refreshToken(
    refreshToken: string,
    _deviceInfo?: any,
  ): Promise<AuthResponseDto> {
    try {
      // 检查 Refresh Token 是否在黑名单中
      const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh Token 已失效');
      }

      // 验证 Refresh Token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshTokenSecret,
      });

      // 检查用户是否存在
      const user = await this.usersService.findOne(payload.sub);

      if (!user.isActive) {
        throw new UnauthorizedException('账户已被禁用');
      }

      // 验证会话是否存在且有效
      const session = await this.prisma.userSession.findFirst({
        where: {
          userId: payload.sub,
          refreshToken,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!session) {
        throw new UnauthorizedException('会话已失效，请重新登录');
      }

      // 生成新的 Token
      const newPayload: JwtPayload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles || [],
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.accessTokenExpires,
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: this.refreshTokenSecret,
        expiresIn: this.refreshTokenExpires,
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      });

      // 将旧 Token 加入黑名单
      await this.addTokenToBlacklist(refreshToken, 7 * 24 * 60 * 60); // 7天

      // 更新会话
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresAt,
        },
      });

      // 更新 Redis 缓存
      await this.cacheTokenToRedis(user.id, newAccessToken, newRefreshToken);

      this.logger.log(
        `Token 刷新成功: ${user.username} (ID: ${user.id})`,
        'AuthService',
      );

      const expiresIn = this.parseExpiresIn(this.accessTokenExpires);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          roles: user.roles || [],
        },
      };
    } catch (error) {
      this.logger.error('Token 刷新失败', error);
      throw new UnauthorizedException('Refresh Token 无效或已过期');
    }
  }

  /**
   * 用户退出登录
   * @param userId 用户 ID
   * @param accessToken Access Token
   */
  async logout(userId: number, accessToken: string): Promise<void> {
    // 查找当前会话
    const session = await this.prisma.userSession.findFirst({
      where: {
        userId,
        accessToken,
        isActive: true,
      },
    });

    if (session) {
      // 将 Token 加入黑名单
      await this.addTokenToBlacklist(accessToken, 15 * 60); // Access Token 15分钟
      await this.addTokenToBlacklist(session.refreshToken, 7 * 24 * 60 * 60); // Refresh Token 7天

      // 撤销会话
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      // 从 Redis 中删除缓存
      await this.removeTokenFromRedis(userId);

      this.logger.log(`用户退出登录: User ID ${userId}`, 'AuthService');
    }
  }

  /**
   * 撤销用户的所有会话（用于单设备登录）
   * @param userId 用户 ID
   */
  async revokeAllUserSessions(userId: number): Promise<void> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    // 将所有 Token 加入黑名单
    for (const session of sessions) {
      await this.addTokenToBlacklist(session.accessToken, 15 * 60);
      await this.addTokenToBlacklist(session.refreshToken, 7 * 24 * 60 * 60);
    }

    // 撤销所有会话
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    // 从 Redis 中删除缓存
    await this.removeTokenFromRedis(userId);

    this.logger.log(`撤销用户所有会话: User ID ${userId}`, 'AuthService');
  }

  /**
   * 将 Token 加入黑名单
   * @param token Token
   * @param ttl 过期时间（秒）
   */
  private async addTokenToBlacklist(token: string, ttl: number): Promise<void> {
    const key = `token:blacklist:${token}`;
    await this.cacheService.set(key, '1', ttl);
  }

  /**
   * 检查 Token 是否在黑名单中
   * @param token Token
   * @returns 是否在黑名单中
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `token:blacklist:${token}`;
    const result = await this.cacheService.get(key);
    return result !== null;
  }

  /**
   * 缓存 Token 到 Redis
   * @param userId 用户 ID
   * @param accessToken Access Token
   * @param refreshToken Refresh Token
   */
  private async cacheTokenToRedis(
    userId: number,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    const key = `user:session:${userId}`;
    const data = {
      accessToken,
      refreshToken,
      timestamp: new Date().toISOString(),
    };

    // 缓存7天
    await this.cacheService.set(key, JSON.stringify(data), 7 * 24 * 60 * 60);
  }

  /**
   * 从 Redis 中删除 Token 缓存
   * @param userId 用户 ID
   */
  private async removeTokenFromRedis(userId: number): Promise<void> {
    const key = `user:session:${userId}`;
    await this.cacheService.del(key);
  }

  /**
   * 解析过期时间字符串为秒数
   * @param expiresIn 过期时间字符串（如: '15m', '7d'）
   * @returns 秒数
   */
  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900; // 默认15分钟
    }
  }
}
