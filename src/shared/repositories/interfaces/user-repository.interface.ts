import type { Prisma } from '@/prisma/prisma/client';
import type { UserModel } from '@/generated/prisma/models';

export interface UserRepository {
  findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel | null>;

  findByEmail(
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserModel | null>;

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
}
