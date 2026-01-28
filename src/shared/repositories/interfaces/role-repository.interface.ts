import type { Prisma } from '@/prisma/prisma/client';
import type { RoleModel, RolePermissionModel } from '@/generated/prisma/models';

export interface RoleRepository {
  findById(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RoleModel | null>;
  findByCode(
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RoleModel | null>;
  findAll(tx?: Prisma.TransactionClient): Promise<RoleModel[]>;

  create(
    data: Prisma.RoleCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<RoleModel>;

  update(
    id: number,
    data: Prisma.RoleUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<RoleModel>;

  delete(id: number, tx?: Prisma.TransactionClient): Promise<RoleModel>;

  assignPermissions(
    roleId: number,
    permissionIds: number[],
    tx?: Prisma.TransactionClient,
  ): Promise<{ count: number }>;

  removePermissions(
    roleId: number,
    permissionIds: number[],
    tx?: Prisma.TransactionClient,
  ): Promise<{ count: number }>;

  findRolePermissions(
    roleId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RolePermissionModel[]>;

  /**
   * 根据 ID 数组统计角色数量
   */
  countByIds(ids: number[], tx?: Prisma.TransactionClient): Promise<number>;

  /**
   * 批量删除角色
   */
  batchDelete(
    ids: number[],
    tx?: Prisma.TransactionClient,
  ): Promise<{ count: number }>;

  /**
   * 统计角色数量
   */
  count(
    where?: Prisma.RoleWhereInput,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;
}
