import type { Prisma } from '@/prisma/prisma/client';
import type { UserModel } from '@/generated/prisma/models';
import type { UserWithRolesSimple } from '@/modules/auth/types/user.types';

/**
 * 唯一性冲突检查字段
 */
export interface UserConflictFields {
  email?: string;
  username?: string;
  phone?: string;
}

/**
 * 唯一性冲突检查结果
 */
export interface UserConflictResult {
  email?: boolean;
  username?: boolean;
  phone?: boolean;
}

/**
 * 分页查询选项
 */
export interface UserPaginationOptions {
  where?: Prisma.UserWhereInput;
  skip: number;
  take: number;
  orderBy?: Prisma.UserOrderByWithRelationInput;
}

export interface UserRepository {
  findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel | null>;

  findByEmail(
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel | null>;

  /**
   * 根据用户名查找用户
   */
  findByUsername(
    username: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel | null>;

  /**
   * 根据 ID 查找用户（含 userRoles.role）
   */
  findByIdWithRoles(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserWithRolesSimple | null>;

  /**
   * 检查唯一性冲突（email/username/phone）
   * @param fields 需要检查的字段
   * @param excludeId 排除的用户 ID（用于更新场景）
   * @returns 冲突字段结果
   */
  checkConflict(
    fields: UserConflictFields,
    excludeId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserConflictResult>;

  /**
   * 统计用户数量
   */
  count(
    where?: Prisma.UserWhereInput,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  /**
   * 分页查询用户列表（含 userRoles.role）
   */
  findManyPaginated(
    options: UserPaginationOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel[]>;

  create(
    data: Prisma.UserCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel>;

  update(
    id: string,
    data: Prisma.UserUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel>;

  /**
   * 软删除：设置 deletedAt
   */
  delete(id: string, tx?: Prisma.TransactionClient): Promise<UserModel>;

  /**
   * 批量软删除用户
   */
  batchSoftDelete(
    ids: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<{ count: number }>;

  /**
   * 为用户分配角色
   */
  assignRoles(
    userId: string,
    roleIds: number[],
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
}
