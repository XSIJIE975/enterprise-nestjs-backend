import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Prisma } from '@/prisma/prisma/client';
import type { UserModel } from '@/generated/prisma/models';
import { PrismaService } from '@/shared/database/prisma.service';
import type { UserRepository as UserRepositoryInterface } from './interfaces/user-repository.interface';

@Injectable()
export class UserRepository implements UserRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel | null> {
    return this.client(tx).user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findByEmail(
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel | null> {
    return this.client(tx).user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async create(
    data: Prisma.UserCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel> {
    try {
      return await this.client(tx).user.create({ data });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel> {
    const client = this.client(tx);

    try {
      const result = await client.user.updateMany({
        where: {
          id,
          deletedAt: null,
        },
        data,
      });

      if (result.count === 0) {
        throw new NotFoundException('用户不存在');
      }

      // updateMany 不返回记录，这里再查一次
      return await client.user.findUniqueOrThrow({ where: { id } });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<UserModel> {
    const client = this.client(tx);

    try {
      const result = await client.user.updateMany({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('用户不存在');
      }

      return await client.user.findUniqueOrThrow({ where: { id } });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  /**
   * 查询所有用户（含角色关联）
   * 使用 include 预加载 userRoles.role，避免 N+1 查询
   */
  async findAll(tx?: Prisma.TransactionClient): Promise<UserModel[]> {
    return this.client(tx).user.findMany({
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
  }

  /**
   * 根据用户名或邮箱查询用户（含角色和权限关联）
   * 深层 include: user → userRoles → role → rolePermissions → permission
   */
  async findByUsernameOrEmail(
    usernameOrEmail: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel | null> {
    return this.client(tx).user.findFirst({
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

  private handleKnownError(error: unknown): never {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as unknown;
        const targets = Array.isArray(target)
          ? target
          : typeof target === 'string'
            ? [target]
            : [];

        if (targets.includes('email')) {
          throw new ConflictException('邮箱已存在');
        }
        if (targets.includes('username')) {
          throw new ConflictException('用户名已存在');
        }
        if (targets.includes('phone')) {
          throw new ConflictException('手机号已存在');
        }
        throw new ConflictException('邮箱已存在');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('用户不存在');
      }
    }

    throw error;
  }
}
