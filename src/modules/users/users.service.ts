import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  forwardRef,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type * as Prisma from '@/prisma/prisma/internal/prismaNamespace';
import { UserModel } from '@/prisma/prisma/models/User';
import { ErrorCode } from '@/common/enums/error-codes.enum';
import { PrismaService } from '@/shared/database/prisma.service';
import { RbacCacheService } from '@/shared/cache';
import { UserRepository } from '@/shared/repositories/user.repository';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto, UpdateUserDto, UpdateProfileDto } from './dto';
import { UserRoleVo, UserResponseVo, UserSessionVo } from './vo';

/**
 * 用户服务
 */
@Injectable()
export class UsersService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly rbacCacheService: RbacCacheService,
    private readonly userRepository: UserRepository,
  ) {
    this.bcryptRounds = this.configService.get<number>(
      'security.bcrypt.rounds',
      12,
    );
  }

  /**
   * 创建新用户
   * @param createUserDto 创建用户 DTO
   * @returns 用户信息（不含密码）
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseVo> {
    // 检查唯一性冲突 (邮箱、用户名、手机号)
    const conflict = await this.userRepository.checkConflict({
      email: createUserDto.email,
      username: createUserDto.username,
      phone: createUserDto.phone,
    });

    if (conflict.email) {
      throw new ConflictException('该邮箱已被注册');
    }
    if (conflict.username) {
      throw new ConflictException('该用户名已被使用');
    }
    if (conflict.phone) {
      throw new ConflictException('该手机号已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.bcryptRounds,
    );

    // 创建用户
    const user = await this.userRepository.create({
      email: createUserDto.email,
      username: createUserDto.username,
      password: hashedPassword,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      phone: createUserDto.phone,
      isActive: true,
      isVerified: false,
    });

    // 获取用户及其角色信息
    const userWithRoles = await this.userRepository.findByIdWithRoles(user.id);

    return this.toUserResponse(userWithRoles);
  }

  /**
   * 查找所有用户
   * @returns 用户列表
   */
  async findAll(): Promise<UserResponseVo[]> {
    const users = await this.userRepository.findAll();
    return users.map(user => this.toUserResponse(user));
  }

  /**
   * 根据 ID 查询单个用户
   */
  async findOne(id: string): Promise<UserResponseVo> {
    const user = await this.userRepository.findByIdWithRoles(id);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.toUserResponse(user);
  }

  /**
   * 根据 ID 查询用户
   * @internal
   */
  async findOneInternal(id: string) {
    const user = await this.userRepository.findByIdWithRoles(id);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /**
   * 根据邮箱查找用户（包含密码，用于认证）
   * @param email 邮箱
   * @returns 用户信息（含密码）
   */
  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  /**
   * 根据用户名查找用户（包含密码，用于认证）
   * @param username 用户名
   * @returns 用户信息（含密码）
   */
  async findByUsername(username: string) {
    return this.userRepository.findByUsername(username);
  }

  /**
   * 根据邮箱或用户名查找用户（用于登录）
   * @param usernameOrEmail 用户名或邮箱
   * @returns 用户信息（含密码、角色和权限）
   */
  async findByUsernameOrEmail(usernameOrEmail: string) {
    return this.userRepository.findByUsernameOrEmail(usernameOrEmail);
  }

  /**
   * 更新用户信息
   * @param id 用户 ID
   * @param updateUserDto 更新用户 DTO
   * @returns 更新后的用户信息
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseVo> {
    // 检查用户是否存在
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查唯一性冲突 (邮箱、用户名、手机号)
    const fieldsToCheck: any = {};

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      fieldsToCheck.email = updateUserDto.email;
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      fieldsToCheck.username = updateUserDto.username;
    }

    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      fieldsToCheck.phone = updateUserDto.phone;
    }

    if (Object.keys(fieldsToCheck).length > 0) {
      const conflict = await this.userRepository.checkConflict(
        fieldsToCheck,
        id,
      );

      if (conflict.email) {
        throw new ConflictException('该邮箱已被使用');
      }
      if (conflict.username) {
        throw new ConflictException('该用户名已被使用');
      }
      if (conflict.phone) {
        throw new ConflictException('该手机号已被使用');
      }
    }

    // 更新用户
    await this.userRepository.update(id, updateUserDto);

    // 获取更新后的用户及其角色信息
    const userWithRoles = await this.userRepository.findByIdWithRoles(id);

    return this.toUserResponse(userWithRoles);
  }

  /**
   * 更新用户密码
   * @param id 用户 ID
   * @param newPassword 新密码（明文）
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    await this.userRepository.update(id, { password: hashedPassword });
  }

  /**
   * 更新最后登录时间
   * @param id 用户 ID
   */
  async updateLastLoginAt(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  /**
   * 删除用户（软删除）
   * @param id 用户 ID
   */
  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.isActive) {
      throw new BadRequestException('激活状态的用户不能被删除');
    }

    // 软删除
    await this.userRepository.delete(id);
  }

  /**
   * 验证密码
   * @param plainPassword 明文密码
   * @param hashedPassword 哈希密码
   * @returns 是否匹配
   */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 分页查询用户列表
   * @param query 查询参数
   * @returns 分页用户列表
   */
  async findAllPaginated(query: any): Promise<any> {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      isActive,
      isVerified,
      role,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    // 确保分页参数有效
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const skip = (safePage - 1) * safePageSize;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(keyword && {
        OR: [
          { username: { contains: keyword } },
          { email: { contains: keyword } },
          { firstName: { contains: keyword } },
          { lastName: { contains: keyword } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
      ...(isVerified !== undefined && { isVerified }),
      ...(role && {
        userRoles: {
          some: {
            role: {
              code: { contains: role },
            },
          },
        },
      }),
    };

    // 查询总数和数据
    const [total, users] = await Promise.all([
      this.userRepository.count(where),
      this.userRepository.findManyPaginated({
        where,
        skip,
        take: safePageSize,
        orderBy: {
          [sortBy]: order,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / safePageSize);

    return {
      data: users.map(user => this.toUserResponse(user)),
      meta: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages,
        hasPreviousPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
    };
  }

  /**
   * 更新个人资料（受限版本，只能修改部分字段信息）
   * @param userId 用户 ID
   * @param updateProfileDto 更新资料 DTO
   * @returns 更新后的用户信息
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseVo> {
    // 检查用户是否存在
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查唯一性冲突 (用户名、手机号、邮箱)
    const fieldsToCheck: any = {};

    if (
      updateProfileDto.username &&
      updateProfileDto.username !== user.username
    ) {
      fieldsToCheck.username = updateProfileDto.username;
    }

    if (updateProfileDto.phone && updateProfileDto.phone !== user.phone) {
      fieldsToCheck.phone = updateProfileDto.phone;
    }

    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      fieldsToCheck.email = updateProfileDto.email;
    }

    if (Object.keys(fieldsToCheck).length > 0) {
      const conflict = await this.userRepository.checkConflict(
        fieldsToCheck,
        userId,
      );

      if (conflict.username) {
        throw new ConflictException('该用户名已被使用');
      }
      if (conflict.phone) {
        throw new ConflictException('该手机号已被使用');
      }
      if (conflict.email) {
        throw new ConflictException('该邮箱已被使用');
      }
    }

    // 更新用户（只允许更新特定字段）
    await this.userRepository.update(userId, updateProfileDto);

    // 获取更新后的用户及其角色信息
    const userWithRoles = await this.userRepository.findByIdWithRoles(userId);

    return this.toUserResponse(userWithRoles);
  }

  /**
   * 修改密码（需要验证旧密码）
   * @param userId 用户 ID
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    // 获取用户（包含密码）
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isOldPasswordValid) {
      throw new ConflictException('旧密码不正确');
    }

    // 检查新密码是否与旧密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      throw new ConflictException('新密码不能与旧密码相同');
    }

    // 加密新密码并更新
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    await this.userRepository.update(userId, { password: hashedPassword });

    // 密码修改后，撤销所有会话，强制用户重新登录
    await this.authService.revokeAllUserSessions(
      userId,
      ErrorCode.SESSION_EXPIRED,
    );
  }

  /**
   * 更新用户状态（激活/停用）
   * @param id 用户 ID
   * @param isActive 是否激活
   * @returns 更新后的用户信息
   */
  async updateUserStatus(
    id: string,
    isActive: boolean,
  ): Promise<UserResponseVo> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepository.update(id, { isActive });

    // 获取更新后的用户及其角色信息
    const userWithRoles = await this.userRepository.findByIdWithRoles(id);

    return this.toUserResponse(userWithRoles);
  }

  /**
   * 验证用户邮箱
   * @param id 用户 ID
   * @returns 更新后的用户信息
   */
  async verifyUser(id: string): Promise<UserResponseVo> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.isVerified) {
      throw new ConflictException('用户邮箱已验证');
    }

    await this.userRepository.update(id, { isVerified: true });

    // 获取更新后的用户及其角色信息
    const userWithRoles = await this.userRepository.findByIdWithRoles(id);

    return this.toUserResponse(userWithRoles);
  }

  /**
   * 重置用户密码（管理员操作，无需旧密码）
   * @param id 用户 ID
   * @param newPassword 新密码
   */
  async resetUserPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    await this.updatePassword(id, newPassword);

    // 密码重置后，撤销所有会话，强制用户重新登录
    await this.authService.revokeAllUserSessions(id, ErrorCode.SESSION_EXPIRED);
  }

  /**
   * 分配角色给用户
   * @param userId 用户 ID
   * @param roleIds 角色 ID 数组
   * @returns 更新后的用户信息
   */
  async assignRoles(
    userId: string,
    roleIds: number[],
  ): Promise<UserResponseVo> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 检查所有角色是否存在
    const rolesCount = await this.prisma.role.count({
      where: {
        id: { in: roleIds },
        isActive: true,
      },
    });

    if (rolesCount !== roleIds.length) {
      throw new UnprocessableEntityException('部分分配的角色不存在');
    }

    // 使用事务确保原子性：删除旧角色并添加新角色
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({
        where: { userId },
      }),
      this.prisma.userRole.createMany({
        data: roleIds.map(roleId => ({
          userId,
          roleId,
        })),
      }),
    ]);

    // 清除用户的 RBAC 缓存，确保下次请求获取最新的角色和权限
    await this.rbacCacheService.deleteUserCache(userId);

    // 返回更新后的用户信息
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    return this.toUserResponse(updatedUser);
  }

  /**
   * 移除用户的角色
   * @param userId 用户 ID
   * @param roleId 角色 ID
   */
  async removeRole(userId: string, roleId: number): Promise<void> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 检查角色是否存在且激活
    const roleCount = await this.prisma.role.count({
      where: { id: roleId, isActive: true },
    });

    if (roleCount === 0) {
      throw new NotFoundException('角色不存在');
    }

    // 直接尝试删除角色关联，通过 count 判断是否存在
    const { count } = await this.prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });

    if (count !== 0) {
      // 清除用户的 RBAC 缓存，确保下次请求获取最新的角色和权限
      await this.rbacCacheService.deleteUserCache(userId);
    }
  }

  /**
   * 获取用户的角色列表
   * @param userId 用户 ID
   * @returns 角色列表
   */
  async getUserRoles(userId: string): Promise<UserRoleVo[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    return user.userRoles.map(ur => ur.role);
  }

  /**
   * 获取用户的权限代码列表
   * @param userId 用户 ID
   * @returns 权限代码数组
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletedAt: true,
        userRoles: {
          where: {
            role: {
              isActive: true,
            },
          },
          select: {
            role: {
              select: {
                rolePermissions: {
                  where: {
                    permission: {
                      isActive: true,
                    },
                  },
                  select: {
                    permission: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 提取所有权限代码（去重）
    const permissions = new Set<string>();

    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissions.add(rp.permission.code);
      }
    }

    return Array.from(permissions);
  }

  /**
   * 获取用户的登录会话列表
   * @param userId 用户 ID
   * @param currentAccessToken 当前请求的 access token（从 JWT 鉴权中获取）
   * @returns 会话列表
   */
  async getUserSessions(
    userId: string,
    currentAccessToken?: string,
  ): Promise<UserSessionVo[]> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 从数据库查询用户的所有活跃会话
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sessions.map(session => ({
      sessionId: session.id,
      device: session.userAgent || 'Unknown Device',
      ipAddress: session.ipAddress,
      loginAt: session.createdAt,
      lastActivity: session.updatedAt,
      // 通过 accessToken 判断是否为当前会话
      isCurrent: currentAccessToken
        ? session.accessToken === currentAccessToken
        : false,
    }));
  }

  /**
   * 注销其他会话（保留当前会话）
   * @param userId 用户 ID
   * @param currentAccessToken 当前访问令牌
   */
  async logoutOtherSessions(
    userId: string,
    currentAccessToken: string,
  ): Promise<void> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 通过 accessToken 查找当前会话 ID
    const currentSession = await this.prisma.userSession.findFirst({
      where: {
        userId,
        accessToken: currentAccessToken,
        isActive: true,
      },
      select: { id: true },
    });

    if (!currentSession) {
      throw new NotFoundException('当前会话不存在');
    }

    await this.authService.logoutOtherSessions(userId, currentSession.id);
  }

  /**
   * 管理员：注销指定用户的指定会话
   *
   * @param userId 用户 ID
   * @param sessionId 会话 ID
   */
  async revokeUserSessionByAdmin(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    const sessionExists = await this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!sessionExists) {
      throw new NotFoundException('会话不存在');
    }

    await this.authService.revokeUserSession(
      userId,
      sessionId,
      ErrorCode.SESSION_REVOKED,
    );
  }

  /**
   * 获取用户统计数据
   * @returns 用户统计信息
   */
  async getUserStatistics(): Promise<any> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // 使用原生 SQL 聚合查询，将 8 次数据库查询合并为 1 次
    // 性能提升：减少 7 次数据库往返 (Round-trip)，降低数据库连接压力
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN isActive = 0 THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN isVerified = 1 THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN isVerified = 0 THEN 1 ELSE 0 END) as unverified,
        SUM(CASE WHEN createdAt >= ${today} THEN 1 ELSE 0 END) as newToday,
        SUM(CASE WHEN createdAt >= ${weekAgo} THEN 1 ELSE 0 END) as newThisWeek,
        SUM(CASE WHEN createdAt >= ${monthAgo} THEN 1 ELSE 0 END) as newThisMonth
      FROM users
      WHERE deletedAt IS NULL
    `;

    const stats = result[0];

    // 处理 BigInt 转换 (Prisma raw query 返回的 COUNT/SUM 可能是 BigInt，SUM 可能是 null)
    const toNumber = (val: any) => (val ? Number(val) : 0);

    return {
      total: toNumber(stats.total),
      active: toNumber(stats.active),
      inactive: toNumber(stats.inactive),
      verified: toNumber(stats.verified),
      unverified: toNumber(stats.unverified),
      newToday: toNumber(stats.newToday),
      newThisWeek: toNumber(stats.newThisWeek),
      newThisMonth: toNumber(stats.newThisMonth),
    };
  }

  /**
   * 批量删除用户（软删除）
   * @param ids 用户 ID 数组
   * @returns 删除的用户数量
   */
  async batchDelete(ids: string[]): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('没有找到可删除的用户');
    }

    return result.count;
  }

  /**
   * 将用户实体转换为响应 DTO（移除敏感信息）
   * @param user 用户实体
   * @returns 用户响应 DTO
   */
  private toUserResponse(
    user: UserModel & { userRoles?: { role: { code: string } }[] },
  ): UserResponseVo {
    const roles = user.userRoles?.map(ur => ur.role.code) || [];

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      phone: user.phone,
      isActive: user.isActive,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles,
    };
  }
}
