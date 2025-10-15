import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import type { AuthUser } from './types/user.types';
import { ErrorCode, ErrorMessages } from '@/common/enums/error-codes.enum';

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
      'jwt.accessTokenExpiresIn',
      '15m',
    );
    this.refreshTokenExpires = this.configService.get(
      'jwt.refreshTokenExpiresIn',
      '7d',
    );
    this.refreshTokenSecret = this.configService.get('jwt.refreshTokenSecret');
    this.jwtIssuer = this.configService.get(
      'jwt.issuer',
      'enterprise-nestjs-backend',
    );
    this.jwtAudience = this.configService.get(
      'jwt.audience',
      'enterprise-nestjs-backend',
    );
  }

  /**
   * 验证用户（用于本地策略）
   * @param usernameOrEmail 用户名或邮箱
   * @param password 密码
   * @returns 用户信息（不含密码，包含角色）
   */
  async validateUser(
    usernameOrEmail: string,
    password: string,
  ): Promise<AuthUser | null> {
    const user = await this.usersService.findByUsernameOrEmail(usernameOrEmail);

    if (!user) {
      this.logger.warn(`登录失败: 用户不存在 - ${usernameOrEmail}`);
      return null;
    }

    // 检查账户是否被禁用
    if (!user.isActive) {
      this.logger.warn(`登录失败: 账户已被禁用 - ${usernameOrEmail}`);
      throw new UnauthorizedException({
        code: ErrorCode.ACCOUNT_DISABLED,
        message: ErrorMessages[ErrorCode.ACCOUNT_DISABLED],
      });
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
   * @returns 注册响应
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    this.logger.log(`用户注册: ${registerDto.email}`, 'AuthService');

    // 创建用户
    const user = await this.usersService.create(registerDto);

    this.logger.log(
      `用户注册成功: ${user.username} (ID: ${user.id})`,
      'AuthService',
    );

    return {
      username: user.username,
      email: user.email,
      message: '注册成功，请登录',
    };
  }

  /**
   * 用户登录
   * @param user 用户信息
   * @param deviceInfo 设备信息
   * @returns 认证响应（包含 Token 和用户信息）
   */
  async login(user: AuthUser, deviceInfo?: any): Promise<AuthResponseDto> {
    // 提取角色代码列表
    const roles = user.userRoles?.map(ur => ur.role.code) || [];

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles,
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

    // 智能会话管理：检查并清理超出限制的会话
    const maxConcurrentSessions = this.configService.get<number>(
      'security.session.maxConcurrentSessions',
      5,
    );

    // 查询用户当前活跃会话数
    const activeSessions = await this.prisma.userSession.findMany({
      where: {
        userId: user.id,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'asc', // 按创建时间升序，最早的在前
      },
    });

    // 如果活跃会话数已达到限制，踢出最早登录的会话
    if (activeSessions.length >= maxConcurrentSessions) {
      const sessionsToRevoke = activeSessions.slice(
        0,
        activeSessions.length - maxConcurrentSessions + 1,
      );

      for (const session of sessionsToRevoke) {
        // 将旧 Token 加入黑名单（原因：超出最大设备数）
        await this.addTokenToBlacklist(
          session.accessToken,
          15 * 60,
          ErrorCode.MAX_SESSIONS_EXCEEDED,
        );
        await this.addTokenToBlacklist(
          session.refreshToken,
          7 * 24 * 60 * 60,
          ErrorCode.MAX_SESSIONS_EXCEEDED,
        );

        // 撤销会话
        await this.prisma.userSession.update({
          where: { id: session.id },
          data: {
            isActive: false,
            revokedAt: new Date(),
          },
        });
      }

      this.logger.warn(
        `[${ErrorCode.MAX_SESSIONS_EXCEEDED}] 超出最大设备数限制(${maxConcurrentSessions})，已踢出 ${sessionsToRevoke.length} 个最早的会话: User ID ${user.id}`,
        'AuthService',
      );
    }

    // 保存新会话信息到数据库
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
        roles,
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
        throw new UnauthorizedException({
          code: ErrorCode.REFRESH_TOKEN_INVALID,
          message: ErrorMessages[ErrorCode.REFRESH_TOKEN_INVALID],
        });
      }

      // 验证 Refresh Token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshTokenSecret,
      });

      // 检查用户是否存在
      const user = await this.usersService.findOne(payload.sub);

      if (!user.isActive) {
        throw new UnauthorizedException({
          code: ErrorCode.ACCOUNT_DISABLED,
          message: ErrorMessages[ErrorCode.ACCOUNT_DISABLED],
        });
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
        throw new UnauthorizedException({
          code: ErrorCode.SESSION_EXPIRED,
          message: ErrorMessages[ErrorCode.SESSION_EXPIRED],
        });
      }

      // 生成新的 Token
      const roles = user.roles || [];
      const newPayload: JwtPayload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        roles,
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

      // 将旧 Token 加入黑名单（原因：Token 刷新）
      await this.addTokenToBlacklist(
        refreshToken,
        7 * 24 * 60 * 60,
        ErrorCode.SESSION_INVALID,
      );

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
          roles,
        },
      };
    } catch (error: any) {
      this.logger.error('Token 刷新失败', error);
      throw new UnauthorizedException({
        code: ErrorCode.REFRESH_TOKEN_INVALID,
        message: ErrorMessages[ErrorCode.REFRESH_TOKEN_INVALID],
      });
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
      // 将 Token 加入黑名单（原因：用户主动退出）
      await this.addTokenToBlacklist(
        accessToken,
        15 * 60,
        ErrorCode.SESSION_INVALID,
      );
      await this.addTokenToBlacklist(
        session.refreshToken,
        7 * 24 * 60 * 60,
        ErrorCode.SESSION_INVALID,
      );

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
   * 注销其他会话（保留当前会话）
   *
   * 用户主动注销除当前设备外的所有其他设备会话
   *
   * @param userId 用户 ID
   * @param currentSessionId 当前会话 ID（UUID 格式，保留此会话）
   */
  async logoutOtherSessions(
    userId: number,
    currentSessionId: string,
  ): Promise<void> {
    // 查找除当前会话外的所有活跃会话
    const otherSessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        NOT: {
          id: currentSessionId,
        },
      },
    });

    // 将其他会话的 Token 加入黑名单（原因：用户主动踢出其他设备）
    for (const session of otherSessions) {
      await this.addTokenToBlacklist(
        session.accessToken,
        15 * 60,
        ErrorCode.SESSION_REVOKED,
      );
      await this.addTokenToBlacklist(
        session.refreshToken,
        7 * 24 * 60 * 60,
        ErrorCode.SESSION_REVOKED,
      );
    }

    // 撤销除当前会话外的所有会话
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
        NOT: {
          id: currentSessionId,
        },
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    this.logger.log(
      `注销其他设备会话: User ID ${userId}, 保留会话 ${currentSessionId}`,
      'AuthService',
    );
  }

  /**
   * 撤销用户的所有会话（安全相关操作）
   *
   * 此方法会强制撤销用户所有设备的登录会话，常用于以下场景：
   * - 用户修改密码后，强制所有设备重新登录
   * - 账号安全事件（如账号被盗、异常登录）
   * - 管理员手动强制用户下线
   * - 用户主动点击"退出所有设备"
   *
   * 注意：普通登录流程现在使用智能会话管理，不会调用此方法
   *
   * @param userId 用户 ID
   */
  async revokeAllUserSessions(userId: number): Promise<void> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    // 将所有 Token 加入黑名单（原因：安全操作，如修改密码）
    for (const session of sessions) {
      await this.addTokenToBlacklist(
        session.accessToken,
        15 * 60,
        ErrorCode.SESSION_REVOKED,
      );
      await this.addTokenToBlacklist(
        session.refreshToken,
        7 * 24 * 60 * 60,
        ErrorCode.SESSION_REVOKED,
      );
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
   * @param reason 加入黑名单的原因（错误码）
   */
  private async addTokenToBlacklist(
    token: string,
    ttl: number,
    reason: ErrorCode = ErrorCode.SESSION_INVALID,
  ): Promise<void> {
    const key = `token:blacklist:${token}`;
    // 存储原因而不是简单的'1'，便于区分不同场景
    await this.cacheService.set(key, reason, ttl);
  }

  /**
   * 检查 Token 是否在黑名单中
   * @param token Token
   * @returns 黑名单原因（错误码），如果不在黑名单中则返回 null
   */
  async getTokenBlacklistReason(token: string): Promise<ErrorCode | null> {
    const key = `token:blacklist:${token}`;
    const result = await this.cacheService.get(key);
    return result as ErrorCode | null;
  }

  /**
   * 检查 Token 是否在黑名单中（简化版）
   * @param token Token
   * @returns 是否在黑名单中
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const reason = await this.getTokenBlacklistReason(token);
    return reason !== null;
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
