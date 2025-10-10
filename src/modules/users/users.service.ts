import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

/**
 * 用户服务
 */
@Injectable()
export class UsersService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
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
   * @returns 用户信息（含密码和角色）
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
            role: true,
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
