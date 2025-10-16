import {
  Injectable,
  NotFoundException,
  ConflictException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';

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
  ) {
    this.bcryptRounds = this.configService.get<number>(
      'security.bcrypt.rounds',
      10,
    );
  }

  /**
   * 创建新用户
   * @param createUserDto 创建用户 DTO
   * @returns 用户信息（不含密码）
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // 检查邮箱是否已存在
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 检查用户名是否已存在
    const existingUserByUsername = await this.prisma.user.findUnique({
      where: { username: createUserDto.username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('该用户名已被使用');
    }

    // 检查手机号是否已存在（如果提供了手机号）
    if (createUserDto.phone) {
      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phone: createUserDto.phone },
      });

      if (existingUserByPhone) {
        throw new ConflictException('该手机号已被注册');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.bcryptRounds,
    );

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        username: createUserDto.username,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        isActive: true,
        isVerified: false, // 默认未验证
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.toUserResponse(user);
  }

  /**
   * 查找所有用户
   * @returns 用户列表
   */
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map(user => this.toUserResponse(user));
  }

  /**
   * 根据 ID 查找用户
   * @param id 用户 ID
   * @returns 用户信息
   */
  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    return this.toUserResponse(user);
  }

  /**
   * 根据邮箱查找用户（包含密码，用于认证）
   * @param email 邮箱
   * @returns 用户信息（含密码）
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * 根据用户名查找用户（包含密码，用于认证）
   * @param username 用户名
   * @returns 用户信息（含密码）
   */
  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * 根据邮箱或用户名查找用户（用于登录）
   * @param usernameOrEmail 用户名或邮箱
   * @returns 用户信息（含密码、角色和权限）
   */
  async findByUsernameOrEmail(usernameOrEmail: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
        deletedAt: null,
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * 更新用户信息
   * @param id 用户 ID
   * @param updateUserDto 更新用户 DTO
   * @returns 更新后的用户信息
   */
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 如果更新邮箱，检查是否已被其他用户使用
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('该邮箱已被使用');
      }
    }

    // 如果更新用户名，检查是否已被其他用户使用
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: updateUserDto.username },
      });

      if (existingUser) {
        throw new ConflictException('该用户名已被使用');
      }
    }

    // 如果更新手机号，检查是否已被其他用户使用
    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: updateUserDto.phone },
      });

      if (existingUser) {
        throw new ConflictException('该手机号已被使用');
      }
    }

    // 更新用户
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.toUserResponse(updatedUser);
  }

  /**
   * 更新用户密码
   * @param id 用户 ID
   * @param newPassword 新密码（明文）
   */
  async updatePassword(id: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  /**
   * 更新最后登录时间
   * @param id 用户 ID
   */
  async updateLastLoginAt(id: number): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * 删除用户（软删除）
   * @param id 用户 ID
   */
  async remove(id: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 软删除
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
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

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建查询条件
    const where: any = {
      deletedAt: null,
    };

    // 关键词搜索（用户名、邮箱、姓名）
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { email: { contains: keyword } },
        { firstName: { contains: keyword } },
        { lastName: { contains: keyword } },
      ];
    }

    // 状态筛选
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    // 角色筛选
    if (role) {
      where.userRoles = {
        some: {
          role: {
            code: role,
          },
        },
      };
    }

    // 查询总数和数据
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          [sortBy]: order,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: users.map(user => this.toUserResponse(user)),
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  /**
   * 更新个人资料（受限版本，只能修改非敏感字段）
   * @param userId 用户 ID
   * @param updateProfileDto 更新资料 DTO
   * @returns 更新后的用户信息
   */
  async updateProfile(
    userId: number,
    updateProfileDto: any,
  ): Promise<UserResponseDto> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 如果更新用户名，检查是否已被使用
    if (
      updateProfileDto.username &&
      updateProfileDto.username !== user.username
    ) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: updateProfileDto.username },
      });

      if (existingUser) {
        throw new ConflictException('该用户名已被使用');
      }
    }

    // 如果更新手机号，检查是否已被使用
    if (updateProfileDto.phone && updateProfileDto.phone !== user.phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: updateProfileDto.phone },
      });

      if (existingUser) {
        throw new ConflictException('该手机号已被使用');
      }
    }

    // 更新用户（只允许更新特定字段）
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: updateProfileDto.username,
        firstName: updateProfileDto.firstName,
        lastName: updateProfileDto.lastName,
        phone: updateProfileDto.phone,
        avatar: updateProfileDto.avatar,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.toUserResponse(updatedUser);
  }

  /**
   * 修改密码（需要验证旧密码）
   * @param userId 用户 ID
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    // 获取用户（包含密码）
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
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

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // 密码修改后，撤销所有会话，强制用户重新登录
    await this.authService.revokeAllUserSessions(userId);
  }

  /**
   * 更新用户状态（激活/禁用）
   * @param id 用户 ID
   * @param isActive 是否激活
   * @returns 更新后的用户信息
   */
  async updateUserStatus(
    id: number,
    isActive: boolean,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.toUserResponse(updatedUser);
  }

  /**
   * 验证用户邮箱
   * @param id 用户 ID
   * @returns 更新后的用户信息
   */
  async verifyUser(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    if (user.isVerified) {
      throw new ConflictException('用户邮箱已验证');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isVerified: true },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.toUserResponse(updatedUser);
  }

  /**
   * 重置用户密码（管理员操作，无需旧密码）
   * @param id 用户 ID
   * @param newPassword 新密码
   */
  async resetUserPassword(id: number, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    await this.updatePassword(id, newPassword);
  }

  /**
   * 分配角色给用户
   * @param userId 用户 ID
   * @param roleIds 角色 ID 数组
   * @returns 更新后的用户信息
   */
  async assignRoles(
    userId: number,
    roleIds: number[],
  ): Promise<UserResponseDto> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 检查所有角色是否存在
    const roles = await this.prisma.role.findMany({
      where: {
        id: { in: roleIds },
        isActive: true,
      },
    });

    if (roles.length !== roleIds.length) {
      throw new NotFoundException('部分角色不存在');
    }

    // 删除用户现有的所有角色
    await this.prisma.userRole.deleteMany({
      where: { userId },
    });

    // 添加新的角色关联
    await this.prisma.userRole.createMany({
      data: roleIds.map(roleId => ({
        userId,
        roleId,
      })),
    });

    // 返回更新后的用户信息
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
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
  async removeRole(userId: number, roleId: number): Promise<void> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 检查角色是否存在
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || !role.isActive) {
      throw new NotFoundException('角色不存在');
    }

    // 检查用户是否拥有该角色
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (!userRole) {
      throw new NotFoundException('用户没有该角色');
    }

    // 删除角色关联
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  /**
   * 获取用户的角色列表
   * @param userId 用户 ID
   * @returns 角色列表
   */
  async getUserRoles(userId: number): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    return user.userRoles.map(ur => ({
      id: ur.role.id,
      code: ur.role.code,
      name: ur.role.name,
      description: ur.role.description,
      createdAt: ur.role.createdAt,
    }));
  }

  /**
   * 获取用户的会话列表
   * @param userId 用户 ID
   * @param currentAccessToken 当前请求的 access token（从 JWT 鉴权中获取）
   * @returns 会话列表
   */
  async getUserSessions(
    userId: number,
    currentAccessToken?: string,
  ): Promise<any[]> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('用户不存在');
    }

    // 从数据库查询用户的所有活跃会话
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true, // 只查询活跃会话
        expiresAt: {
          gt: new Date(), // 只查询未过期的会话
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
    userId: number,
    currentAccessToken: string,
  ): Promise<void> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    });

    if (!currentSession) {
      throw new NotFoundException('当前会话不存在');
    }

    await this.authService.logoutOtherSessions(userId, currentSession.id);
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

    const [
      total,
      active,
      inactive,
      verified,
      unverified,
      newToday,
      newThisWeek,
      newThisMonth,
    ] = await Promise.all([
      // 用户总数
      this.prisma.user.count({
        where: { deletedAt: null },
      }),
      // 活跃用户数
      this.prisma.user.count({
        where: { isActive: true, deletedAt: null },
      }),
      // 禁用用户数
      this.prisma.user.count({
        where: { isActive: false, deletedAt: null },
      }),
      // 已验证用户数
      this.prisma.user.count({
        where: { isVerified: true, deletedAt: null },
      }),
      // 未验证用户数
      this.prisma.user.count({
        where: { isVerified: false, deletedAt: null },
      }),
      // 今日新增
      this.prisma.user.count({
        where: {
          createdAt: { gte: today },
          deletedAt: null,
        },
      }),
      // 本周新增
      this.prisma.user.count({
        where: {
          createdAt: { gte: weekAgo },
          deletedAt: null,
        },
      }),
      // 本月新增
      this.prisma.user.count({
        where: {
          createdAt: { gte: monthAgo },
          deletedAt: null,
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      verified,
      unverified,
      newToday,
      newThisWeek,
      newThisMonth,
    };
  }

  /**
   * 批量删除用户（软删除）
   * @param ids 用户 ID 数组
   * @returns 删除的用户数量
   */
  async batchDelete(ids: number[]): Promise<number> {
    // 检查用户是否存在
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
    });

    if (users.length === 0) {
      throw new NotFoundException('没有找到可删除的用户');
    }

    // 批量软删除
    const result = await this.prisma.user.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * 将用户实体转换为响应 DTO（移除密码等敏感信息）
   * @param user 用户实体
   * @returns 用户响应 DTO
   */
  private toUserResponse(user: any): UserResponseDto {
    const roles = user.userRoles?.map((ur: any) => ur.role.code) || [];

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
