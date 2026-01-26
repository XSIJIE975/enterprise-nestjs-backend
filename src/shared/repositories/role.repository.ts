import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Prisma } from '@/prisma/prisma/client';
import type { RoleModel, RolePermissionModel } from '@/generated/prisma/models';
import { PrismaService } from '@/shared/database/prisma.service';
import type { RoleRepository as RoleRepositoryInterface } from './interfaces/role-repository.interface';

@Injectable()
export class RoleRepository implements RoleRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async findById(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RoleModel | null> {
    return this.client(tx).role.findUnique({ where: { id } });
  }

  async findByCode(
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RoleModel | null> {
    return this.client(tx).role.findUnique({ where: { code } });
  }

  async findAll(tx?: Prisma.TransactionClient): Promise<RoleModel[]> {
    return this.client(tx).role.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(
    data: Prisma.RoleCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<RoleModel> {
    try {
      return await this.client(tx).role.create({ data });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async update(
    id: number,
    data: Prisma.RoleUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<RoleModel> {
    try {
      return await this.client(tx).role.update({ where: { id }, data });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async delete(id: number, tx?: Prisma.TransactionClient): Promise<RoleModel> {
    try {
      return await this.client(tx).role.delete({ where: { id } });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async assignPermissions(
    roleId: number,
    permissionIds: number[],
    tx?: Prisma.TransactionClient,
  ): Promise<{ count: number }> {
    const uniquePermissionIds = [...new Set(permissionIds)];
    if (uniquePermissionIds.length === 0) {
      return { count: 0 };
    }

    try {
      return await this.client(tx).rolePermission.createMany({
        data: uniquePermissionIds.map(permissionId => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async removePermissions(
    roleId: number,
    permissionIds: number[],
    tx?: Prisma.TransactionClient,
  ): Promise<{ count: number }> {
    const uniquePermissionIds = [...new Set(permissionIds)];
    if (uniquePermissionIds.length === 0) {
      return { count: 0 };
    }

    try {
      return await this.client(tx).rolePermission.deleteMany({
        where: {
          roleId,
          permissionId: { in: uniquePermissionIds },
        },
      });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async findRolePermissions(
    roleId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RolePermissionModel[]> {
    return this.client(tx).rolePermission.findMany({ where: { roleId } });
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
          throw new ConflictException('角色代码已存在');
        }
        if (targets.includes('name')) {
          throw new ConflictException('角色名称已存在');
        }
        throw new ConflictException('角色唯一字段冲突');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('角色不存在');
      }
    }

    throw error;
  }
}
