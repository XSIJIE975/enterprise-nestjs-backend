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
}
