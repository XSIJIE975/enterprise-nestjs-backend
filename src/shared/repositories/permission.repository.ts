import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Prisma } from '@/prisma/prisma/client';
import type { PermissionModel } from '@/generated/prisma/models';
import { PrismaService } from '@/shared/database/prisma.service';
import type { PermissionRepository as PermissionRepositoryInterface } from './interfaces/permission-repository.interface';

@Injectable()
export class PermissionRepository implements PermissionRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async findById(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel | null> {
    return this.client(tx).permission.findUnique({ where: { id } });
  }

  async findByCode(
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel | null> {
    return this.client(tx).permission.findUnique({ where: { code } });
  }

  async findAll(
    params?: {
      skip?: number;
      take?: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel[]> {
    return this.client(tx).permission.findMany({
      skip: params?.skip,
      take: params?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    data: Prisma.PermissionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel> {
    try {
      return await this.client(tx).permission.create({ data });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async update(
    id: number,
    data: Prisma.PermissionUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel> {
    try {
      return await this.client(tx).permission.update({ where: { id }, data });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async delete(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel> {
    try {
      return await this.client(tx).permission.delete({ where: { id } });
    } catch (error) {
      this.handleKnownError(error);
    }
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

        if (targets.includes('code')) {
          throw new ConflictException('权限代码已存在');
        }
        if (targets.includes('name')) {
          throw new ConflictException('权限名称已存在');
        }
        throw new ConflictException('权限唯一字段冲突');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('权限不存在');
      }
    }

    throw error;
  }
}
