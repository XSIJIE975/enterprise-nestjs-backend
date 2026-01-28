import type { Prisma } from '@/prisma/prisma/client';
import type { PermissionModel } from '@/generated/prisma/models';

export interface PermissionRepository {
  findById(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel | null>;

  findByCode(
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel | null>;

  findAll(
    params?: {
      skip?: number;
      take?: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel[]>;

  create(
    data: Prisma.PermissionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel>;

  update(
    id: number,
    data: Prisma.PermissionUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel>;

  delete(id: number, tx?: Prisma.TransactionClient): Promise<PermissionModel>;

  /**
   * 根据 ID 数组统计权限数量
   */
  countByIds(ids: number[], tx?: Prisma.TransactionClient): Promise<number>;

  /**
   * 根据 ID 数组查找权限
   */
  findByIds(
    ids: number[],
    tx?: Prisma.TransactionClient,
  ): Promise<PermissionModel[]>;

  /**
   * 批量删除权限
   */
  batchDelete(
    ids: number[],
    tx?: Prisma.TransactionClient,
  ): Promise<{ count: number }>;

  /**
   * 统计权限数量
   */
  count(
    where?: Prisma.PermissionWhereInput,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;
}
